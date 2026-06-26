#!/usr/bin/env python3
"""
Offline tests for the docking-box ligand selection (cad/binding_site.py).

The bug this guards against: the old selector picked the hetero group with the MOST atoms,
so a large detergent / PEG / glycan / peptide on the surface could hijack the docking box
away from the real, buried inhibitor. select_ligand now scores by burial + drug-like size.

Pure stdlib, no network: select_ligand() takes raw PDB text.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import binding_site as bs  # noqa: E402


def _atom(rec, serial, name, res, chain, seq, x, y, z, elem):
    """Build one fixed-column PDB ATOM/HETATM record (cols matter to the parser)."""
    return (f"{rec:<6}{serial:>5} {name:<4}{'':1}{res:>3} {chain:1}{seq:>4}"
            f"{'':4}{x:8.3f}{y:8.3f}{z:8.3f}{1.0:6.2f}{0.0:6.2f}{'':10}{elem:>2}")


def _protein_blob():
    """27 protein heavy atoms on a 3x3x3 grid around the origin (incl. one at 0,0,0)."""
    lines, serial = [], 1
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for k in (-1, 0, 1):
                lines.append(_atom("ATOM", serial, "CA", "ALA", "A", serial,
                                   i * 2.0, j * 2.0, k * 2.0, "C"))
                serial += 1
    return lines


def _hetatms(res, chain, n, center, serial0, elem="C"):
    cx, cy, cz = center
    return [_atom("HETATM", serial0 + i, "C", res, chain, 900,
                  cx + 0.1 * i, cy, cz, elem) for i in range(n)]


def make_pdb(*groups):
    return "\n".join(line for g in groups for line in g) + "\n"


def test_buried_druglike_beats_larger_surface_additive():
    """A 20-atom ligand buried in the protein must beat a 50-atom additive sitting far away —
    the exact case the old 'largest group' rule got wrong."""
    pdb = make_pdb(
        _protein_blob(),
        _hetatms("LIG", "A", 20, (0.0, 0.0, 0.0), serial0=100),   # buried, drug-like
        _hetatms("BIG", "B", 50, (50.0, 50.0, 50.0), serial0=200),  # larger, far away
    )
    lig = bs.select_ligand(pdb)
    assert lig is not None
    assert lig["resName"] == "LIG", f"picked {lig['resName']} (should be the buried LIG, not BIG)"
    assert lig["contacts"] > 0 and lig["buried"] > 0
    assert lig["heavyAtoms"] == 20
    # The runner-up should be surfaced for auditability.
    assert any(a["resName"] == "BIG" for a in lig["alternatives"])
    # And the old behaviour (max atom count) would have been wrong here.
    assert lig["note"] is None  # a clean, confident pick → no warning


def test_oversized_polymer_loses_to_small_buried_ligand():
    """An oversized (>70 heavy) hetero group, even if near the protein, is treated as a
    cofactor/peptide/polymer and loses to a drug-like buried ligand."""
    pdb = make_pdb(
        _protein_blob(),
        _hetatms("LIG", "A", 18, (0.0, 0.0, 0.0), serial0=100),    # drug-like, buried
        _hetatms("PEPT", "A", 120, (1.0, 0.0, 0.0), serial0=300),  # huge, also near protein
    )
    lig = bs.select_ligand(pdb)
    assert lig["resName"] == "LIG", f"picked {lig['resName']} (oversized PEPT should lose)"


def test_no_protein_falls_back_with_warning():
    """With no ATOM records, burial can't be judged: fall back to the largest group but warn."""
    pdb = make_pdb(
        _hetatms("ONE", "A", 12, (0.0, 0.0, 0.0), serial0=10),
        _hetatms("TWO", "A", 30, (20.0, 0.0, 0.0), serial0=50),
    )
    lig = bs.select_ligand(pdb)
    assert lig["resName"] == "TWO"  # largest, since burial is unknowable
    assert lig["note"] and "no protein atoms" in lig["note"]


def test_surface_additive_only_is_flagged():
    """If the only hetero group makes no protein contacts, the box is still returned but the
    warning makes the low confidence explicit (no fabricated certainty)."""
    pdb = make_pdb(
        _protein_blob(),
        _hetatms("ADD", "Z", 15, (60.0, 60.0, 60.0), serial0=100),  # far from protein
    )
    lig = bs.select_ligand(pdb)
    assert lig["resName"] == "ADD"
    assert lig["contacts"] == 0
    assert lig["note"] and "no protein contacts" in lig["note"]


def test_box_geometry_unchanged():
    """box() still produces center = centroid, size = extent + 2*pad, so a box saved by the
    pipeline reproduces exactly when verify.py recomputes it from the same ligand."""
    pts = [(0.0, 0.0, 0.0), (2.0, 0.0, 0.0), (0.0, 4.0, 0.0), (0.0, 0.0, 6.0)]
    b = bs.box(pts, pad=8.0)
    assert b["center"] == [0.5, 1.0, 1.5]
    assert b["size"] == [18.0, 20.0, 22.0]


def _cif(rows):
    """Build a minimal mmCIF with an _atom_site loop. rows: (rec, elem, comp, asym, seq, x,y,z)."""
    header = [
        "data_TEST", "#", "loop_",
        "_atom_site.group_PDB", "_atom_site.id", "_atom_site.type_symbol",
        "_atom_site.label_comp_id", "_atom_site.label_asym_id", "_atom_site.label_seq_id",
        "_atom_site.Cartn_x", "_atom_site.Cartn_y", "_atom_site.Cartn_z",
    ]
    body = [f"{rec} {i + 1} {el} {comp} {asym} {seq} {x:.3f} {y:.3f} {z:.3f}"
            for i, (rec, el, comp, asym, seq, x, y, z) in enumerate(rows)]
    return "\n".join(header + body + ["#", ""])


def test_cif_format_is_parsed_and_buried_ligand_selected():
    """select_ligand must work on mmCIF (the format RCSB serves for cif-only entries) and still
    pick the buried drug-like ligand over a larger far additive."""
    rows = []
    s = 0
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for k in (-1, 0, 1):
                rows.append(("ATOM", "C", "ALA", "A", s, i * 2.0, j * 2.0, k * 2.0)); s += 1
    rows += [("HETATM", "C", "LIG", "B", 900, 0.1 * t, 0.0, 0.0) for t in range(12)]   # buried
    rows += [("HETATM", "C", "BIG", "C", 901, 50 + 0.1 * t, 50.0, 50.0) for t in range(30)]  # far
    lig = bs.select_ligand(_cif(rows))
    assert lig is not None and lig["resName"] == "LIG", lig
    assert lig["contacts"] > 0 and lig["heavyAtoms"] == 12
    assert any(a["resName"] == "BIG" for a in lig["alternatives"])


def test_format_autodetect_routes_cif_vs_pdb():
    cif = _cif([("HETATM", "C", "LIG", "A", 1, 0.0, 0.0, 0.0)])
    g_cif, _, _, _ = bs._parse_structure(cif)
    assert ("LIG", "A", "1") in g_cif  # routed to the mmCIF parser
    pdb = make_pdb(_hetatms("LIG", "A", 3, (0.0, 0.0, 0.0), serial0=1))
    g_pdb, _, _, _ = bs._parse_structure(pdb)
    assert any(k[0] == "LIG" for k in g_pdb)  # routed to the fixed-column PDB parser


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"binding_site: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
