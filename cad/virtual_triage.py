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
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CHEMBL = "https://www.ebi.ac.uk/chembl/api/data"
USER_AGENT = "oncology-osint-cad/1.0 (research; +https://github.com/)"
POTENCY_TYPES = {"IC50", "Ki", "Kd", "EC50"}

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

    Prefers a SINGLE PROTEIN in Homo sapiens; falls back to the first hit.
    """
    data = _get("target/search", {"q": name, "limit": 25})
    targets = data.get("targets", [])
    if not targets:
        return None

    def score(t: dict) -> tuple:
        single = t.get("target_type") == "SINGLE PROTEIN"
        human = t.get("organism") == "Homo sapiens"
        # ChEMBL sorts by relevance; keep that as the final tiebreak via index
        return (single, human)

    targets_sorted = sorted(targets, key=score, reverse=True)
    return targets_sorted[0]


def fetch_actives(target_chembl_id: str, min_pchembl: float, scan: int,
                  budget_s: float = 40.0) -> dict[str, dict]:
    """Fetch the best (highest pChEMBL) potency activity per molecule for a target.

    Returns {molecule_chembl_id: {pchembl, type}}. Bounded by a wall-clock budget so a slow
    ChEMBL can't make this paginate for minutes — it stops early with partial results (noted)
    rather than hanging.
    """
    best: dict[str, dict] = {}
    offset = 0
    page = 1000
    fetched = 0
    deadline = time.monotonic() + budget_s
    while fetched < scan:
        if time.monotonic() > deadline:
            print(f"  (ChEMBL slow — scanned {fetched} of {scan} records within {budget_s:.0f}s; "
                  "triage is partial. Re-run when ChEMBL is faster for the full scan.)",
                  file=sys.stderr)
            break
        data = _get(
            "activity",
            {
                "target_chembl_id": target_chembl_id,
                "pchembl_value__isnull": "false",
                "limit": min(page, scan - fetched),
                "offset": offset,
            },
        )
        acts = data.get("activities", [])
        if not acts:
            break
        for a in acts:
            mol = a.get("molecule_chembl_id")
            pv = a.get("pchembl_value")
            stype = a.get("standard_type")
            if not mol or pv is None or stype not in POTENCY_TYPES:
                continue
            try:
                pv = float(pv)
            except (TypeError, ValueError):
                continue
            if pv < min_pchembl:
                continue
            cur = best.get(mol)
            if cur is None or pv > cur["pchembl"]:
                best[mol] = {"pchembl": pv, "type": stype}
        fetched += len(acts)
        meta = data.get("page_meta", {})
        if not meta.get("next"):
            break
        offset += len(acts)
    return best


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
            out[mid] = {
                "name": m.get("pref_name") or mid,
                "max_phase": m.get("max_phase"),
                "mw": _f(props.get("full_mwt")),
                "alogp": _f(props.get("alogp")),
                "hbd": _i(props.get("hbd")),
                "hba": _i(props.get("hba")),
                "psa": _f(props.get("psa")),
                "ro5_violations": _i(props.get("num_ro5_violations")),
                "qed": _f(props.get("qed_weighted")),
                "smiles": structs.get("canonical_smiles"),
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


CSV_FIELDS = ["chembl_id", "name", "dev_phase", "best_pchembl", "assay_type", "score",
              "drug_likeness", "qed", "ro5_violations", "mw", "alogp", "hbd", "hba",
              "tpsa", "similarity", "smiles", "chembl_url"]


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


def run(args) -> int:
    target = resolve_target(args.target)
    if not target:
        print(f"No ChEMBL target found for '{args.target}'.", file=sys.stderr)
        return 1
    tid = target["target_chembl_id"]
    if not args.json:
        print(f"Target: {target.get('pref_name')} [{tid}] "
              f"({target.get('target_type')}, {target.get('organism')})")
        print(f"Scanning ChEMBL bioactivities (pChEMBL ≥ {args.min_pchembl})…")

    actives = fetch_actives(tid, args.min_pchembl, args.scan)
    if not actives:
        print("No potent ligands met the threshold (try lowering --min-pchembl).",
              file=sys.stderr)
        return 1

    # Take the most potent molecules to enrich with properties (bounded work)
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
        sim = sims.get(p.get("smiles")) if sims else None
        rows.append({
            "chembl_id": mid,
            "name": p["name"],
            "max_phase": p["max_phase"],
            "dev_phase": dev_phase_label(p["max_phase"]),
            "best_pchembl": actives[mid]["pchembl"],
            "assay_type": actives[mid]["type"],
            "mw": p["mw"],
            "alogp": p["alogp"],
            "hbd": p["hbd"],
            "hba": p["hba"],
            "tpsa": p["psa"],
            "ro5_violations": p["ro5_violations"],
            "qed": p["qed"],
            "drug_likeness": drug_likeness_score(p),
            "similarity": sim,
            "score": composite_score(actives[mid]["pchembl"], p, sim),
            "smiles": p["smiles"],
            "chembl_url": chembl_url(mid),
        })

    if args.exclude_approved:
        rows = [r for r in rows if (r["max_phase"] or 0) < 4]
    rows.sort(key=lambda r: r["score"], reverse=True)
    rows = rows[: args.limit]

    if args.out:
        _write_csv(args.out, rows)
        if not args.json:
            print(f"Wrote {len(rows)} candidates to {args.out}")

    if args.json:
        print(json.dumps({
            "target": {"id": tid, "name": target.get("pref_name"),
                       "type": target.get("target_type"), "organism": target.get("organism")},
            "min_pchembl": args.min_pchembl,
            "candidates": rows,
            "disclaimer": "Triage of public ChEMBL bioactivity data. Not validated; "
                          "requires docking/ADMET/wet-lab follow-up. Not medical advice.",
        }, indent=2))
        return 0

    print(f"\nTop {len(rows)} ligand candidates for {target.get('pref_name')} "
          f"(ranked by potency + drug-likeness{' + similarity' if sims else ''}"
          f"{', novel only' if args.exclude_approved else ''}):\n")
    hdr = f"{'#':>2}  {'ChEMBL ID':<14} {'pChEMBL':>7} {'QED':>5} {'Ro5':>3} {'DL':>5}"
    if sims:
        hdr += f" {'Sim':>5}"
    hdr += f" {'Score':>6}  {'Phase':<16} Name"
    print(hdr)
    print("-" * len(hdr))
    for i, r in enumerate(rows, 1):
        line = (f"{i:>2}  {r['chembl_id']:<14} {r['best_pchembl']:>7.2f} "
                f"{(r['qed'] or 0):>5.2f} "
                f"{(r['ro5_violations'] if r['ro5_violations'] is not None else '-'): >3} "
                f"{r['drug_likeness']:>5.2f}")
        if sims:
            line += f" {(r['similarity'] if r['similarity'] is not None else 0):>5.2f}"
        line += f" {r['score']:>6.3f}  {r['dev_phase']:<16} {r['name']}"
        print(line)

    print("\npChEMBL = -log10(molar potency): 6≈1µM, 7≈100nM, 8≈10nM, 9≈1nM (higher = more potent).")
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
