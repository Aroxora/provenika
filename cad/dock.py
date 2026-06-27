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


def _have_meeko() -> bool:
    """Meeko (+ RDKit) for docking-grade LIGAND PDBQT prep — pip-installable, optional."""
    try:
        import meeko  # noqa: F401
        from rdkit import Chem  # noqa: F401  (meeko ligand prep needs RDKit)
        return True
    except Exception:
        return False


def docking_prep_status() -> dict:
    """Which prep tools are present. meeko/pdb2pqr are the docking-GRADE path (validated ~1.4 Å
    redocking); without them dock.py still runs, but on the inferior Open-Babel-only path (~7.9 Å)."""
    return {"vina": _have("vina"), "obabel": _have("obabel"),
            "meeko": _have_meeko(), "pdb2pqr": _have("pdb2pqr30")}


def check_deps() -> int:
    """Report the full docking stack. Exit 0 iff the required binaries (Vina + Open Babel) are
    present; a missing Meeko/pdb2pqr is a DEGRADED warning (still exit 0), not a hard failure."""
    s = docking_prep_status()
    mark = lambda ok: "found" if ok else "MISSING"
    print("Docking stack (cad/dock.py):")
    print("  Required (BINARIES, conda/release — NOT pip):")
    print(f"    AutoDock Vina (`vina`):  {mark(s['vina'])}")
    print(f"    Open Babel (`obabel`):   {mark(s['obabel'])}")
    print("  Docking-grade prep (pip: `pip install -r cad/requirements-docking.txt`):")
    print(f"    Meeko (ligand PDBQT):    {mark(s['meeko'])}")
    print(f"    pdb2pqr (`pdb2pqr30`):   {mark(s['pdb2pqr'])}")
    if not (s["vina"] and s["obabel"]):
        print("\n" + INSTALL_HELP, file=sys.stderr)
        return 3
    if not (s["meeko"] and s["pdb2pqr"]):
        missing = ", ".join(n for n, k in (("Meeko", "meeko"), ("pdb2pqr", "pdb2pqr")) if not s[k])
        print(f"\n⚠️  DEGRADED: {missing} absent → Open-Babel-only prep (~7.9 Å redocking, NOT the "
              "validated ~1.4 Å). Install: pip install -r cad/requirements-docking.txt", file=sys.stderr)
        print("Ready to dock (degraded prep).")
        return 0
    print("\nReady to dock (docking-grade prep: Meeko + pdb2pqr).")
    return 0


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


BLIND_AXIS_CAP = 30.0  # Å — above this, a whole-receptor blind box is too large to trust a score.


def scaled_exhaustiveness(size, base: int = 8) -> int:
    """Scale Vina search effort to box VOLUME so a large box isn't under-searched at the effort a
    small box was validated with (~8 for a focused redocking box; ~1 unit per 8000 Å³). Never goes
    BELOW `base` (the caller's floor). A pad-8 production box is bigger than the pad-4 box the 1.4 Å
    benchmark was measured at, so it needs more search effort to be comparable."""
    try:
        vol = float(size[0]) * float(size[1]) * float(size[2])
    except (TypeError, ValueError, IndexError):
        return base
    return max(base, round(vol / 8000.0))


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


def dock_one(receptor: str, *, center, size, out_dir: str, smiles: str | None = None,
             ligand: str | None = None, exhaustiveness: int = 8, seed: int | None = None,
             cpu: int | None = None) -> dict | None:
    """Prep + dock ONE ligand into a GIVEN box and return {scores, best, pose_path, prep} — or None
    on any failure (bad prep, Vina error, no parsable score). The caller MUST have confirmed Vina +
    Open Babel are present (gating lives one level up, in batch_dock / run). Never fabricates a score
    — a failure is None, never a number. Reused by the batch-dock stage so the shortlist is docked the
    exact same way a single ligand is."""
    os.makedirs(out_dir, exist_ok=True)
    try:
        receptor_pdbqt = prep_receptor(receptor, out_dir)
        ligand_pdbqt = prep_ligand(ligand, smiles, out_dir)
    except SystemExit:
        return None
    out_pose = os.path.join(out_dir, "docked.pdbqt")
    exh = scaled_exhaustiveness(size, exhaustiveness)  # don't under-search a large box
    cmd = ["vina", "--receptor", receptor_pdbqt, "--ligand", ligand_pdbqt,
           "--out", out_pose, "--exhaustiveness", str(exh)]
    if seed is not None:
        cmd += ["--seed", str(seed)]
    if cpu is not None:
        cmd += ["--cpu", str(cpu)]
    cmd += _box_cmd(center, size)
    res = _run(cmd)
    if res.returncode != 0:
        return None
    scores = parse_vina_scores(out_pose, res.stdout)
    if not scores:
        return None
    s = docking_prep_status()
    return {"scores": scores, "best": min(scores), "pose_path": out_pose,
            "prep": "meeko+pdb2pqr" if (s["meeko"] and s["pdb2pqr"]) else "openbabel"}


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
    s = docking_prep_status()
    if not (s["meeko"] and s["pdb2pqr"]):
        print("⚠️  Open-Babel-only prep (Meeko/pdb2pqr absent) — ~7.9 Å redocking, not the validated "
              "~1.4 Å. `pip install -r cad/requirements-docking.txt` for docking-grade prep.",
              file=sys.stderr)
    receptor = prep_receptor(args.receptor, args.out)
    ligand = prep_ligand(args.ligand, args.smiles, args.out)
    out_pose = os.path.join(args.out, "docked.pdbqt")

    # Resolve the box first (explicit pocket vs whole-receptor blind), so search effort can scale to it.
    blind = not args.center
    if not blind:
        center, size = args.center, args.size
    else:
        # Vina has no blind/auto-box mode — build an explicit box spanning the whole receptor.
        bbox = receptor_bbox(receptor)
        if not bbox:
            print("No --center given and the receptor has no parseable coordinates for a blind box. "
                  "Pass --center/--size, or --box-json from cad/binding_site.py.", file=sys.stderr)
            return 1
        center, size = bbox
        oversized = any(float(a) > BLIND_AXIS_CAP for a in size)
        msg = (f"No --center given: blind box over the whole receptor (center {center}, size {size} Å)")
        if oversized:
            print(f"⚠️  {msg}. An axis exceeds {BLIND_AXIS_CAP:.0f} Å — pose-finding over this volume is "
                  "UNRELIABLE and the affinity is NOT a comparable score. Strongly prefer a focused "
                  "pocket (cad/binding_site.py / fpocket / P2Rank).", file=sys.stderr)
        else:
            print(f"{msg} — weaker; prefer a focused pocket from cad/binding_site.py / fpocket / P2Rank.",
                  file=sys.stderr)

    exh = scaled_exhaustiveness(size, args.exhaustiveness)  # don't under-search a large box
    cmd = ["vina", "--receptor", receptor, "--ligand", ligand,
           "--out", out_pose, "--exhaustiveness", str(exh)]
    if getattr(args, "seed", None) is not None:
        cmd += ["--seed", str(args.seed)]   # fixed seed → reproducible docking (Vina is stochastic)
    if getattr(args, "cpu", None) is not None:
        cmd += ["--cpu", str(args.cpu)]     # cap cores per run so a batch can parallelize across complexes
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
    p.add_argument("--cpu", type=int, default=None, help="Cores Vina may use (default: all; set low to batch).")
    p.add_argument("--out", default="docking", help="Output directory (default ./docking).")
    args = p.parse_args(argv)
    if args.check:
        return check_deps()
    if not args.receptor:
        p.error("--receptor is required (or pass --check to test your install)")
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
