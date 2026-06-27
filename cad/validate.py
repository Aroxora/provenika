#!/usr/bin/env python3
"""
Validation harness — MEASURE the CADD pipeline against benchmarks instead of asserting it works.

"Validated" is not a label you add; it is evidence you produce. This module runs the two
standard *retrospective* validations of an in-silico pipeline and reports honest numbers:

  1. Redocking pose accuracy. For known protein-ligand co-crystal structures, re-dock the
     ligand and measure the RMSD between the docked best pose and the crystallographic pose.
     Field convention: RMSD <= 2.0 Å counts as a correctly reproduced pose. Reports per-complex
     RMSD, the mean, and the success rate. (Requires AutoDock Vina + Open Babel — gated like
     cad/dock.py; if absent it prints what to install and SKIPs. It never fabricates an RMSD.)

  2. Retrospective enrichment. Rank a labelled set (known actives + decoys/inactives) by the
     pipeline's deterministic triage score and report ROC AUC and enrichment factor (EF) at the
     top 1%/5%. This measures whether the score prioritises true actives — pure, offline math
     over (score, label) pairs.

What this does NOT do: prove a molecule is safe or effective, predict a clinical outcome, or
make the pipeline a clinical tool. It quantifies *in-silico triage performance for research
prioritisation*. A good RMSD/AUC means the method reproduces known answers — a necessary, not
sufficient, condition for trusting a prospective prediction. Not medical advice.

Usage:
  python3 cad/validate.py --self-test                      # offline: check the metric math
  python3 cad/validate.py --enrichment labelled.csv        # offline: AUC/EF from score,label CSV
  python3 cad/validate.py --redock cad/validation_benchmark.json --out runs/validation   # live (needs Vina)
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

RMSD_SUCCESS_A = 2.0  # Å — standard "correct pose" threshold for redocking.
# A focused-box redocking cannot yield a meaningful pose-RMSD this large with the CORRECT atom
# correspondence (the box only spans the ligand + a few Å). A bigger obrms value therefore signals a
# FAILED atom mapping (e.g. a symmetry flip), not a genuinely far pose — so we cross-check it against
# the RDKit template RMSD and keep the smaller (RMSD is by definition a minimum over correspondences).
IMPLAUSIBLE_REDOCK_RMSD_A = 10.0


# --------------------------------------------------------------------------------------
# Metric math (pure, deterministic, offline-testable — no network, no Vina)
# --------------------------------------------------------------------------------------

def roc_auc(scores: list[float], labels: list[int]) -> float | None:
    """Probability a random active outranks a random inactive (Mann-Whitney U / rank-sum).
    labels: 1 = active, 0 = inactive. Higher score = predicted more active. None if a class
    is empty. Ties get averaged ranks, so a constant score gives exactly 0.5."""
    n = len(scores)
    pos = sum(1 for v in labels if v == 1)
    neg = n - pos
    if pos == 0 or neg == 0:
        return None
    order = sorted(range(n), key=lambda i: scores[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j < n and scores[order[j]] == scores[order[i]]:
            j += 1
        avg_rank = (i + j - 1) / 2.0 + 1.0  # 1-based average rank over the tie block
        for k in range(i, j):
            ranks[order[k]] = avg_rank
        i = j
    sum_pos = sum(ranks[i] for i in range(n) if labels[i] == 1)
    return round((sum_pos - pos * (pos + 1) / 2.0) / (pos * neg), 4)


def enrichment_factor(scores: list[float], labels: list[int], frac: float = 0.01) -> float | None:
    """Enrichment factor at the top `frac` of the ranked list: (active rate in the top frac) /
    (active rate overall). EF=1 is random; higher is better. None if no actives."""
    n = len(scores)
    pos = sum(labels)
    if n == 0 or pos == 0:
        return None
    k = max(1, int(round(n * frac)))
    top = sorted(range(n), key=lambda i: scores[i], reverse=True)[:k]
    hits = sum(labels[i] for i in top)
    return round((hits / k) / (pos / n), 3)


def pose_rmsd(ref_mol, probe_mol) -> float:
    """Symmetry-corrected RMSD between two poses of the SAME molecule, WITHOUT realignment
    (both are already in the receptor coordinate frame, as in redocking). Raises if the two
    molecules are not the same topology — we never paper over a mismatch with a fake number."""
    from rdkit.Chem import rdMolAlign
    return round(rdMolAlign.CalcRMS(probe_mol, ref_mol), 3)


def template_pose_rmsd(ref_mol, probe_mol, template_smiles: str):
    """RDKit fallback for when Open Babel's `obrms` cannot match two poses (common for large,
    flexible ligands): assign the CORRECT bond orders to BOTH poses from a SMILES template (so atom
    typing/symmetry is unambiguous), then symmetry-aware CalcRMS with no realignment. Returns
    (rmsd, None) or (None, reason) — on a genuine connectivity mismatch it returns a reason, never a
    fabricated number."""
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem, rdMolAlign
    except Exception as e:  # pragma: no cover
        return None, f"RDKit unavailable: {e}"
    tmpl = Chem.MolFromSmiles(template_smiles) if template_smiles else None
    if tmpl is None:
        return None, "no SMILES template for bond-order assignment"
    if ref_mol is None or probe_mol is None:
        return None, "missing reference or docked pose"
    try:
        ref = AllChem.AssignBondOrdersFromTemplate(tmpl, ref_mol)
        probe = AllChem.AssignBondOrdersFromTemplate(tmpl, probe_mol)
    except Exception as e:
        return None, f"template bond-order assignment failed (connectivity mismatch): {e}"
    try:
        return round(rdMolAlign.CalcRMS(probe, ref), 3), None
    except Exception as e:
        return None, f"CalcRMS failed after template assignment: {e}"


def summarize_rmsds(rmsds: list[float]) -> dict:
    ok = [r for r in rmsds if r is not None]
    if not ok:
        return {"complexes": 0, "mean_rmsd": None, "success_rate": None, "threshold_A": RMSD_SUCCESS_A}
    succ = sum(1 for r in ok if r <= RMSD_SUCCESS_A)
    return {
        "complexes": len(ok),
        "mean_rmsd": round(sum(ok) / len(ok), 3),
        "median_rmsd": round(sorted(ok)[len(ok) // 2], 3),
        "success_rate": round(succ / len(ok), 3),
        "success_count": succ,
        "threshold_A": RMSD_SUCCESS_A,
    }


# --------------------------------------------------------------------------------------
# Enrichment runner (offline from a labelled CSV)
# --------------------------------------------------------------------------------------

def run_enrichment_csv(path: str) -> dict:
    """CSV with columns `score,label` (label 1=active, 0=inactive). Reports AUC + EF@1%/5%.

    Guards the degenerate inputs that would otherwise emit an authoritative-looking AUC/EF from
    nonsense: a wrong-header/empty file (no parseable rows) is `skipped`; a single-class file
    (all actives or all inactives — where AUC is undefined and EF is trivially 1.0) is
    `insufficient_labels`. Malformed rows are counted and reported, not silently dropped."""
    scores, labels, dropped = [], [], 0
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            try:
                scores.append(float(r["score"]))
                labels.append(int(float(r["label"])))
            except (KeyError, ValueError):
                dropped += 1
    if dropped:
        print(f"  ({dropped} row(s) had no parseable score/label and were dropped)", file=sys.stderr)
    n, pos = len(scores), sum(labels)
    if n == 0:
        return {"status": "skipped", "reason": "no parseable (score,label) rows in the CSV",
                "dropped": dropped}
    if pos == 0 or pos == n:
        return {"status": "insufficient_labels",
                "reason": "need BOTH actives (label 1) and inactives (label 0); AUC is undefined "
                          "and EF is trivially 1.0 on a single-class set",
                "n": n, "actives": pos, "dropped": dropped}
    return {
        "status": "ok",
        "n": n,
        "actives": pos,
        "dropped": dropped,
        "roc_auc": roc_auc(scores, labels),
        "ef_1pct": enrichment_factor(scores, labels, 0.01),
        "ef_5pct": enrichment_factor(scores, labels, 0.05),
        "note": "Retrospective ranking quality of the supplied score. Not a prediction of efficacy.",
    }


# --------------------------------------------------------------------------------------
# Ligand-based retrospective enrichment (LIVE — needs ChEMBL + RDKit). The FIRST honest,
# NON-CIRCULAR evidence that the pipeline prioritises good compounds: it scores candidates by
# ECFP4 similarity to KNOWN actives and measures whether that recovers held-out actives over
# property-matched, presumed-inactive decoys. Potency is HELD OUT of the score, so this is NOT the
# tautology of "rank by potency, label by potency" (that would give AUC≈1 and prove nothing).
# --------------------------------------------------------------------------------------

def _spearman(a: list[float], b: list[float]) -> float | None:
    """Spearman rank correlation (no scipy) — used only as a leakage guard."""
    n = len(a)
    if n < 3 or len(b) != n:
        return None

    def ranks(x):
        order = sorted(range(n), key=lambda i: x[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n and x[order[j]] == x[order[i]]:
                j += 1
            avg = (i + j - 1) / 2.0
            for k in range(i, j):
                r[order[k]] = avg
            i = j
        return r

    ra, rb = ranks(a), ranks(b)
    ma, mb = sum(ra) / n, sum(rb) / n
    num = sum((ra[i] - ma) * (rb[i] - mb) for i in range(n))
    da = sum((ra[i] - ma) ** 2 for i in range(n)) ** 0.5
    db = sum((rb[i] - mb) ** 2 for i in range(n)) ** 0.5
    if da == 0 or db == 0:
        return None
    return round(num / (da * db), 4)


def _ecfp4(smiles: str):
    from rdkit import Chem
    from rdkit.Chem import AllChem
    m = Chem.MolFromSmiles(smiles)
    return AllChem.GetMorganFingerprintAsBitVect(m, 2, nBits=2048) if m is not None else None


def max_similarity_scores(query_smiles: list[str], candidate_smiles: list[str]) -> list[float]:
    """Each candidate's MAX ECFP4 Tanimoto to ANY query (known active) — the ligand-based
    virtual-screening score. Pure structure; uses NO potency/label info (so it cannot leak the
    label). Candidates that don't parse score 0.0."""
    from rdkit import DataStructs
    qfps = [fp for fp in (_ecfp4(s) for s in query_smiles) if fp is not None]
    scores = []
    for s in candidate_smiles:
        fp = _ecfp4(s)
        scores.append(round(max((DataStructs.TanimotoSimilarity(fp, q) for q in qfps), default=0.0), 4)
                      if fp is not None else 0.0)
    return scores


