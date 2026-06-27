#!/usr/bin/env python3
"""
Batch docking — the missing link between ligand-based triage and structure-based docking.

The pipeline already produces a ranked shortlist (`hits.csv`) AND a docking box
(`binding_site.json`), but never connects them: until now you had to dock each hit by hand. This
stage docks the top-N shortlist into the pocket with AutoDock Vina and emits a STRUCTURE-AWARE
re-rank (`docked_hits.csv`) — the actual computer-aided-design payoff, not just a re-sorted list of
known actives.

Honesty (same contract as the rest of the pipeline):
  * GATED on the real binaries — if Vina + Open Babel are absent it writes NOTHING numeric, prints
    the install steps, and exits. It never invents a ΔG.
  * Vina ΔG is reported as a "predicted affinity (ranking aid)" in kcal/mol — never as a measured
    Kd/IC50, never as efficacy.
  * The fused rank that combines the ligand score and ΔG is a TRANSPARENT, NON-VALIDATED heuristic
    (both inputs are unvalidated triage signals), and is labeled as such.

Usage:
  python3 cad/batch_dock.py --hits runs/egfr/hits.csv --box runs/egfr/binding_site.json \
      --receptor runs/egfr/structures/8A27.pdb --out runs/egfr --top-n 10
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import dock as dockm  # noqa: E402

DOCKED_FIELDS = ["rank", "chembl_id", "ligand_score", "vina_best_dG_kcal_per_mol",
                 "rank_fusion_NONVALIDATED", "prep", "smiles", "pose_path"]


def _read_hits(path: str, top_n: int) -> list[dict]:
    with open(path, newline="") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for r in rows:
        smi = (r.get("smiles") or "").strip()
        cid = (r.get("chembl_id") or "").strip()
        if not smi or not cid:
            continue
        try:
            ls = float(r.get("score")) if r.get("score") not in (None, "") else None
        except ValueError:
            ls = None
        out.append({"chembl_id": cid, "smiles": smi, "ligand_score": ls})
        if len(out) >= top_n:
            break
    return out


def _fuse(docked: list[dict]) -> None:
    """Add a NON-VALIDATED fused rank: mean of the (0..1-normalised) ligand score and the
    (0..1-normalised, more-negative-is-better) Vina ΔG, over the successfully-docked set. Mutates in
    place. Rows without a ΔG keep fusion=None (not docked → not fused)."""
    dgs = [d["vina_best_dG_kcal_per_mol"] for d in docked if d.get("vina_best_dG_kcal_per_mol") is not None]
    if not dgs:
        return
    dg_min, dg_max = min(dgs), max(dgs)            # dg_min = strongest (most negative)
    span = (dg_max - dg_min) or 1.0
    for d in docked:
        dg, ls = d.get("vina_best_dG_kcal_per_mol"), d.get("ligand_score")
        if dg is None:
            d["rank_fusion_NONVALIDATED"] = None
            continue
        dg_norm = (dg_max - dg) / span             # 1.0 = best (most negative) ΔG
        ls_norm = ls if ls is not None else 0.0    # ligand score already ~0..1
        d["rank_fusion_NONVALIDATED"] = round(0.5 * ls_norm + 0.5 * dg_norm, 4)


def run_batch(hits_csv: str, box_json: str, receptor: str, out_dir: str, top_n: int = 10,
              exhaustiveness: int = 8, seed: int | None = 42, cpu: int | None = None) -> dict:
    """Dock the top-N hits into the box; return a summary dict. Gated: if Vina + Open Babel are not
    both present, returns {'status':'skipped'} and writes nothing numeric (never a fake score)."""
    if not (dockm._have("vina") and dockm._have("obabel")):
        return {"status": "skipped",
                "reason": "AutoDock Vina + Open Babel not installed — no scores docked or fabricated. "
                          "Install (see `python3 cad/dock.py --check`) and re-run."}
    try:
        box = json.loads(Path(box_json).read_text())
        center, size = [float(v) for v in box["center"]], [float(v) for v in box["size"]]
    except (OSError, KeyError, ValueError) as e:
        return {"status": "error", "reason": f"could not read box {box_json}: {e}"}

    hits = _read_hits(hits_csv, top_n)
    if not hits:
        return {"status": "error", "reason": f"no usable hits (chembl_id + smiles) in {hits_csv}"}

    dock_dir = os.path.join(out_dir, "docking")
    docked, n_ok = [], 0
    for h in hits:
        res = dockm.dock_one(receptor, smiles=h["smiles"], center=center, size=size,
                             out_dir=os.path.join(dock_dir, h["chembl_id"]),
                             exhaustiveness=exhaustiveness, seed=seed, cpu=cpu)
        rec = {"chembl_id": h["chembl_id"], "smiles": h["smiles"], "ligand_score": h["ligand_score"],
               "vina_best_dG_kcal_per_mol": None, "prep": None, "pose_path": None,
               "rank_fusion_NONVALIDATED": None}
        if res is not None:
            rec.update({"vina_best_dG_kcal_per_mol": round(res["best"], 2), "prep": res["prep"],
                        "pose_path": os.path.relpath(res["pose_path"], out_dir)})
            n_ok += 1
        docked.append(rec)

    _fuse(docked)
    # Rank by fused score (docked first), then write. Un-docked rows sink to the bottom.
    docked.sort(key=lambda d: (d["rank_fusion_NONVALIDATED"] is not None,
                               d.get("rank_fusion_NONVALIDATED") or 0.0), reverse=True)
    for i, d in enumerate(docked, 1):
        d["rank"] = i
    out_csv = os.path.join(out_dir, "docked_hits.csv")
    with open(out_csv, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=DOCKED_FIELDS, extrasaction="ignore")
        w.writeheader()
        for d in docked:
            w.writerow(d)
    return {"status": "ok", "docked": n_ok, "attempted": len(hits), "out_csv": out_csv,
            "prep": docked[0]["prep"] if docked and docked[0].get("prep") else None,
            "note": "Vina ΔG is a predicted ranking aid (kcal/mol), NOT a measured affinity. The fused "
                    "rank is a NON-VALIDATED heuristic combining two unvalidated triage signals. "
                    "Research only; not medical advice."}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Batch-dock a triage shortlist into the binding-site box.")
    p.add_argument("--hits", required=True, help="hits.csv from virtual_triage / run_pipeline.")
    p.add_argument("--box", required=True, help="binding_site.json (center+size) from binding_site.py.")
    p.add_argument("--receptor", required=True, help="Receptor .pdb/.pdbqt (from fetch_structure.py).")
    p.add_argument("--out", default="runs/out", help="Output dir (writes docking/ + docked_hits.csv).")
    p.add_argument("--top-n", type=int, default=10, help="Dock the top-N shortlist rows (default 10).")
    p.add_argument("--exhaustiveness", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--cpu", type=int, default=None)
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    res = run_batch(args.hits, args.box, args.receptor, args.out, args.top_n,
                    args.exhaustiveness, args.seed, args.cpu)
    print(json.dumps(res, indent=2))
    if res.get("status") == "skipped":
        print("\n" + dockm.INSTALL_HELP, file=sys.stderr)
        return 3
    return 0 if res.get("status") == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
