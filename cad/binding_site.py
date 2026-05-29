#!/usr/bin/env python3
"""
Binding-site box — stage 4 of the CADD pipeline (docking-box definition).

Docking (cad/dock.py / AutoDock Vina) needs a search box: a center and size in
Angstroms. The most reliable box for a target with a holo structure is the
envelope of its co-crystallised ligand. This tool fetches the best experimental
structure for a target (or a given PDB), finds the largest non-solvent hetero
ligand, and reports the box center + size — ready to pass to cad/dock.py.

Stdlib only (urllib + PDB text parsing); no RDKit/Vina needed. Research only.

Usage:
  python3 cad/binding_site.py --pdb 1M17
  python3 cad/binding_site.py --target EGFR --json
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
RCSB = "https://files.rcsb.org/download"
UA = "oncology-osint-cad/1.0 (research)"

# Solvent / ions / common crystallisation additives to ignore when picking the ligand.
IGNORE = {
    "HOH", "DOD", "WAT", "NA", "CL", "K", "MG", "CA", "ZN", "MN", "FE", "NI", "CO", "CU", "CD",
    "SO4", "PO4", "NO3", "ACT", "EDO", "GOL", "PEG", "PG4", "PGE", "MPD", "DMS", "TRS", "FMT",
    "BME", "IOD", "BR", "CO3", "NH4", "FLC", "CIT", "EPE", "MES", "IMD", "SCN", "AZI",
}


def fetch_pdb_text(pid: str) -> str:
    req = urllib.request.Request(f"{RCSB}/{pid}.pdb", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def resolve_pdb_for_target(target: str) -> str | None:
    from fetch_structure import resolve_uniprot, pick_best_pdb
    uni = resolve_uniprot(target)
    if not uni or not uni["pdbs"]:
        return None
    best = pick_best_pdb(uni["pdbs"])
    return best["id"] if best else None


def largest_ligand(pdb_text: str) -> dict | None:
    """Find the largest non-solvent hetero group; return its atoms + identity."""
    groups: dict[tuple, list[tuple[float, float, float]]] = {}
    names: dict[tuple, str] = {}
    for line in pdb_text.splitlines():
        if not line.startswith("HETATM"):
            continue
        res = line[17:20].strip()
        if res in IGNORE:
            continue
        chain = line[21:22]
        seq = line[22:26].strip()
        try:
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
        except ValueError:
            continue
        key = (res, chain, seq)
        groups.setdefault(key, []).append((x, y, z))
        names[key] = res
    if not groups:
        return None
    key = max(groups, key=lambda k: len(groups[k]))
    pts = groups[key]
    return {"resName": names[key], "chain": key[1], "resSeq": key[2], "atoms": pts}


def box(pts: list[tuple[float, float, float]], pad: float = 8.0) -> dict:
    xs, ys, zs = zip(*pts)
    center = [round(sum(a) / len(a), 2) for a in (xs, ys, zs)]
    size = [round((max(a) - min(a)) + 2 * pad, 1) for a in (xs, ys, zs)]
    return {"center": center, "size": size}


def run(args) -> int:
    pid = args.pdb.upper() if args.pdb else None
    if not pid:
        pid = resolve_pdb_for_target(args.target)
        if not pid:
            print(f"No experimental PDB found for '{args.target}'.", file=sys.stderr)
            return 1
    try:
        text = fetch_pdb_text(pid)
    except urllib.error.URLError as e:
        print(f"Could not download {pid}: {e}", file=sys.stderr)
        return 2

    lig = largest_ligand(text)
    if not lig:
        print(f"{pid}: no non-solvent ligand found (apo structure?). "
              f"Use a holo structure or define the box manually.", file=sys.stderr)
        return 1
    b = box(lig["atoms"])
    cmd = (f"python3 cad/dock.py --receptor structures/{pid}.pdb --smiles \"<ligand SMILES>\" "
           f"--center {b['center'][0]} {b['center'][1]} {b['center'][2]} "
           f"--size {b['size'][0]} {b['size'][1]} {b['size'][2]}")

    if args.json:
        print(json.dumps({
            "pdb": pid, "ligand": {k: lig[k] for k in ("resName", "chain", "resSeq")},
            "ligandAtoms": len(lig["atoms"]), "center": b["center"], "size": b["size"],
            "dockCommand": cmd,
            "disclaimer": "Box derived from the co-crystal ligand envelope. Research only.",
        }, indent=2))
        return 0

    print(f"\nBinding-site box for {pid}")
    print(f"  Reference ligand: {lig['resName']} (chain {lig['chain']}, res {lig['resSeq']}, "
          f"{len(lig['atoms'])} atoms)")
    print(f"  Box center (Å): {b['center']}")
    print(f"  Box size  (Å): {b['size']}  (ligand envelope + 8 Å padding)")
    print(f"\n  Dock with:\n  {cmd}")
    print("\n⚠️  Box from co-crystal ligand; verify it covers the intended pocket. Research only.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Compute a docking box from a target's co-crystal ligand.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--pdb", help="PDB ID (holo structure), e.g. 1M17.")
    g.add_argument("--target", help="Target name; resolves to its best experimental PDB.")
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