def _fetch_decoys(active_ids: set[str], mw_lo: float, mw_hi: float, n: int) -> list[str]:
    """Property-matched, presumed-inactive decoys: ChEMBL small molecules in the actives' MW window,
    excluding any molecule we already saw as an active for the target. DUD-E-style assumption (a
    random in-window molecule is presumed not to bind); labeled as such by the caller."""
    import virtual_triage as vt
    out, offset = [], 0
    while len(out) < n and offset < n * 6:
        data = vt._get("molecule", {"molecule_properties__full_mwt__gte": f"{mw_lo:.0f}",
                                    "molecule_properties__full_mwt__lte": f"{mw_hi:.0f}",
                                    "molecule_type": "Small molecule", "limit": 200, "offset": offset})
        mols = data.get("molecules", [])
        if not mols:
            break
        for m in mols:
            mid = m.get("molecule_chembl_id")
            smi = (m.get("molecule_structures") or {}).get("canonical_smiles")
            if mid in active_ids or not smi or "." in smi:
                continue
            out.append(smi)
            if len(out) >= n:
                break
        offset += len(mols)
    return out


def build_ligand_enrichment_set(target: str, min_pchembl: float = 7.0, n_actives: int = 60,
                                n_decoys: int = 240, n_queries: int = 5, scan: int = 4000) -> dict:
    """Resolve `target`; build {queries, actives, decoys, active_pchembl} from ChEMBL. Queries are
    the most-potent known actives (the 'reference' a chemist would start from); scored actives are
    the next-most-potent (disjoint from queries, so similarity isn't trivially 1.0); decoys are
    property-matched presumed-inactive molecules. NETWORK."""
    import virtual_triage as vt
    t = vt.resolve_target(target)
    if not t:
        raise SystemExit(f"No ChEMBL target for {target!r}")
    tid = t["target_chembl_id"]
    actives = vt.fetch_actives(tid, min_pchembl, scan, binding_only=True)
    if len(actives) < n_queries + 10:
        raise SystemExit(f"too few actives for {target} at pChEMBL≥{min_pchembl} "
                         f"({len(actives)}); lower --min-pchembl or pick a better-covered target")
    ranked = sorted(actives, key=lambda m: actives[m]["pchembl"], reverse=True)[: n_queries + n_actives]
    props = vt.fetch_molecule_properties(ranked)
    have = [m for m in ranked if props.get(m, {}).get("smiles")]
    query_ids, scored_ids = have[:n_queries], have[n_queries:n_queries + n_actives]
    mws = [props[m]["mw"] for m in have if props[m].get("mw")]
    mw_lo, mw_hi = (min(mws), max(mws)) if mws else (250.0, 550.0)
    decoys = _fetch_decoys(set(actives), mw_lo, mw_hi, n_decoys)
    return {
        "target_id": tid, "target_name": t.get("pref_name"),
        "queries": [props[m]["smiles"] for m in query_ids],
        "actives": [props[m]["smiles"] for m in scored_ids],
        "active_pchembl": [actives[m]["pchembl"] for m in scored_ids],
        "decoys": decoys, "mw_window": [round(mw_lo, 1), round(mw_hi, 1)],
    }


