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

# Solvent / ions / common crystallisation additives to ignore outright. This is only a
# first-pass filter — the real selection (select_ligand) then scores the *remaining* hetero
# groups by how buried they are in the protein and whether they are drug-like in size, so a
# large detergent / PEG / glycan / peptide that slips through this set still loses to the
# actual pocket-bound inhibitor instead of hijacking the docking box by sheer atom count.
IGNORE = {
    # waters / metals / monatomic & small inorganic ions
    "HOH", "DOD", "WAT", "NA", "CL", "K", "MG", "CA", "ZN", "MN", "FE", "NI", "CO", "CU",
    "CD", "HG", "BA", "SR", "CS", "LI", "SO4", "PO4", "NO3", "CO3", "NH4", "BR", "IOD",
    "SCN", "AZI", "ACT", "FMT",
    # buffers / cryoprotectants / misc small additives
    "EDO", "GOL", "MPD", "DMS", "TRS", "BME", "FLC", "CIT", "EPE", "MES", "IMD", "ACY",
    "TLA", "MLI", "DTT", "BCT", "CAC", "MRD", "DIO",
    # PEGs / polymers (frequently the largest hetero group in a crystal)
    "PEG", "PG4", "PGE", "P6G", "1PE", "2PE", "PE4", "PE5", "7PE", "12P", "15P", "PG0",
    "PG5", "PG6", "XPE",
    # detergents
    "LDA", "LMT", "DDM", "BOG", "OGA", "HTG", "SDS", "C8E", "LMN",
    # sugars (glycosylation / cryo — not the docking target)
    "GLC", "BGC", "MAN", "BMA", "GAL", "FUC", "XYS", "SUC", "TRE", "MAL", "NAG", "NDG",
    "NGA", "SIA",
    # lipids / fatty acids
    "PLM", "MYR", "STE", "OLA", "OLC", "LFA", "D10",
    # explicit unknown placeholders
    "UNL", "UNX", "UNK",
}

# A real small-molecule inhibitor is drug-like in size; ions/cofactors/peptides/polymers are
# not. Heavy-atom window for "looks like a small-molecule ligand".
DRUGLIKE_MIN_HEAVY = 6
DRUGLIKE_MAX_HEAVY = 70
CONTACT_CUTOFF = 4.5  # Å — a ligand atom within this of any protein atom counts as "in contact".


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


def _parse_structure(pdb_text: str):
    """Split a PDB into (groups, names, heavy_counts, protein_atoms).

    groups:        {(res,chain,seq): [(x,y,z), ...]}  — ALL atoms (box geometry unchanged)
    heavy_counts:  {(res,chain,seq): int}             — non-H atom count (drug-like window)
    protein_atoms: [(x,y,z), ...]                      — ATOM heavy atoms (burial test)
    """
    groups: dict[tuple, list[tuple[float, float, float]]] = {}
    names: dict[tuple, str] = {}
    heavy: dict[tuple, int] = {}
    protein: list[tuple[float, float, float]] = []
    for line in pdb_text.splitlines():
        rec = line[:6]
        if rec not in ("HETATM", "ATOM  "):
            continue
        try:
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
        except ValueError:
            continue
        elem = (line[76:78].strip() or line[12:14].strip()).upper()
        if rec == "ATOM  ":
            if elem not in ("H", "D"):
                protein.append((x, y, z))
            continue
        res = line[17:20].strip()
        if res in IGNORE:
            continue
        key = (res, line[21:22], line[22:26].strip())
        groups.setdefault(key, []).append((x, y, z))
        names[key] = res
        if elem not in ("H", "D"):
            heavy[key] = heavy.get(key, 0) + 1
    return groups, names, heavy, protein


