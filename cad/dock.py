#!/usr/bin/env python3
"""
Structure-based docking — stage 5 of the CADD pipeline.

A thin, honest wrapper around AutoDock Vina (open source). It does NOT reimplement
docking or fake scores: if Vina (and Open Babel for file prep) are not installed,
it prints exact install + run instructions and exits — so you never get a made-up
result. When the binaries are present it preps inputs, runs Vina, and reports the
predicted binding affinities (kcal/mol; more negative = stronger predicted binding).

Inputs:
  --receptor  receptor structure (.pdb/.pdbqt)  — e.g. from cad/fetch_structure.py
  --ligand    ligand (.pdb/.mol/.sdf/.smi/.pdbqt) OR --smiles "<SMILES>"
  --center / --size   docking box (Angstroms). Omit --center for a blind box over
                      the whole receptor (weaker; prefer a pocket from fpocket/P2Rank).

Example (requires `vina` and `obabel` on PATH):
  python3 cad/fetch_structure.py --pdb 1M17 --out structures
  python3 cad/dock.py --receptor structures/1M17.pdb --smiles "Cn1cnc2c1c(=O)n(C)c(=O)n2C" \
      --center 22 0 52 --size 20 20 20 --out docking

Validity caveat: Vina scores are approximate and weakly correlated with true
affinity. Treat output as ranking/triage, not proof. Research only; not medical advice.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys


INSTALL_HELP = """\
AutoDock Vina and/or Open Babel were not found on PATH.

Install (open source, free):
  conda install -c conda-forge vina openbabel        # recommended
  # or: pip install vina ; brew install open-babel    (macOS)
  # AutoDock Vina:  https://github.com/ccsb-scripps/AutoDock-Vina
  # Open Babel:     https://openbabel.org