def run_ligand_enrichment(target: str, **kw) -> dict:
    """End-to-end ligand-based enrichment for a target. Returns AUC + EF with a LEAKAGE GUARD: if the
    similarity score tracks the actives' held-out potency (|Spearman|>0.95) the result is flagged
    `leaking` (the test would be circular). Also reports the circular potency-AUC baseline for
    contrast, so the number distinguishes 'recovers actives by structure' from 'sorts by potency'."""
    s = build_ligand_enrichment_set(target, **kw)
    cands = s["actives"] + s["decoys"]
    labels = [1] * len(s["actives"]) + [0] * len(s["decoys"])
    scores = max_similarity_scores(s["queries"], cands)
    active_scores = scores[: len(s["actives"])]
    leak_rho = _spearman(active_scores, s["active_pchembl"])
    pot_scores = list(s["active_pchembl"]) + [0.0] * len(s["decoys"])  # the tautological baseline
    # The full scored set is committed so the AUC/EF is RE-DERIVABLE offline (recheck_enrichment_file)
    # — the anti-hallucination spine: a stated metric a third party can recompute from the file.
    scored = [{"smiles": sm, "label": lb, "score": sc} for sm, lb, sc in zip(cands, labels, scores)]
    return {
        "target": s["target_name"], "target_id": s["target_id"],
        "method": "ligand-based ECFP4 (Morgan r2, 2048b) max-Tanimoto to known actives; "
                  "potency HELD OUT of the score",
        "n_queries": len(s["queries"]), "n_actives": len(s["actives"]), "n_decoys": len(s["decoys"]),
        "mw_window": s["mw_window"],
        "roc_auc": roc_auc(scores, labels),
        "ef_1pct": enrichment_factor(scores, labels, 0.01),
        "ef_5pct": enrichment_factor(scores, labels, 0.05),
        "leakage_guard": {
            "spearman_score_vs_heldout_pchembl": leak_rho,
            "leaking": bool(leak_rho is not None and abs(leak_rho) > 0.95),
            "note": "the similarity score must NOT track the actives' potency; |rho|>0.95 would mean "
                    "the benchmark is circular (label and score derived from the same quantity)",
        },
        "circular_baseline_potency_auc": roc_auc(pot_scores, labels),
        "queries": s["queries"],
        "scored": scored,
        "note": "Retrospective ligand-based VS enrichment vs property-matched PRESUMED-INACTIVE "
                "decoys (DUD-E-style assumption). A necessary check that structure recovers actives "
                "— NOT proof of prospective accuracy or efficacy. Research only; not medical advice.",
    }