def _grid(points: list[tuple[float, float, float]], cell: float) -> dict:
    """Hash atoms into cubic cells of edge `cell` for O(1) neighbour lookup."""
    g: dict[tuple, list] = {}
    for p in points:
        g.setdefault((int(p[0] // cell), int(p[1] // cell), int(p[2] // cell)), []).append(p)
    return g


def _in_contact(grid: dict, cell: float, p, cutoff: float) -> bool:
    cx, cy, cz = int(p[0] // cell), int(p[1] // cell), int(p[2] // cell)
    c2 = cutoff * cutoff
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for q in grid.get((cx + dx, cy + dy, cz + dz), ()):
                    if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 <= c2:
                        return True
    return False


def select_ligand(pdb_text: str) -> dict | None:
    """Pick the hetero group most likely to be the co-crystallised inhibitor: drug-like in
    size AND buried in the protein — NOT merely the group with the most atoms (which is often
    a detergent, PEG, glycan, or peptide sitting on the surface). Falls back to the most-
    buried / largest group, with an explicit warning, when burial can't be judged. Returns
    the chosen ligand's atoms + identity + diagnostics (and the runners-up as `alternatives`).
    """
    groups, names, heavy, protein = _parse_structure(pdb_text)
    if not groups:
        return None
    grid = _grid(protein, CONTACT_CUTOFF) if protein else None
    cands = []
    for key, pts in groups.items():
        h = heavy.get(key, len(pts))
        contacts = (sum(1 for p in pts if _in_contact(grid, CONTACT_CUTOFF, p, CONTACT_CUTOFF))
                    if grid else 0)
        buried = round(contacts / len(pts), 3) if pts else 0.0
        druglike = DRUGLIKE_MIN_HEAVY <= h <= DRUGLIKE_MAX_HEAVY
        cands.append({"resName": names[key], "chain": key[1], "resSeq": key[2], "atoms": pts,
                      "heavyAtoms": h, "contacts": contacts, "buried": buried, "druglike": druglike})

    def rank(c):
        # 1) a drug-like group that actually touches the protein is the strongest signal of a
        #    bound inhibitor; 2) then most buried; 3) tiebreak toward the larger drug-like group
        #    (the real ligand) but the smaller non-drug-like group (avoid huge polymers).
        return (1 if (c["druglike"] and c["contacts"] > 0) else 0, c["buried"],
                c["heavyAtoms"] if c["druglike"] else -c["heavyAtoms"])

    ranked = sorted(cands, key=rank, reverse=True)
    best = ranked[0]

    note = None
    if grid is None:
        note = "no protein atoms parsed — could not confirm the ligand is pocket-bound; verify the box."
    elif best["contacts"] == 0:
        note = "chosen group makes no protein contacts — likely a surface additive, not a bound ligand; verify."
    elif not best["druglike"]:
        note = (f"chosen group has {best['heavyAtoms']} heavy atoms (outside the drug-like "
                f"{DRUGLIKE_MIN_HEAVY}-{DRUGLIKE_MAX_HEAVY} window) — may be a cofactor/peptide/polymer; verify.")

    return {"resName": best["resName"], "chain": best["chain"], "resSeq": best["resSeq"],
            "atoms": best["atoms"], "heavyAtoms": best["heavyAtoms"],
            "contacts": best["contacts"], "buried": best["buried"], "note": note,
            "alternatives": [{k: c[k] for k in ("resName", "chain", "resSeq", "heavyAtoms",
                                                "contacts", "buried")} for c in ranked[1:6]]}


# Backwards-compatible alias: the pipeline (binding_site.run) and verify.py both call this.
# Both now get the burial-aware selection, so a box saved by the pipeline still reproduces
# exactly when verify.py recomputes it (same function, same input → same atoms → same box).
largest_ligand = select_ligand


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
            # Selection diagnostics: how the reference ligand was chosen (buried + drug-like,
            # not just largest) and the runners-up, so a wrong pocket is auditable.
            "heavyAtoms": lig.get("heavyAtoms"), "ligandContacts": lig.get("contacts"),
            "ligandBuried": lig.get("buried"), "ligandWarning": lig.get("note"),
            "alternatives": lig.get("alternatives", []),
            "dockCommand": cmd,
            "disclaimer": "Box from the buried, drug-like co-crystal ligand envelope. Research only.",
        }, indent=2))
        return 0

    print(f"\nBinding-site box for {pid}")
    print(f"  Reference ligand: {lig['resName']} (chain {lig['chain']}, res {lig['resSeq']}, "
          f"{lig.get('heavyAtoms', len(lig['atoms']))} heavy atoms, "
          f"{int((lig.get('buried') or 0) * 100)}% buried in protein)")
    print(f"  Box center (Å): {b['center']}")
    print(f"  Box size  (Å): {b['size']}  (ligand envelope + 8 Å padding)")
    if lig.get("alternatives"):
        alts = ", ".join(f"{a['resName']}({a['heavyAtoms']}at,{int(a['buried']*100)}%)"
                         for a in lig["alternatives"][:3])
        print(f"  Other hetero groups: {alts}")
    if lig.get("note"):
        print(f"\n  ⚠️  {lig['note']}")
    print(f"\n  Dock with:\n  {cmd}")
    print("\n⚠️  Reference ligand picked by burial + drug-like size; verify it covers the "
          "intended pocket. Research only.")
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
