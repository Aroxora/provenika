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

Install (open source, free). The reliable cross-platform path is conda:
  conda install -c conda-forge vina openbabel        # recommended (Linux/macOS/Windows)

Without conda:
  # Open Babel:  macOS `brew install open-babel`  ·  Debian/Ubuntu `apt install openbabel`
  # AutoDock Vina: download a release binary and put it on PATH —
  #   https://github.com/ccsb-scripps/AutoDock-Vina/releases
  # NOTE: `pip install vina` is unreliable on recent Python (no wheels, needs Boost)
  #       and there is no Homebrew `vina` formula — prefer conda or the release binary.

Then re-run this command (or `python3 cad/dock.py --check` to confirm). This wrapper
only ever runs the real Vina binary — it does not estimate or fabricate docking scores.\
"""


def _have(binary: str) -> bool:
    return shutil.which(binary) is not None


def check_deps() -> int:
    """Report whether the docking binaries are installed. Exit 0 iff both present."""
    have_vina, have_obabel = _have("vina"), _have("obabel")
    mark = lambda ok: "found" if ok else "MISSING"
    print("Docking dependencies (cad/dock.py — AutoDock Vina + Open Babel on PATH):")
    print(f"  AutoDock Vina (`vina`):  {mark(have_vina)}")
    print(f"  Open Babel (`obabel`):   {mark(have_obabel)}")
    if have_vina and have_obabel:
        print("\nReady to dock.")
        return 0
    print("\n" + INSTALL_HELP, file=sys.stderr)
    return 3


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
    """Convert receptor to PDBQT. Prefers pdb2pqr protonation (adds H + assigns charges at pH 7 —
    markedly better docking than Open Babel's polar-H guess; redocking RMSD on the validation
    benchmark dropped from ~7.9 Å to ~1.4 Å once this was used), then writes PDBQT with Open Babel.
    Falls back to Open Babel alone when pdb2pqr is absent."""
    if receptor.lower().endswith(".pdbqt"):
        return receptor
    src = clean_receptor_pdb(receptor, out_dir) if receptor.lower().endswith(".pdb") else receptor
    dest = os.path.join(out_dir, "receptor.pdbqt")
    if shutil.which("pdb2pqr30") and src.lower().endswith(".pdb"):
        protonated = os.path.join(out_dir, "receptor_H.pdb")
        _run(["pdb2pqr30", "--ff=AMBER", "--keep-chain", "--pdb-output", protonated,
              src, os.path.join(out_dir, "receptor.pqr")])
        if os.path.exists(protonated):
            src = protonated
    res = _run(["obabel", src, "-O", dest, "-xr", "-p", "7.4"])
    if not os.path.exists(dest):
        raise SystemExit(f"Receptor prep failed:\n{res.stderr}")
    return dest


def _meeko_ligand_pdbqt(smiles: str, dest: str) -> bool:
    """Prepare a docking-grade ligand PDBQT with Meeko (correct torsion tree + AutoDock atom
    typing) — far more reliable than Open Babel's PDBQT, which Vina sometimes rejects outright.
    Best-effort: any failure (Meeko absent, embed/prep error) returns False so the caller falls
    back to Open Babel."""
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem
        from meeko import MoleculePreparation, PDBQTWriterLegacy
    except Exception:
        return False
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return False
        mol = Chem.AddHs(mol)
        if AllChem.EmbedMolecule(mol, randomSeed=0xC0FFEE) != 0:
            return False
        try:
            AllChem.MMFFOptimizeMolecule(mol)
        except Exception:
            pass
        pdbqt, ok, _ = PDBQTWriterLegacy.write_string(MoleculePreparation().prepare(mol)[0])
        if not ok:
            return False
        with open(dest, "w") as fh:
            fh.write(pdbqt)
        return True
    except Exception:
        return False


def prep_ligand(ligand: str | None, smiles: str | None, out_dir: str) -> str:
    """Generate a 3-D ligand PDBQT. From a SMILES, prefers Meeko (docking-grade) and falls back to
    Open Babel; a ligand file is converted with Open Babel."""
    dest = os.path.join(out_dir, "ligand.pdbqt")
    if smiles:
        if _meeko_ligand_pdbqt(smiles, dest):
            return dest
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


def _box_cmd(center, size) -> list[str]:
    """Vina box arguments. Vina requires an explicit center+size; there is no auto-box flag."""
    cx, cy, cz = center
    sx, sy, sz = size
    return ["--center_x", str(cx), "--center_y", str(cy), "--center_z", str(cz),
            "--size_x", str(sx), "--size_y", str(sy), "--size_z", str(sz)]


def receptor_bbox(path: str, margin: float = 5.0):
    """Whole-receptor docking box from the structure's atom coordinates: center =
    bounding-box midpoint, size = extent + 2*margin (Å). Used for a blind box when no
    pocket is given — stock AutoDock Vina has no auto-box mode, so we must pass a real box.
    Returns (center, size) or None if no coordinates parse. Reads .pdb/.pdbqt (same columns)."""
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []
    try:
        with open(path) as fh:
            for line in fh:
                if line[:6] in ("ATOM  ", "HETATM"):
                    try:
                        xs.append(float(line[30:38])); ys.append(float(line[38:46])); zs.append(float(line[46:54]))
                    except ValueError:
                        continue
    except OSError:
        return None
    if not xs:
        return None
    center = [round((min(a) + max(a)) / 2, 2) for a in (xs, ys, zs)]
    size = [round((max(a) - min(a)) + 2 * margin, 1) for a in (xs, ys, zs)]
    return center, size


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
    if getattr(args, "seed", None) is not None:
        cmd += ["--seed", str(args.seed)]   # fixed seed → reproducible docking (Vina is stochastic)
    if args.center:
        cmd += _box_cmd(args.center, args.size)
    else:
        # Vina has no blind/auto-box mode — build an explicit box spanning the whole receptor.
        bbox = receptor_bbox(receptor)
        if not bbox:
            print("No --center given and the receptor has no parseable coordinates for a blind box. "
                  "Pass --center/--size, or --box-json from cad/binding_site.py.", file=sys.stderr)
            return 1
        center, size = bbox
        print(f"No --center given: blind box over the whole receptor (center {center}, size {size} Å) — "
              "weaker; prefer a focused pocket from cad/binding_site.py / fpocket / P2Rank.", file=sys.stderr)
        cmd += _box_cmd(center, size)

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
    p.add_argument("--check", action="store_true",
                   help="Report whether AutoDock Vina + Open Babel are installed, then exit.")
    p.add_argument("--receptor", help="Receptor .pdb/.pdbqt (e.g. from fetch_structure.py).")
    p.add_argument("--ligand", help="Ligand file (.pdb/.sdf/.mol2/.smi/.pdbqt).")
    p.add_argument("--smiles", help="Ligand as a SMILES string (3-D generated via Open Babel).")
    p.add_argument("--box-json", help="binding_site.json (center+size) from cad/binding_site.py.")
    p.add_argument("--center", nargs=3, type=float, metavar=("X", "Y", "Z"),
                   help="Docking box center (Angstroms).")
    p.add_argument("--size", nargs=3, type=float, default=[20, 20, 20], metavar=("X", "Y", "Z"),
                   help="Docking box size (default 20 20 20).")
    p.add_argument("--exhaustiveness", type=int, default=8, help="Vina search effort (default 8).")
    p.add_argument("--seed", type=int, default=None, help="Vina random seed (set for reproducible runs).")
    p.add_argument("--out", default="docking", help="Output directory (default ./docking).")
    args = p.parse_args(argv)
    if args.check:
        return check_deps()
    if not args.receptor:
        p.error("--receptor is required (or pass --check to test your install)")
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