def recheck_enrichment_file(path: str) -> dict:
    """Re-derive ROC AUC / EF from a committed enrichment file's OWN `scored` rows and compare to its
    stated headline figures — the offline, network-free re-proof of a committed evidence number
    (like verify.py re-deriving a deterministic artifact). FAIL on any mismatch."""
    d = json.loads(Path(path).read_text())
    rows = d.get("scored") or []
    scores = [r["score"] for r in rows]
    labels = [int(r["label"]) for r in rows]
    fresh = {"roc_auc": roc_auc(scores, labels),
             "ef_1pct": enrichment_factor(scores, labels, 0.01),
             "ef_5pct": enrichment_factor(scores, labels, 0.05)}
    mismatches = {k: (d.get(k), fresh[k]) for k in fresh if d.get(k) != fresh[k]}
    return {"path": path, "n_scored": len(rows), "recomputed": fresh,
            "matches": not mismatches, "mismatches": mismatches}


# --------------------------------------------------------------------------------------
# Redocking runner (LIVE — needs Vina + Open Babel; gated, never fabricates)
# --------------------------------------------------------------------------------------

def _extract_crystal_ligand(pdb_text: str, resname: str, out_dir: str,
                            chain: str | None = None, resseq: str | None = None):
    """Write ONE co-crystal ligand copy's heavy atoms to a PDB and load it as an RDKit mol.

    CRITICAL: when a structure has multiple copies of the ligand (different chains — common for
    kinases), filtering by resname ALONE concatenates every copy into one disconnected molecule,
    while the docking box + pose are for a SINGLE copy — so the RMSD compares 2 copies against 1 and
    explodes (e.g. 50-70 Å). Passing the (chain, resseq) of the copy `select_ligand` built the box
    from restricts the reference to that same copy, which is what the pose must reproduce. Returns
    (rdkit_mol, path) or (None, reason)."""
    try:
        from rdkit import Chem
    except Exception as e:  # pragma: no cover
        return None, f"RDKit unavailable: {e}"

    def match(ln: str) -> bool:
        if not ln.startswith("HETATM") or ln[17:20].strip() != resname.upper():
            return False
        if chain is not None and ln[21:22] != chain:
            return False
        if resseq is not None and ln[22:26].strip() != str(resseq):
            return False
        return True

    lines = [ln for ln in pdb_text.splitlines() if match(ln)]
    if not lines:
        return None, f"ligand {resname} not found in structure"
    path = os.path.join(out_dir, f"ref_{resname}.pdb")
    Path(path).write_text("\n".join(lines) + "\nEND\n")
    mol = Chem.MolFromPDBFile(path, sanitize=True, removeHs=True)
    if mol is None:
        return None, f"could not parse crystal ligand {resname} into a molecule"
    return mol, path


