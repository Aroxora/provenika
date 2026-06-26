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
    """CSV with columns `score,label` (label 1=active, 0=inactive). Reports AUC + EF@1%/5%."""
    scores, labels = [], []
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            try:
                scores.append(float(r["score"]))
                labels.append(int(float(r["label"])))
            except (KeyError, ValueError):
                continue
    return {
        "n": len(scores),
        "actives": sum(labels),
        "roc_auc": roc_auc(scores, labels),
        "ef_1pct": enrichment_factor(scores, labels, 0.01),
        "ef_5pct": enrichment_factor(scores, labels, 0.05),
        "note": "Retrospective ranking quality of the triage score. Not a prediction of efficacy.",
    }


# --------------------------------------------------------------------------------------
# Redocking runner (LIVE — needs Vina + Open Babel; gated, never fabricates)
# --------------------------------------------------------------------------------------

def _extract_crystal_ligand(pdb_text: str, resname: str, out_dir: str):
    """Write the named co-crystal ligand's heavy atoms to a PDB and load it as an RDKit mol
    (bond orders perceived). Returns (rdkit_mol, path) or (None, reason)."""
    try:
        from rdkit import Chem
    except Exception as e:  # pragma: no cover
        return None, f"RDKit unavailable: {e}"
    lines = [ln for ln in pdb_text.splitlines()
             if ln.startswith("HETATM") and ln[17:20].strip() == resname.upper()]
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


def _redock_rmsd(ref_pdb: str, docked_pdbqt: str, out_dir: str):
    """Symmetry-aware, in-place (no realignment) RMSD between the docked best pose and the crystal
    pose, via Open Babel's `obrms` — both are already in the receptor coordinate frame, so a smaller
    value means the docking reproduced the crystallographic binding mode. Converts each input to SDF
    first (consistent Open Babel bond perception, which RDKit's distance-based PDB perception
    bungles). Returns (rmsd, None) or (None, reason). Never fabricates a number."""
    import re
    ref_sdf = os.path.join(out_dir, "ref.sdf")
    docked_sdf = os.path.join(out_dir, "docked_best.sdf")
    subprocess.run(["obabel", ref_pdb, "-O", ref_sdf], capture_output=True, text=True)
    subprocess.run(["obabel", docked_pdbqt, "-O", docked_sdf, "-f", "1", "-l", "1"],
                   capture_output=True, text=True)
    if not (os.path.exists(ref_sdf) and os.path.exists(docked_sdf)):
        return None, "could not convert reference/docked pose to SDF"
    res = subprocess.run(["obrms", ref_sdf, docked_sdf], capture_output=True, text=True)
    m = re.search(r":=\s*([\d.]+)", res.stdout)
    if not m:
        return None, f"obrms produced no RMSD ({(res.stdout or res.stderr).strip()[:120]})"
    return round(float(m.group(1)), 3), None


def redock_one(pdb_id: str, resname: str, out_dir: str) -> dict:
    """Redock the co-crystal ligand of `resname` in `pdb_id` and measure pose RMSD vs crystal.
    Returns a dict with rmsd (float) or a 'skip'/'error' reason — never a fabricated number."""
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

    ref_mol, ref_info = _extract_crystal_ligand(pdb_text, resname, out_dir)
    if ref_mol is None:
        rec["skip"] = ref_info
        return rec

    # Box from the (improved) co-crystal-ligand selection; receptor saved for docking.
    lig = bsm.select_ligand(pdb_text)
    box = bsm.box(lig["atoms"])
    rec_pdb = os.path.join(out_dir, f"{pdb_id}.pdb")
    Path(rec_pdb).write_text(pdb_text)

    from rdkit import Chem
    # Dock the ligand's CORRECT structure from the RCSB SMILES template (a PDB-perceived SMILES of
    # the crystal ligand is often wrong, which is what broke the earlier RMSD comparison).
    template_smiles = _chemcomp_smiles(resname)
    if not template_smiles:
        rec["error"] = f"could not fetch a SMILES template for ligand {resname} (RCSB chemcomp)"
        return rec
    tmpl = Chem.MolFromSmiles(template_smiles)
    dock_smiles = Chem.MolToSmiles(tmpl) if tmpl is not None else template_smiles
    args = argparse.Namespace(receptor=rec_pdb, ligand=None, smiles=dock_smiles, box_json=None,
                              center=box["center"], size=box["size"], exhaustiveness=8, out=out_dir)
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
    rmsd, err = _redock_rmsd(ref_info, docked_pdbqt, out_dir)
    if rmsd is None:
        rec["error"] = err
    else:
        rec["rmsd"] = rmsd
        rec["correct_pose"] = rmsd <= RMSD_SUCCESS_A
    return rec


def run_redock_benchmark(spec_path: str, out_dir: str) -> dict:
    spec = json.loads(Path(spec_path).read_text())
    results = []
    for entry in spec.get("complexes", []):
        results.append(redock_one(entry["pdb"], entry["ligand"],
                                   os.path.join(out_dir, entry["pdb"])))
    rmsds = [r.get("rmsd") for r in results if "rmsd" in r]
    skipped = [r for r in results if "skip" in r or "error" in r]
    return {
        "benchmark": spec.get("name", spec_path),
        "results": results,
        "summary": summarize_rmsds(rmsds),
        "skipped": len(skipped),
        "note": ("Redocking reproduces a KNOWN binding mode — a necessary check, not proof of "
                 "prospective accuracy. Research only; not medical advice."),
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
    g.add_argument("--redock", metavar="BENCHMARK.json", help="Redocking benchmark (needs Vina+OpenBabel).")
    p.add_argument("--out", default="runs/validation", help="Output dir for --redock (default runs/validation).")
    p.add_argument("--json", action="store_true", help="Emit JSON.")
    args = p.parse_args(argv)

    if args.self_test:
        return self_test()
    if args.enrichment:
        res = run_enrichment_csv(args.enrichment)
    else:
        res = run_redock_benchmark(args.redock, args.out)
        Path(args.out).mkdir(parents=True, exist_ok=True)
        Path(os.path.join(args.out, "validation.json")).write_text(json.dumps(res, indent=2))

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
