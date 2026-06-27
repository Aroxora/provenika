#!/usr/bin/env python3
"""
Ligand-based virtual triage — a *real* computer-aided drug discovery step.

Given a protein target name, this tool:
  1. Resolves the target to a ChEMBL target ID (preferring a single human protein).
  2. Pulls the experimentally measured potent ligands for that target from ChEMBL
     (IC50 / Ki / Kd / EC50, expressed as pChEMBL = -log10(molar potency)).
  3. Joins ChEMBL's computed physicochemical / drug-likeness properties
     (molecular weight, cLogP, H-bond donors/acceptors, TPSA, Lipinski Ro5
     violations, QED).
  4. Ranks candidates by a transparent score that rewards potency and
     drug-likeness, and (optionally) by 2-D similarity to a query molecule.

This is genuine cheminformatics on real, public, experimental data — not a
template generator. It is, however, only the *triage* stage of CADD: it does not
prove a molecule works, and downstream docking / ADMET / wet-lab validation are
required. See docs/REAL-CAD-ROADMAP.md.

Dependencies: Python 3 standard library only. RDKit is optional and, if present,
enables --query similarity (Morgan/ECFP4 Tanimoto) and extra descriptors.

Usage:
  python3 cad/virtual_triage.py --target EGFR --limit 25
  python3 cad/virtual_triage.py --target "KRAS G12C" --min-pchembl 7 --json
  python3 cad/virtual_triage.py --target BTK --query "CC(=O)Nc1cccnc1"   # needs RDKit

Data source: ChEMBL (https://www.ebi.ac.uk/chembl/api/data/docs), EMBL-EBI.
No API key required. Be considerate with request volume.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mutations as _mut  # noqa: E402  (stdlib-only shared variant parser)

CHEMBL = "https://www.ebi.ac.uk/chembl/api/data"
USER_AGENT = "oncology-osint-cad/1.0 (research; +https://github.com/)"
POTENCY_TYPES = {"IC50", "Ki", "Kd", "EC50"}

# ChEMBL activity-quality gate. Applied IDENTICALLY by fetch_actives (triage) and by
# verify._chembl_consensus_pchembl (independent re-derivation) — exported here so the two can never
# drift: a saved shortlist must re-pull to the same potency. Empirically (checked 2026-06 across
# EGFR/KRAS/KDR/PIK3CA/ERBB2) ChEMBL only assigns a pchembl_value to '=' relation, validity-clean
# rows already, so these filters are usually no-ops — but they are kept as an explicit, auditable,
# defensive gate that DOES matter on the rare target/older record where a censored ('>'/'<') or
# data_validity_comment-flagged row still carries a pchembl_value. `order_by` makes a bounded or
# budget-truncated scan keep the genuinely most-potent records (top of the ranking), not an
# arbitrary API-order slice — and lets verify re-query the true max instead of the first-200 max.
ACTIVITY_QUALITY_PARAMS = {
    "pchembl_value__isnull": "false",
    "standard_relation": "=",
    "data_validity_comment__isnull": "true",
    "order_by": "-pchembl_value",
}

# Optional RDKit
try:  # pragma: no cover - environment dependent
    from rdkit import Chem, DataStructs
    from rdkit.Chem import AllChem

    _RDKIT = True
except Exception:  # pragma: no cover
    _RDKIT = False


def _get(path: str, params: dict) -> dict:
    """GET a ChEMBL JSON endpoint with query params."""
    params = {**params, "format": "json"}
    url = f"{CHEMBL}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:  # interactive tool — don't hang 30s/request
        return json.load(resp)


def resolve_target(name: str) -> dict | None:
    """Resolve a free-text target name to a ChEMBL target.

    Prefers an EXACT gene-symbol match that is a SINGLE PROTEIN in Homo sapiens. Without this,
    ChEMBL's text relevance can pick a substring/interactor over the real target — e.g. "AKT1"
    resolves to "Proline-rich AKT1 substrate 1" (gene AKT1S1) instead of the AKT1 kinase (gene
    AKT1), and "AURKA" to "AURKAIP1" instead of Aurora kinase A — silently triaging the wrong
    protein. When no candidate's gene symbol matches the query (e.g. a mutation-qualified string
    like "KRAS G12C"), this reduces to the previous single-protein/human/relevance ordering.
    """
    data = _get("target/search", {"q": name, "limit": 25})
    targets = data.get("targets", [])
    if not targets:
        return None

    q = name.strip().upper()

    def gene_symbols(t: dict) -> set:
        return {
            (s.get("component_synonym") or "").upper()
            for c in t.get("target_components", [])
            for s in c.get("target_component_synonyms", [])
            if s.get("syn_type") == "GENE_SYMBOL"
        }

    def score(t: dict) -> tuple:
        exact_gene = q in gene_symbols(t)
        single = t.get("target_type") == "SINGLE PROTEIN"
        human = t.get("organism") == "Homo sapiens"
        # Exact gene-symbol match dominates, then single-protein + human; ChEMBL relevance is the
        # implicit final tiebreak via the stable sort. With no gene match every leading term is
        # False, so this is identical to the original (single, human) ordering — a strict add-on.
        return (exact_gene and single and human, exact_gene, single, human)

    targets_sorted = sorted(targets, key=score, reverse=True)
    return targets_sorted[0]


def fetch_actives(target_chembl_id: str, min_pchembl: float, scan: int,
                  budget_s: float = 40.0, binding_only: bool = False,
                  variant_filter: set[str] | None = None) -> dict[str, dict]:
    """Aggregate the quality-gated potency activities per molecule for a target, scanning ChEMBL
    activities ORDERED by descending pChEMBL (ACTIVITY_QUALITY_PARAMS) — so a bounded or
    budget-truncated scan keeps the genuinely most-potent records (the top of the ranking), not an
    arbitrary API-order slice. Pools IC50/Ki/Kd/EC50 (POTENCY_TYPES) onto one pChEMBL axis.

    Per molecule it now reports a ROBUST CENTRAL TENDENCY, not the single luckiest measurement:
      pchembl         = MEDIAN of that molecule's qualifying measurements (the ranking value),
      max_pchembl     = its best single measurement (preserved; what `best_pchembl` used to mean),
      n_measurements  = how many qualifying records backed the median.
    A molecule with one optimistic 10 pM reading among many ~25 nM ones is therefore ranked at its
    consensus, not its outlier (and `potency_suspect` downstream flags the uncorroborated extreme).
    NOTE on bias: the descending scan stops at `min_pchembl`, so the median is taken over a
    molecule's records AT OR ABOVE the floor — a transparent, slightly upward-biased consensus
    (lower --min-pchembl to widen it). `potential_duplicate` rows are dropped (ChEMBL's own
    near-identical-record flag). measurement_type/assay_format come from the most-potent record.

    `binding_only` adds assay_type=B (biochemical binding) so cellular/functional EC50 isn't pooled
    in. `variant_filter` (a set like {"G12C"}) keeps only records whose ChEMBL
    assay_variant_mutation set is a SUPERSET of the request (so "L858R" matches a "C797S,L858R"
    combination assay) — allele-specific triage.

    Returns {molecule_chembl_id: {pchembl, max_pchembl, n_measurements, type, assay_format,
    variant, variant_data_seen}}. Bounded by a wall-clock budget so a slow ChEMBL can't paginate
    for minutes — it stops early with partial results (noted) rather than hanging.
    """
    vals: dict[str, list[float]] = {}
    rep: dict[str, dict] = {}     # representative (most-potent) record's metadata per molecule
    variant_data_seen = False     # did ANY record carry a variant annotation matching the request?
    offset = 0
    page = 1000
    fetched = 0
    deadline = time.monotonic() + budget_s
    params = {**ACTIVITY_QUALITY_PARAMS, "target_chembl_id": target_chembl_id}
    if binding_only:
        params["assay_type"] = "B"
    while fetched < scan:
        if time.monotonic() > deadline:
            print(f"  (ChEMBL slow — scanned {fetched} of {scan} records within {budget_s:.0f}s; "
                  "triage is partial. Re-run when ChEMBL is faster for the full scan.)",
                  file=sys.stderr)
            break
        data = _get("activity", {**params, "limit": min(page, scan - fetched), "offset": offset})
        acts = data.get("activities", [])
        if not acts:
            break
        stop = False
        for a in acts:
            pv = a.get("pchembl_value")
            try:
                pv = float(pv)
            except (TypeError, ValueError):
                continue
            if pv < min_pchembl:
                stop = True  # records are sorted by descending pChEMBL → the rest are below the floor
                break
            mol = a.get("molecule_chembl_id")
            stype = a.get("standard_type")
            if not mol or stype not in POTENCY_TYPES:
                continue
            if a.get("potential_duplicate") in (1, "1", True):
                continue  # ChEMBL's own flag for a near-identical duplicate record
            if variant_filter is not None:
                rec_variants = _mut.parse_variants(a.get("assay_variant_mutation") or "")
                if rec_variants & variant_filter:
                    variant_data_seen = True
                if not variant_filter.issubset(rec_variants):
                    continue  # not the requested allele (set-superset handles combination assays)
            vals.setdefault(mol, []).append(pv)
            cur = rep.get(mol)
            if cur is None or pv > cur["max_pchembl"]:
                rep[mol] = {"max_pchembl": pv, "type": stype,
                            "assay_format": a.get("assay_type"),
                            "variant": a.get("assay_variant_mutation") or None}
        fetched += len(acts)
        meta = data.get("page_meta", {})
        if stop or not meta.get("next"):
            break
        offset += len(acts)

    out: dict[str, dict] = {}
    for mol, vlist in vals.items():
        r = rep[mol]
        out[mol] = {
            "pchembl": round(statistics.median(vlist), 2),   # ranking value (robust consensus)
            "max_pchembl": round(r["max_pchembl"], 2),
            "n_measurements": len(vlist),
            "type": r["type"],
            "assay_format": r["assay_format"],
            "variant": r["variant"],
            "variant_data_seen": variant_data_seen,
        }
    return out


def largest_organic_fragment(smiles: str | None) -> str | None:
    """The largest fragment of a (possibly salt/mixture) SMILES — the species you actually dock.

    ChEMBL canonical SMILES for a salt is multi-component ('.'-joined), e.g. a hydrochloride; docking
    or 3-D embedding the counter-ion is wrong. Uses RDKit's standardiser when present (correct,
    charge-aware), else falls back to the longest '.'-split token (a good heuristic for the parent).
    Returns the input unchanged when it has no '.' (already a single species)."""
    if not smiles or "." not in smiles:
        return smiles
    if _RDKIT:
        try:
            from rdkit.Chem.MolStandardize import rdMolStandardize
            mol = Chem.MolFromSmiles(smiles)
            if mol is not None:
                frag = rdMolStandardize.LargestFragmentChooser().choose(mol)
                if frag is not None:
                    return Chem.MolToSmiles(frag)
        except Exception:
            pass
    return max(smiles.split("."), key=len)


def fetch_molecule_properties(mol_ids: list[str]) -> dict[str, dict]:
    """Batch-fetch molecule properties + canonical SMILES for molecule IDs."""
    out: dict[str, dict] = {}
    for i in range(0, len(mol_ids), 40):
        chunk = mol_ids[i : i + 40]
        data = _get("molecule", {"molecule_chembl_id__in": ",".join(chunk), "limit": len(chunk)})
        for m in data.get("molecules", []):
            mid = m.get("molecule_chembl_id")
            props = m.get("molecule_properties") or {}
            structs = m.get("molecule_structures") or {}
            hierarchy = m.get("molecule_hierarchy") or {}
            smiles = structs.get("canonical_smiles")
            out[mid] = {
                "name": m.get("pref_name") or mid,
                # ChEMBL serializes max_phase as a string ('4.0'); coerce so the numeric
                # --exclude-approved comparison and the JSON stay type-safe everywhere.
                "max_phase": _f(m.get("max_phase")),
                # The neutral parent (counter-ions stripped) — used to collapse parent+salt
                # duplicates onto one row so a hydrochloride isn't a second "hit".
                "parent_chembl_id": hierarchy.get("parent_chembl_id") or mid,
                "mw": _f(props.get("full_mwt")),
                "alogp": _f(props.get("alogp")),
                "hbd": _i(props.get("hbd")),
                "hba": _i(props.get("hba")),
                "psa": _f(props.get("psa")),
                "ro5_violations": _i(props.get("num_ro5_violations")),
                "qed": _f(props.get("qed_weighted")),
                # Export the dockable species, not the salt; flag when we had to strip a counter-ion.
                "smiles": largest_organic_fragment(smiles),
                "desalted": bool(smiles and "." in smiles),
            }
    return out


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _i(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# Column order a chemist opens in Excel/pandas. `pchembl_median` is the ranking value (robust
# consensus); `best_pchembl` is the single best measurement (kept for back-compat + ligand
# efficiency); `n_measurements`/`potency_suspect` expose corroboration. `measurement_type`
# (IC50/Ki/Kd/EC50) and `assay_format` (B/F/A) were previously conflated in one mislabeled
# `assay_type` column. `n_potent_targets`/`selectivity_flag` are the kinome-promiscuity signal.
CSV_FIELDS = ["chembl_id", "name", "dev_phase", "pchembl_median", "best_pchembl",
              "n_measurements", "potency_suspect", "measurement_type", "assay_format", "variant",
              "score", "drug_likeness", "qed", "ro5_violations", "mw", "alogp", "hbd", "hba",
              "tpsa", "n_potent_targets", "selectivity_flag", "similarity", "parent_chembl_id",
              "smiles", "chembl_url"]


def _write_csv(path: str, rows: list[dict]) -> None:
    """Write the ranked candidates to a CSV a chemist can open in Excel/pandas."""
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_FIELDS, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow(row)


def dev_phase_label(max_phase) -> str:
    """Human-readable ChEMBL max_phase: 4=approved drug .. 0/None=preclinical."""
    try:
        mp = float(max_phase)
    except (TypeError, ValueError):
        return "research/preclinical"
    if mp >= 4:
        return "approved drug"
    if mp >= 1:
        return f"clinical (phase {int(mp)})"
    if mp > 0:  # ChEMBL 0.5 = "Early Phase 1" — clinical, not preclinical
        return "clinical (early phase 1)"
    return "research/preclinical"


def chembl_url(mol_id: str) -> str:
    return f"https://www.ebi.ac.uk/chembl/compound_report_card/{mol_id}/"


# NOTE: the weights below (0.6/0.4, 0.45/0.3/0.25, the 0.34 Ro5 penalty, the
# pChEMBL/11 cap) are a TRANSPARENT, NON-VALIDATED ranking HEURISTIC — design
# choices, not fetched data and not fitted to any benchmark. The inputs (pChEMBL,
# QED, Ro5) are real ChEMBL values; only their combination is heuristic. The score
# is a triage ordering, never a prediction of efficacy.
def drug_likeness_score(p: dict) -> float:
    """0..1 transparent drug-likeness score from QED + Lipinski Ro5 compliance."""
    qed = p.get("qed")
    ro5 = p.get("ro5_violations")
    qed_part = qed if qed is not None else 0.5
    ro5_part = 1.0 if ro5 in (0, None) else max(0.0, 1.0 - 0.34 * ro5)
    return round(0.6 * qed_part + 0.4 * ro5_part, 3)


def composite_score(pchembl: float, p: dict, similarity: float | None) -> float:
    """Combine normalised potency, drug-likeness, and optional similarity."""
    potency = min(pchembl, 11.0) / 11.0  # pChEMBL ~5 (weak) .. 11 (very potent)
    dl = drug_likeness_score(p)
    if similarity is None:
        return round(0.6 * potency + 0.4 * dl, 4)
    return round(0.45 * potency + 0.3 * dl + 0.25 * similarity, 4)


# A near-ceiling potency (≈10 pM or stronger) backed by a single uncorroborated measurement is a
# common ChEMBL artifact (assay-specific optimism / transcription). Flag it; do NOT clip — the score
# already caps potency at pChEMBL 11 and genuine sub-nM inhibitors exist. NON-VALIDATED heuristic.
SUSPECT_PCHEMBL = 10.0


def potency_suspect(max_pchembl: float | None, n_measurements: int | None) -> bool:
    """True for an uncorroborated near-ceiling potency (>= SUSPECT_PCHEMBL with < 2 measurements)."""
    return bool(max_pchembl is not None and max_pchembl >= SUSPECT_PCHEMBL
                and (n_measurements or 0) < 2)


def fetch_promiscuity(mol_ids: list[str], min_pchembl: float, on_target_id: str,
                      budget_s: float = 25.0) -> dict[str, int]:
    """Kinome/proteome PROMISCUITY proxy: per molecule, the number of DISTINCT human targets
    (excluding the on-target) it is potent (>= min_pchembl, same quality gate) against. A high
    count is a primary oncology liability (a pan-kinase 'inhibitor' is rarely a drug). Called only
    on the final shortlist to bound API volume; best-effort and budgeted (a molecule that times out
    is simply omitted → None downstream). Counts distinct target_chembl_id, so it is a heuristic
    proxy (does not separate single-protein from complex/cell-line targets). Returns {mol_id: n}."""
    out: dict[str, int] = {}
    deadline = time.monotonic() + budget_s
    base = {k: v for k, v in ACTIVITY_QUALITY_PARAMS.items() if k != "order_by"}
    for mid in mol_ids:
        if time.monotonic() > deadline:
            break
        try:
            data = _get("activity", {**base, "molecule_chembl_id": mid,
                                     "pchembl_value__gte": min_pchembl,
                                     "only": "target_chembl_id,target_organism", "limit": 1000})
        except Exception:
            continue
        targets = {a.get("target_chembl_id") for a in data.get("activities", [])
                   if a.get("target_organism") == "Homo sapiens"
                   and a.get("target_chembl_id") and a.get("target_chembl_id") != on_target_id}
        out[mid] = len(targets)
    return out


def tanimoto_to_query(query_smiles: str, smiles_list: list[str]) -> dict[str, float]:
    """ECFP4 (Morgan r=2) Tanimoto similarity; requires RDKit."""
    out: dict[str, float] = {}
    q = Chem.MolFromSmiles(query_smiles)
    if q is None:
        raise SystemExit(f"Could not parse --query SMILES: {query_smiles}")
    qfp = AllChem.GetMorganFingerprintAsBitVect(q, 2, nBits=2048)
    for smi in smiles_list:
        if not smi:
            continue
        m = Chem.MolFromSmiles(smi)
        if m is None:
            continue
        fp = AllChem.GetMorganFingerprintAsBitVect(m, 2, nBits=2048)
        out[smi] = round(DataStructs.TanimotoSimilarity(qfp, fp), 3)
    return out


def _collapse_salts(rows: list[dict]) -> list[dict]:
    """Collapse parent+salt duplicates: rows sharing a parent_chembl_id are the same molecule with
    different counter-ions, so keep one (highest score; prefer the neutral parent's own row)."""
    by_parent: dict[str, dict] = {}
    out: list[dict] = []
    for r in rows:
        pid = r.get("parent_chembl_id")
        if not pid:
            out.append(r)
            continue
        cur = by_parent.get(pid)
        if cur is None:
            by_parent[pid] = r
            out.append(r)
            continue
        # Keep the better-scoring row; on a tie prefer the row that IS the neutral parent.
        better = (r["score"] > cur["score"]
                  or (r["score"] == cur["score"] and r["chembl_id"] == pid))
        if better:
            out[out.index(cur)] = r
            by_parent[pid] = r
    return out


def run(args) -> int:
    # Allele-specific oncology query: parse the mutation token(s), resolve the BARE gene symbol,
    # and keep only variant-specific assay records. "KRAS G12C" → resolve KRAS, filter to G12C.
    variant_filter = _mut.parse_variants(args.target) or None
    resolve_name = _mut.strip_variants(args.target) if variant_filter else args.target

    target = resolve_target(resolve_name)
    if not target:
        print(f"No ChEMBL target found for '{resolve_name}'.", file=sys.stderr)
        return 1
    tid = target["target_chembl_id"]
    if not args.json:
        print(f"Target: {target.get('pref_name')} [{tid}] "
              f"({target.get('target_type')}, {target.get('organism')})")
        if variant_filter:
            print(f"Variant filter: {', '.join(sorted(variant_filter))} "
                  "(keeping only matching-allele assay records)")
        print(f"Scanning ChEMBL bioactivities (pChEMBL ≥ {args.min_pchembl}"
              f"{', binding assays only' if args.binding_only else ''})…")

    actives = fetch_actives(tid, args.min_pchembl, args.scan,
                            binding_only=args.binding_only, variant_filter=variant_filter)

    # Honest about allele specificity: if a mutation was requested but ChEMBL has NO matching-variant
    # record, do not silently hand back wild-type/pooled data dressed as variant-specific.
    variant_warning = None
    if variant_filter and (not actives or not any(a.get("variant_data_seen") for a in actives.values())):
        variant_warning = (f"no {', '.join(sorted(variant_filter))}-specific assay data in ChEMBL for "
                           f"{target.get('pref_name')} — nothing variant-specific to triage. The figures "
                           "are NOT for the requested allele; re-run without the mutation for wild-type/"
                           "pooled data, or supply your own variant assay set.")
        print("⚠️  " + variant_warning, file=sys.stderr)
        if not actives:
            return 1

    if not actives:
        print("No potent ligands met the threshold (try lowering --min-pchembl).", file=sys.stderr)
        return 1

    # Take the most potent molecules (by consensus median) to enrich with properties (bounded work)
    top_ids = sorted(actives, key=lambda m: actives[m]["pchembl"], reverse=True)
    top_ids = top_ids[: max(args.limit * 4, args.limit)]
    props = fetch_molecule_properties(top_ids)

    sims: dict[str, float] = {}
    if args.query:
        if not _RDKIT:
            print("--query needs RDKit (`pip install rdkit`). Continuing without similarity.",
                  file=sys.stderr)
        else:
            smiles = [props[m]["smiles"] for m in top_ids if props.get(m, {}).get("smiles")]
            sims = tanimoto_to_query(args.query, smiles)

    rows = []
    for mid in top_ids:
        p = props.get(mid)
        if not p:
            continue
        a = actives[mid]
        sim = sims.get(p.get("smiles")) if sims else None
        rows.append({
            "chembl_id": mid,
            "name": p["name"],
            "max_phase": p["max_phase"],
            "dev_phase": dev_phase_label(p["max_phase"]),
            "parent_chembl_id": p["parent_chembl_id"],
            "pchembl_median": a["pchembl"],
            "best_pchembl": a["max_pchembl"],
            "n_measurements": a["n_measurements"],
            "potency_suspect": potency_suspect(a["max_pchembl"], a["n_measurements"]),
            "measurement_type": a["type"],
            "assay_format": a["assay_format"],
            "variant": a["variant"],
            "mw": p["mw"],
            "alogp": p["alogp"],
            "hbd": p["hbd"],
            "hba": p["hba"],
            "tpsa": p["psa"],
            "ro5_violations": p["ro5_violations"],
            "qed": p["qed"],
            "drug_likeness": drug_likeness_score(p),
            "similarity": sim,
            # Ranking uses the robust median consensus, not the single best measurement.
            "score": composite_score(a["pchembl"], p, sim),
            "n_potent_targets": None,
            "selectivity_flag": None,
            "smiles": p["smiles"],
            "chembl_url": chembl_url(mid),
        })

    if args.exclude_approved:
        rows = [r for r in rows if (r["max_phase"] or 0) < 4]
    if not args.no_collapse_salts:
        rows = _collapse_salts(rows)
    rows.sort(key=lambda r: r["score"], reverse=True)
    rows = rows[: args.limit]

    # Kinome/proteome selectivity — only on the final shortlist (bounds API volume). Off in the
    # web-precompute/CI path via --no-selectivity to keep that batch fast.
    if not args.no_selectivity:
        prom = fetch_promiscuity([r["chembl_id"] for r in rows], args.min_pchembl, tid)
        for r in rows:
            n = prom.get(r["chembl_id"])
            r["n_potent_targets"] = n
            if n is not None:
                r["selectivity_flag"] = ("selective" if n <= args.max_selectivity_targets
                                         else f"promiscuous (>{args.max_selectivity_targets} targets)")
        if args.penalize_promiscuity:
            for r in rows:
                n = r["n_potent_targets"]
                if n is not None and n > args.max_selectivity_targets:
                    r["score"] = round(r["score"] * 0.5, 4)  # NON-VALIDATED penalty (opt-in)
            rows.sort(key=lambda r: r["score"], reverse=True)

    if args.out:
        _write_csv(args.out, rows)
        if not args.json:
            print(f"Wrote {len(rows)} candidates to {args.out}")

    if args.json:
        out = {
            "target": {"id": tid, "name": target.get("pref_name"),
                       "type": target.get("target_type"), "organism": target.get("organism")},
            "min_pchembl": args.min_pchembl,
            "variant_filter": sorted(variant_filter) if variant_filter else None,
            "candidates": rows,
            "disclaimer": "Triage of public ChEMBL bioactivity data. Ranked by a transparent, "
                          "NON-VALIDATED potency(median consensus)+drug-likeness score. Not validated; "
                          "requires docking/ADMET/wet-lab follow-up. Not medical advice.",
        }
        if variant_warning:
            out["variant_warning"] = variant_warning
        print(json.dumps(out, indent=2))
        return 0

    suspect_n = sum(1 for r in rows if r.get("potency_suspect"))
    print(f"\nTop {len(rows)} ligand candidates for {target.get('pref_name')} "
          f"(ranked by consensus potency + drug-likeness{' + similarity' if sims else ''}"
          f"{', novel only' if args.exclude_approved else ''}):\n")
    show_sel = any(r.get("n_potent_targets") is not None for r in rows)
    hdr = f"{'#':>2}  {'ChEMBL ID':<14} {'pChEMBL':>7} {'n':>3} {'QED':>5} {'Ro5':>3} {'DL':>5}"
    if sims:
        hdr += f" {'Sim':>5}"
    if show_sel:
        hdr += f" {'Sel':>4}"
    hdr += f" {'Score':>6}  {'Phase':<16} Name"
    print(hdr)
    print("-" * len(hdr))
    for i, r in enumerate(rows, 1):
        flag = "!" if r.get("potency_suspect") else " "
        line = (f"{i:>2}  {r['chembl_id']:<14} {r['pchembl_median']:>6.2f}{flag} "
                f"{(r['n_measurements'] or 0):>3} "
                f"{(r['qed'] or 0):>5.2f} "
                f"{(r['ro5_violations'] if r['ro5_violations'] is not None else '-'): >3} "
                f"{r['drug_likeness']:>5.2f}")
        if sims:
            line += f" {(r['similarity'] if r['similarity'] is not None else 0):>5.2f}"
        if show_sel:
            nt = r.get("n_potent_targets")
            line += f" {(nt if nt is not None else '?'):>4}"
        line += f" {r['score']:>6.3f}  {r['dev_phase']:<16} {r['name']}"
        print(line)

    print("\npChEMBL = median consensus -log10(molar potency): 6≈1µM, 7≈100nM, 8≈10nM, 9≈1nM (higher = more potent).")
    print("n = qualifying measurements behind the median; '!' = single-measurement near-ceiling potency (verify).")
    if show_sel:
        print(f"Sel = distinct other human targets hit ≥ pChEMBL {args.min_pchembl:g} "
              f"(promiscuity proxy; > {args.max_selectivity_targets} = promiscuous, an oncology liability).")
    if suspect_n:
        print(f"⚠️  {suspect_n} hit(s) flagged '!': a near-ceiling potency from <2 measurements — likely an "
              "assay-specific outlier; confirm before trusting the rank.")
    print("Phase = ChEMBL max development phase (approved drug ↔ research). "
          "Use --exclude-approved to surface novel chemotypes.")
    print("DL = drug-likeness (QED + Lipinski Ro5). Score is a transparent triage rank, not efficacy.")
    print("Tip: add --out hits.csv to export (incl. SMILES + ChEMBL links) for docking/ADMET follow-up.")
    print("⚠️  Triage only on public assay data — needs docking/ADMET/wet-lab validation. Not medical advice.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Ligand-based virtual triage over ChEMBL bioactivity data.")
    p.add_argument("--target", required=True, help="Protein target name (e.g. EGFR, BTK, 'KRAS G12C').")
    p.add_argument("--limit", type=int, default=25, help="Number of candidates to report (default 25).")
    p.add_argument("--min-pchembl", type=float, default=6.0,
                   help="Minimum pChEMBL potency to consider (default 6.0 ≈ 1µM).")
    p.add_argument("--scan", type=int, default=4000,
                   help="Max bioactivity records to scan (default 4000).")
    p.add_argument("--query", help="Optional SMILES; rank also by ECFP4 Tanimoto similarity (needs RDKit).")
    p.add_argument("--exclude-approved", action="store_true",
                   help="Drop already-approved drugs (max_phase 4) to surface novel chemotypes.")
    p.add_argument("--binding-only", action="store_true",
                   help="Use only biochemical binding assays (ChEMBL assay_type=B); exclude cellular/functional.")
    p.add_argument("--no-collapse-salts", action="store_true",
                   help="Keep parent and salt forms as separate rows (default collapses them).")
    p.add_argument("--no-selectivity", action="store_true",
                   help="Skip the kinome-selectivity probe (faster; used by the web-precompute/CI batch).")
    p.add_argument("--max-selectivity-targets", type=int, default=10,
                   help="Distinct other targets above which a hit is flagged 'promiscuous' (default 10).")
    p.add_argument("--penalize-promiscuity", action="store_true",
                   help="Halve the score of promiscuous hits and re-rank (opt-in, NON-VALIDATED heuristic).")
    p.add_argument("--out", help="Write ranked candidates (incl. SMILES + ChEMBL links) to a CSV file.")
    p.add_argument("--json", action="store_true", help="Emit JSON instead of a table.")
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return run(args)
    except urllib.error.URLError as e:  # network problems
        print(f"Network error reaching ChEMBL: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