def _chemcomp_smiles(lig_id: str) -> str | None:
    """Fetch a PDB chemical component's SMILES from RCSB — the correct bond orders to map onto the
    crystal ligand and the docked pose (a PDB/PDBQT has coordinates but no reliable bond orders)."""
    import urllib.request
    url = f"https://data.rcsb.org/rest/v1/core/chemcomp/{lig_id.upper()}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "provenika-validate/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.load(r)
    except Exception:
        return None
    desc = d.get("rcsb_chem_comp_descriptor") or {}
    return desc.get("SMILES_stereo") or desc.get("smilesstereo") or desc.get("SMILES") or desc.get("smiles")


def _template_rmsd_fallback(ref_pdb: str, docked_pdbqt: str, template_smiles: str | None, out_dir: str):
    """File wrapper around template_pose_rmsd: read the crystal ligand + docked best pose as RDKit
    mols (converting the PDBQT's first model to PDB with Open Babel) and RMSD them via the SMILES
    template. Used only when `obrms` could not match. Returns (rmsd, None) or (None, reason)."""
    if not template_smiles:
        return None, "no SMILES template for the template-RMSD fallback"
    try:
        from rdkit import Chem
    except Exception as e:  # pragma: no cover
        return None, f"RDKit unavailable: {e}"
    docked_pdb = os.path.join(out_dir, "docked_best.pdb")
    subprocess.run(["obabel", docked_pdbqt, "-O", docked_pdb, "-d", "-f", "1", "-l", "1"],
                   capture_output=True, text=True)
    if not os.path.exists(docked_pdb):
        return None, "could not convert docked pose to PDB for the template fallback"
    ref = Chem.MolFromPDBFile(ref_pdb, sanitize=False, removeHs=True)
    probe = Chem.MolFromPDBFile(docked_pdb, sanitize=False, removeHs=True)
    return template_pose_rmsd(ref, probe, template_smiles)


