#!/usr/bin/env python3
"""
End-to-end CADD triage pipeline — one command, real public data, real artifacts.

Chains the stage tools for a target into an output directory:
  1. target_report.py   -> dossier.json      (druggability / structures / known drugs)
  2. virtual_triage.py  -> hits.csv          (ranked ligands + SMILES + ChEMBL links)
  3. fetch_structure.py -> structures/        (best PDB or AlphaFold model)
  4. cost_benefit.py    -> cost_benefit.json  (go/no-go feasibility for a modality)
and writes SUMMARY.md tying them together.

Docking (stage 5, cad/dock.py) is left as the explicit next manual step because
it needs the AutoDock Vina binary and a chosen pocket.

Usage:
  python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 \
      --incidence 60000 --price 150000 --out runs/egfr
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent


def _run_json(script: str, extra: list[str]) -> dict | None:
    res = subprocess.run([sys.executable, str(HERE / script), *extra, "--json"],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  ! {script} failed: {res.stderr.strip()[:200]}", file=sys.stderr)
        return None
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError:
        return None


def _run(script: str, extra: list[str]) -> bool:
    res = subprocess.run([sys.executable, str(HERE / script), *extra],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  ! {script} failed: {res.stderr.strip()[:200]}", file=sys.stderr)
        return False
    return True


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Run the end-to-end CADD triage pipeline for a target.")
    p.add_argument("--target", required=True)
    p.add_argument("--modality", default="small_molecule")
    p.add_argument("--phase", default="phase1")
    p.add_argument("--incidence", type=int, default=50000)
    p.add_argument("--price", type=float, default=150000)
    p.add_argument("--min-pchembl", type=float, default=7.0)
    p.add_argument("--limit", type=int, default=25)
    p.add_argument("--out", default="runs/out")
    args = p.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    print(f"[1/4] Target dossier for {args.target}…")
    dossier = _run_json("target_report.py", ["--target", args.target])
    if dossier:
        (out / "dossier.json").write_text(json.dumps(dossier, indent=2))

    print(f"[2/4] Ligand triage…")
    _run("virtual_triage.py", ["--target", args.target, "--min-pchembl", str(args.min_pchembl),
                               "--limit", str(args.limit), "--out", str(out / "hits.csv")])

    print(f"[3/4] Structure acquisition…")
    _run("fetch_structure.py", ["--target", args.target, "--out", str(out / "structures")])

    print(f"[4/4] Cost-benefit / feasibility ({args.modality} @ {args.phase})…")
    cb = _run_json("cost_benefit.py", ["--modality", args.modality, "--phase", args.phase,
                                       "--incidence", str(args.incidence), "--price", str(args.price)])
    if cb:
        (out / "cost_benefit.json").write_text(json.dumps(cb, indent=2))

    # SUMMARY.md
    lines = [f"# CADD pipeline summary — {args.target}", ""]
    if dossier:
        u = dossier.get("uniprot") or {}
        c = dossier.get("chembl") or {}
        lines += [
            "## Target dossier",
            f"- UniProt: {u.get('accession')} ({u.get('length')} aa)",
            f"- PDB structures: {u.get('pdb_count')} (docking feasible: {'yes' if u.get('pdb_count') else 'no'})",
            f"- Potent ChEMBL activities: {c.get('potent_activity_records')}",
            f"- Known mechanism drugs: {len(c.get('known_mechanism_drugs', []))}",
            "",
        ]
    if (out / "hits.csv").exists():
        n = max(0, sum(1 for _ in (out / "hits.csv").open()) - 1)
        lines += ["## Ligand triage", f"- {n} ranked candidates → `hits.csv` (SMILES + ChEMBL links)", ""]
    structs = sorted((out / "structures").glob("*")) if (out / "structures").exists() else []
    if structs:
        lines += ["## Structure", f"- {structs[0].name} → `structures/`", ""]
    if cb:
        lines += [
            "## Cost-benefit / feasibility",
            f"- P(approval) from {cb['phase']}: {cb['probability_of_approval']*100:.1f}%",
            f"- Expected remaining cost: ${cb['expected_remaining_cost_musd']:,.0f}M over {cb['expected_time_to_market_years']} yr",
            f"- Risk-adjusted revenue: ${cb['risk_adjusted_revenue_musd']:,.0f}M; benefit/cost {cb['benefit_cost_ratio']:.2f}",
            f"- **{cb['verdict']}**",
            "",
        ]
    lines += ["## Next step (manual)",
              f"- Detect a pocket (fpocket/P2Rank) and dock with "
              f"`cad/dock.py --receptor {out}/structures/<file> --smiles <hit SMILES> --center X Y Z`",
              "",
              "_Research only. Every figure points to a public source — verify before relying on it._"]
    (out / "SUMMARY.md").write_text("\n".join(lines))

    print(f"\nDone → {out}/  (SUMMARY.md, dossier.json, hits.csv, structures/, cost_benefit.json)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