Then re-run this command. This wrapper only ever runs the real Vina binary —
it does not estimate or fabricate docking scores.\
"""


def _have(binary: str) -> bool:
    return shutil.which(binary) is not None


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def clean_receptor_pdb(path: str, out_dir: str) -> str:
    """Strip ligands/waters/hetero atoms → protein-only PDB (so the co-crystal
    ligand isn't treated as part of the receptor during docking)."""
    cleaned = os.path.join(out_dir, "receptor_clean.pdb")
    atoms = 0
    with open(path) as src, open(cleaned, "w") as dst:
        for line in src:
            if line.startswith("ATOM"):
                dst.write(line); atoms += 1
            elif line.startswith("TER"):
                dst.write(line)
    return cleaned if atoms else path


def prep_receptor(receptor: str, out_dir: str) -> str:
    """Convert receptor to PDBQT with Open Babel (adds polar H, charges)."""
    if receptor.lower().endswith(".pdbqt"):
        return receptor
    src = clean_receptor_pdb(receptor, out_dir) if receptor.lower().endswith(".pdb") else receptor
    dest = os.path.join(out_dir, "receptor.pdbqt")
    res = _run(["obabel", src, "-O", dest, "-xr", "-p", "7.4"])
    if not os.path.exists(dest):
        raise SystemExit(f"Receptor prep failed:\n{res.stderr}")
    return dest


def prep_ligand(ligand: str | None, smiles: str | None, out_dir: str) -> str:
    """Convert/generate ligand to a 3-D PDBQT with Open Babel."""
    dest = os.path.join(out_dir, "ligand.pdbqt")
    if smiles:
        res = _run(["obabel", f"-:{smiles}", "-O", dest, "--gen3d", "-p", "7.4"])
    elif ligand and ligand.lower().endswith(".pdbqt"):
        return ligand
    elif ligand:
        gen = [] if ligand.lower().endswith((".sdf", ".mol", ".mol2")) else ["--gen3d"]
        res = _run(["obabel", ligand, "-O", dest, *gen, "-p", "7.4"])
    else:
        raise SystemExit("Provide --ligand <file> or --smiles <SMILES>.")
    if not os.path.exists(dest):
        raise SystemExit(f"Ligand prep failed:\n{res.stderr}")
    return dest


def parse_vina_scores(out_pdbqt: str, stdout: str) -> list[float]:
    """Extract predicted affinities (kcal/mol) from Vina output."""
    scores: list[float] = []
    if os.path.exists(out_pdbqt):
        with open(out_pdbqt) as fh:
            for line in fh:
                m = re.match(r"REMARK VINA RESULT:\s*(-?\d+\.\d+)", line)
                if m:
                    scores.append(float(m.group(1)))
    return scores


def run(args) -> int:
    # Box may come straight from cad/binding_site.py --json output (validated early).
    if args.box_json and not args.center:
        try:
            box = json.load(open(args.box_json))
            args.center = [float(v) for v in box["center"]]
            args.size = [float(v) for v in box["size"]]
            print(f"Box from {args.box_json}: center {args.center} size {args.size}")
        except (OSError, KeyError, ValueError) as e:
            print(f"Could not read --box-json {args.box_json}: {e}", file=sys.stderr)
            return 1

    if not (_have("vina") and _have("obabel")):
        print(INSTALL_HELP, file=sys.stderr)
        return 3

    os.makedirs(args.out, exist_ok=True)
    receptor = prep_receptor(args.receptor, args.out)
    ligand = prep_ligand(args.ligand, args.smiles, args.out)
    out_pose = os.path.join(args.out, "docked.pdbqt")

    cmd = ["vina", "--receptor", receptor, "--ligand", ligand,
           "--out", out_pose, "--exhaustiveness", str(args.exhaustiveness)]
    if args.center:
        cx, cy, cz = args.center
        sx, sy, sz = args.size
        cmd += ["--center_x", str(cx), "--center_y", str(cy), "--center_z", str(cz),
                "--size_x", str(sx), "--size_y", str(sy), "--size_z", str(sz)]
    else:
        print("No --center given: doing a blind box over the receptor "
              "(weaker; prefer a pocket from fpocket/P2Rank).", file=sys.stderr)
        cmd += ["--autobox"]

    print(f"Running: {' '.join(cmd)}")
    res = _run(cmd)
    if res.returncode != 0:
        print(f"Vina failed:\n{res.stderr}", file=sys.stderr)
        return 1

    scores = parse_vina_scores(out_pose, res.stdout)
    if not scores:
        print(res.stdout)
        print("Vina ran but no affinities were parsed; inspect output above.", file=sys.stderr)
        return 1

    print(f"\nDocked pose → {out_pose}")
    print("Predicted binding affinity (kcal/mol; more negative = stronger):")
    for i, s in enumerate(scores, 1):
        print(f"  mode {i}: {s:>7.2f}")
    print(f"Best: {min(scores):.2f} kcal/mol")
    print("⚠️  Vina scores are approximate ranking aids — not measured affinity, not validation.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Dock a ligand into a receptor with AutoDock Vina.")
    p.add_argument("--receptor", required=True, help="Receptor .pdb/.pdbqt (e.g. from fetch_structure.py).")
    p.add_argument("--ligand", help="Ligand file (.pdb/.sdf/.mol2/.smi/.pdbqt).")
    p.add_argument("--smiles", help="Ligand as a SMILES string (3-D generated via Open Babel).")
    p.add_argument("--box-json", help="binding_site.json (center+size) from cad/binding_site.py.")
    p.add_argument("--center", nargs=3, type=float, metavar=("X", "Y", "Z"),
                   help="Docking box center (Angstroms).")
    p.add_argument("--size", nargs=3, type=float, default=[20, 20, 20], metavar=("X", "Y", "Z"),
                   help="Docking box size (default 20 20 20).")
    p.add_argument("--exhaustiveness", type=int, default=8, help="Vina search effort (default 8).")
    p.add_argument("--out", default="docking", help="Output directory (default ./docking).")
    args = p.parse_args(argv)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