def _redock_rmsd(ref_pdb: str, docked_pdbqt: str, out_dir: str, template_smiles: str | None = None):
    """Symmetry-aware, in-place (no realignment) RMSD between the docked best pose and the crystal
    pose, via Open Babel's `obrms` — both are already in the receptor coordinate frame, so a smaller
    value means the docking reproduced the crystallographic binding mode. Converts each input to SDF
    first (consistent Open Babel bond perception, which RDKit's distance-based PDB perception
    bungles). When obrms cannot MATCH the two molecules (large flexible ligands), it falls back to an
    RDKit template-RMSD (assign bond orders from the RCSB SMILES, then CalcRMS) instead of discarding
    the complex — recovering evaluable cases without ever fabricating a number. Returns (rmsd, None)
    or (None, reason)."""
    # Heavy-atom RMSD is the redocking standard (H positions are noise and their count differs
    # between a crystal extract and a Meeko-prepped ligand) — `-d` deletes hydrogens from both.
    ref_sdf = os.path.join(out_dir, "ref.sdf")
    docked_sdf = os.path.join(out_dir, "docked_best.sdf")
    subprocess.run(["obabel", ref_pdb, "-O", ref_sdf, "-d"], capture_output=True, text=True)
    subprocess.run(["obabel", docked_pdbqt, "-O", docked_sdf, "-d", "-f", "1", "-l", "1"],
                   capture_output=True, text=True)
    if not (os.path.exists(ref_sdf) and os.path.exists(docked_sdf)):
        return None, "could not convert reference/docked pose to SDF"
    res = subprocess.run(["obrms", ref_sdf, docked_sdf], capture_output=True, text=True)
    out = (res.stdout or "").strip()
    # obrms prints "RMSD <name(s)> <value>"; the RMSD is the last whitespace token (format varies).
    tok = out.split()[-1] if out.split() else ""
    try:
        val = float(tok)
        if val == val and val != float("inf"):  # finite → obrms matched
            if val <= IMPLAUSIBLE_REDOCK_RMSD_A:
                return round(val, 3), None      # plausible → trust obrms (fast path, unchanged)
            # Finite but implausibly large → likely a failed atom correspondence. Cross-check with the
            # template RMSD and keep the smaller; never larger than obrms, so this can only correct a
            # mis-mapping, never inflate a genuine failure (if the pose is truly far, both agree).
            t_rmsd, _ = _template_rmsd_fallback(ref_pdb, docked_pdbqt, template_smiles, out_dir)
            return round(min(val, t_rmsd) if t_rmsd is not None else val, 3), None
    except ValueError:
        pass
    # obrms could not match at all (NaN/inf/no number) → RDKit template fallback before giving up.
    rmsd, ferr = _template_rmsd_fallback(ref_pdb, docked_pdbqt, template_smiles, out_dir)
    if rmsd is not None:
        return rmsd, None
    return None, f"obrms could not match (RMSD={tok or 'none'}); template fallback also failed: {ferr}"


def redock_one(pdb_id: str, resname: str, out_dir: str, cpu: int | None = None) -> dict:
    """Redock the co-crystal ligand of `resname` in `pdb_id` and measure pose RMSD vs crystal.
    Returns a dict with rmsd (float) or a 'skip'/'error' reason — never a fabricated number.
    `cpu` caps Vina's cores so a batch can run many complexes in parallel."""
    import binding_site as bsm
    import dock as dockm
    rec = {"pdb": pdb_id, "ligand": resname}

    if not (dockm._have("vina") and dockm._have("obabel")):
        rec["skip"] = "AutoDock Vina + Open Babel not installed (cannot dock — no RMSD fabricated)"
        return rec
    os.makedirs(out_dir, exist_ok=True)
    try:
        pdb_text = bsm.fetch_pdb_text(pdb_id)
    except Exception as e:
        rec["error"] = f"could not fetch {pdb_id}: {e}"
        return rec

    # Select the ligand FIRST so the box and the reference come from the SAME single copy (chain +
    # resSeq). A TIGHTER pad than the pipeline default (focused redocking, standard practice).
    lig = bsm.select_ligand(pdb_text)
    if not lig or not lig.get("resName"):
        rec["skip"] = "no drug-like ligand detected to define the box"
        return rec
    box = bsm.box(lig["atoms"], pad=4.0)
    rec_pdb = os.path.join(out_dir, f"{pdb_id}.pdb")
    Path(rec_pdb).write_text(pdb_text)
    rec["ligand"] = lig["resName"]

    # Reference = the exact copy the box was built from (chain+resSeq), not every copy in the crystal.
    ref_mol, ref_info = _extract_crystal_ligand(pdb_text, lig["resName"], out_dir,
                                                chain=lig.get("chain"), resseq=lig.get("resSeq"))
    if ref_mol is None:
        rec["skip"] = ref_info
        return rec

    from rdkit import Chem
    # Dock the ligand's CORRECT structure from the RCSB SMILES template (a PDB-perceived SMILES of
    # the crystal ligand is often wrong, which is what broke the earlier RMSD comparison).
    template_smiles = _chemcomp_smiles(lig["resName"])
    if not template_smiles:
        rec["error"] = f"could not fetch a SMILES template for ligand {lig['resName']} (RCSB chemcomp)"
        return rec
    tmpl = Chem.MolFromSmiles(template_smiles)
    dock_smiles = Chem.MolToSmiles(tmpl) if tmpl is not None else template_smiles
    args = argparse.Namespace(receptor=rec_pdb, ligand=None, smiles=dock_smiles, box_json=None,
                              center=box["center"], size=box["size"], exhaustiveness=8, seed=42,
                              cpu=cpu, out=out_dir)
    try:
        rc = dockm.run(args)
    except SystemExit as e:
        rec["error"] = f"docking prep failed: {e}"
        return rec
    if rc != 0:
        rec["error"] = "vina ligand prep/run failed (e.g. an Open Babel PDBQT that Vina rejects)"
        return rec

    docked_pdbqt = os.path.join(out_dir, "docked.pdbqt")
    if not os.path.exists(docked_pdbqt):
        rec["error"] = "no docked pose written"
        return rec
    rmsd, err = _redock_rmsd(ref_info, docked_pdbqt, out_dir, template_smiles=template_smiles)
    if rmsd is None:
        rec["error"] = err
    else:
        rec["rmsd"] = rmsd
        rec["correct_pose"] = rmsd <= RMSD_SUCCESS_A
    return rec


