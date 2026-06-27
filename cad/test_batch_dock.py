#!/usr/bin/env python3
"""
Offline tests for the batch-dock stage (cad/batch_dock.py). AutoDock Vina is STUBBED — these verify
the gating, the per-ligand fan-out, the rank fusion, and the honesty contract WITHOUT a real dock
(Vina isn't installed in CI). No network.
"""

from __future__ import annotations

import csv
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import batch_dock as bd  # noqa: E402
import dock as dockm  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def _fixture(d: Path):
    hits = d / "hits.csv"
    with hits.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["chembl_id", "smiles", "score"])
        w.writeheader()
        w.writerow({"chembl_id": "CHEMBL1", "smiles": "CCO", "score": "0.90"})
        w.writerow({"chembl_id": "CHEMBL2", "smiles": "CCN", "score": "0.80"})
        w.writerow({"chembl_id": "CHEMBL3", "smiles": "CCC", "score": "0.70"})
    box = d / "box.json"
    box.write_text(json.dumps({"center": [1, 2, 3], "size": [20, 20, 20]}))
    rec = d / "rec.pdb"
    rec.write_text("ATOM      1  CA  ALA A   1       0.000   0.000   0.000  1.00  0.00           C\n")
    return str(hits), str(box), str(rec)


def test_gated_skips_without_binaries():
    dockm._have = lambda b: False   # neither vina nor obabel
    with tempfile.TemporaryDirectory() as d:
        hits, box, rec = _fixture(Path(d))
        res = bd.run_batch(hits, box, rec, d, top_n=3)
        check("no binaries → status skipped", res["status"] == "skipped")
        check("no docked_hits.csv written when skipped", not (Path(d) / "docked_hits.csv").exists())


def test_batch_docks_and_fuses():
    dockm._have = lambda b: True    # pretend Vina + Open Babel present
    # Stub the actual dock: stronger ΔG for CHEMBL2; CHEMBL3 fails (None).
    canned = {"CHEMBL1": -7.0, "CHEMBL2": -9.5, "CHEMBL3": None}

    def fake_dock_one(receptor, *, center, size, out_dir, smiles=None, **kw):
        import os
        os.makedirs(out_dir, exist_ok=True)
        cid = Path(out_dir).name
        dg = canned.get(cid)
        if dg is None:
            return None
        return {"scores": [dg], "best": dg, "pose_path": os.path.join(out_dir, "docked.pdbqt"),
                "prep": "openbabel"}
    dockm.dock_one = fake_dock_one

    with tempfile.TemporaryDirectory() as d:
        hits, box, rec = _fixture(Path(d))
        res = bd.run_batch(hits, box, rec, d, top_n=3)
        check("status ok", res["status"] == "ok")
        check("docked 2 of 3 (one failed → None, not fabricated)", res["docked"] == 2 and res["attempted"] == 3)
        rows = list(csv.DictReader((Path(d) / "docked_hits.csv").open()))
        check("all attempted hits appear in output", len(rows) == 3)
        # Best fused rank should be the strongest ΔG that also has a high ligand score.
        top = rows[0]
        check("strongest binder (CHEMBL2, -9.5) ranks #1", top["chembl_id"] == "CHEMBL2")
        check("the failed dock has no ΔG (empty), not a fabricated 0",
              [r for r in rows if r["chembl_id"] == "CHEMBL3"][0]["vina_best_dG_kcal_per_mol"] == "")
        check("failed dock sinks to the bottom",
              rows[-1]["chembl_id"] == "CHEMBL3")
        check("fusion column is explicitly labeled NON-VALIDATED",
              "rank_fusion_NONVALIDATED" in rows[0])
        check("ΔG reported, never a measured Kd/IC50 (note present)", "NOT a measured affinity" in res["note"])


def test_fuse_normalization():
    docked = [
        {"chembl_id": "A", "ligand_score": 1.0, "vina_best_dG_kcal_per_mol": -10.0},
        {"chembl_id": "B", "ligand_score": 0.0, "vina_best_dG_kcal_per_mol": -5.0},
        {"chembl_id": "C", "ligand_score": 0.5, "vina_best_dG_kcal_per_mol": None},
    ]
    bd._fuse(docked)
    # A: ls 1.0, dg best → dg_norm 1.0 → fused 1.0 ; B: ls 0, dg worst → 0 → fused 0.0
    check("best ΔG + best ligand score → fused 1.0", docked[0]["rank_fusion_NONVALIDATED"] == 1.0)
    check("worst ΔG + worst ligand score → fused 0.0", docked[1]["rank_fusion_NONVALIDATED"] == 0.0)
    check("un-docked row → fusion None (not 0, not fabricated)", docked[2]["rank_fusion_NONVALIDATED"] is None)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} batch-dock assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