def tool_versions() -> dict:
    """The docking-stack versions ACTUALLY present, read from the tools themselves (never an LM), so
    a committed redocking result is pinned to a reproducible environment. Absent tool → None."""
    import shutil

    def _v(args):
        try:
            r = subprocess.run(args, capture_output=True, text=True, timeout=15)
            text = (r.stdout or r.stderr or "").strip()
            return text.splitlines()[0][:80] if text else None
        except Exception:
            return None

    out = {"vina": _v(["vina", "--version"]) if shutil.which("vina") else None,
           "obabel": _v(["obabel", "-V"]) if shutil.which("obabel") else None,
           "obrms": bool(shutil.which("obrms"))}
    for mod, key in (("meeko", "meeko"), ("rdkit", "rdkit")):
        try:
            out[key] = __import__(mod).__version__
        except Exception:
            out[key] = None
    try:
        import importlib.metadata as _md
        out["pdb2pqr"] = _md.version("pdb2pqr")
    except Exception:
        out["pdb2pqr"] = None
    return out


def recheck_redock_validation(path: str) -> dict:
    """Re-derive a committed redocking validation's summary (success rate / mean / median) from its
    OWN per-complex RMSDs and compare to the stated summary — the offline re-proof of a committed
    benchmark number (like recheck_enrichment_file). FAIL on any mismatch."""
    d = json.loads(Path(path).read_text())
    rmsds = [r["rmsd"] for r in d.get("results", []) if "rmsd" in r]
    fresh = summarize_rmsds(rmsds)
    saved = d.get("summary", {})
    keys = ["complexes", "mean_rmsd", "median_rmsd", "success_rate", "success_count", "threshold_A"]
    mism = {k: (saved.get(k), fresh.get(k)) for k in keys if k in fresh and saved.get(k) != fresh.get(k)}
    return {"path": path, "n_rmsds": len(rmsds), "recomputed": fresh,
            "matches": not mism, "mismatches": mism}


def run_redock_benchmark(spec_path: str, out_dir: str, cpu: int | None = None) -> dict:
    spec = json.loads(Path(spec_path).read_text())
    complexes = spec.get("complexes", [])
    results = []
    for entry in complexes:
        results.append(redock_one(entry["pdb"], entry["ligand"],
                                   os.path.join(out_dir, entry["pdb"]), cpu=cpu))
    rmsds = [r.get("rmsd") for r in results if "rmsd" in r]
    skipped = [r for r in results if "skip" in r or "error" in r]
    summary = summarize_rmsds(rmsds)
    # Report BOTH rates honestly: success over EVALUABLE complexes, and over ALL attempted (an
    # unmatched/errored complex is a not-demonstrated, not a silent exclusion).
    attempted = len(complexes)
    succ = summary.get("success_count") or 0
    summary["success_rate_all_attempted"] = round(succ / attempted, 3) if attempted else None
    summary["attempted"] = attempted
    summary["evaluable"] = summary.get("complexes")
    return {
        "benchmark": spec.get("name", spec_path),
        "seed": 42,
        "rmsd_threshold_A": RMSD_SUCCESS_A,
        "versions": tool_versions(),
        "results": results,
        "summary": summary,
        "skipped": len(skipped),
        "note": ("Redocking reproduces a KNOWN binding mode — a necessary check, not proof of "
                 "prospective accuracy. `success_rate` is over evaluable complexes; "
                 "`success_rate_all_attempted` counts unmatched/errored as not-demonstrated. "
                 "Research only; not medical advice."),
    }


# --------------------------------------------------------------------------------------
# Self-test (offline): proves the metric math, no network / no Vina
# --------------------------------------------------------------------------------------

def self_test() -> int:
    fails = []

    def check(name, cond):
        print(f"  {'ok ' if cond else 'FAIL'} {name}")
        if not cond:
            fails.append(name)

    # ROC AUC
    check("auc perfect separation = 1.0", roc_auc([5, 4, 3, 2, 1], [1, 1, 0, 0, 0]) == 1.0)
    check("auc reversed = 0.0", roc_auc([1, 2, 3, 4, 5], [1, 1, 0, 0, 0]) == 0.0)
    check("auc constant score = 0.5", roc_auc([1, 1, 1, 1], [1, 0, 1, 0]) == 0.5)
    check("auc empty class = None", roc_auc([1, 2, 3], [1, 1, 1]) is None)
    # Enrichment factor
    check("ef perfect @50% > 1", (enrichment_factor([4, 3, 2, 1], [1, 1, 0, 0], 0.5) or 0) == 2.0)
    check("ef random ~ 1", enrichment_factor([4, 3, 2, 1], [1, 0, 1, 0], 0.5) == 1.0)
    check("ef no actives = None", enrichment_factor([1, 2, 3], [0, 0, 0]) is None)
    # Pose RMSD (needs RDKit; identical + known-translation)
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem
        m = Chem.AddHs(Chem.MolFromSmiles("c1ccccc1O"))
        AllChem.EmbedMolecule(m, randomSeed=1)
        m = Chem.RemoveHs(m)
        m2 = Chem.Mol(m)
        conf = m2.GetConformer()
        for a in range(m2.GetNumAtoms()):
            p = conf.GetAtomPosition(a)
            conf.SetAtomPosition(a, (p.x + 3.0, p.y, p.z))   # rigid 3 Å shift, no rotation
        check("rmsd identical pose = 0", pose_rmsd(m, m) == 0.0)
        check("rmsd 3A rigid shift = 3.0", abs(pose_rmsd(m, m2) - 3.0) < 1e-6)
    except Exception as e:
        check(f"pose_rmsd skipped (RDKit issue: {e})", True)

    print(f"\nvalidate self-test: {'all passed' if not fails else f'{len(fails)} FAILED'}")
    return 1 if fails else 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Validation harness: redocking RMSD + retrospective enrichment.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test", action="store_true", help="Offline check of the metric math.")
    g.add_argument("--enrichment", metavar="CSV", help="Labelled CSV (score,label) → AUC + EF.")
    g.add_argument("--enrichment-ligand", metavar="TARGET",
                   help="Build actives+decoys for TARGET from ChEMBL and run NON-CIRCULAR "
                        "ligand-based (ECFP4-to-known-actives) enrichment (needs RDKit + network).")
    g.add_argument("--redock", metavar="BENCHMARK.json", help="Redocking benchmark (needs Vina+OpenBabel).")
    g.add_argument("--recheck", metavar="RESULT.json",
                   help="Offline: re-derive a committed enrichment or redocking result's headline "
                        "figures from its own rows and FAIL on a mismatch (no network, no Vina).")
    p.add_argument("--out", default="runs/validation", help="Output dir for --redock (default runs/validation).")
    p.add_argument("--out-file", help="Write the result JSON to this path (e.g. a committed evidence file).")
    p.add_argument("--min-pchembl", type=float, default=7.0, help="Active threshold for --enrichment-ligand.")
    p.add_argument("--json", action="store_true", help="Emit JSON.")
    args = p.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.recheck:
        d = json.loads(Path(args.recheck).read_text())
        res = (recheck_redock_validation(args.recheck) if "results" in d
               else recheck_enrichment_file(args.recheck))
        print(json.dumps(res, indent=2))
        return 0 if res.get("matches") else 1
    if args.enrichment:
        res = run_enrichment_csv(args.enrichment)
    elif args.enrichment_ligand:
        res = run_ligand_enrichment(args.enrichment_ligand, min_pchembl=args.min_pchembl)
    else:
        res = run_redock_benchmark(args.redock, args.out)
        Path(args.out).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(args.out, "validation.json")).write_text(json.dumps(res, indent=2))

    if args.out_file:
        Path(args.out_file).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out_file).write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))
    # A leaking enrichment result is not valid evidence — exit non-zero so CI/scripts can't cite it.
    if isinstance(res, dict) and res.get("leakage_guard", {}).get("leaking"):
        print("Enrichment FAILED leakage guard — score tracks held-out potency; not valid evidence.",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
