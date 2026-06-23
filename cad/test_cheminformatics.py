#!/usr/bin/env python3
"""
Known-value tests for the deterministic ligand-efficiency metrics in
cheminformatics.py — ligand efficiency (LE) and lipophilic efficiency (LLE).

These are high-stakes numbers (shown in the CLI and the web triage drawer), so a
regression in the formula or the 1.37 constant must fail CI, not silently ship a
wrong figure. Both functions are pure arithmetic and need no RDKit, so this runs
anywhere; the RDKit-dependent descriptor path is smoke-tested separately in CI.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import cheminformatics as ci  # noqa: E402  (RDKit-guarded import; works without it)

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def approx(a, b, tol=1e-9) -> bool:
    return a is not None and abs(a - b) < tol


# Ligand efficiency: LE = 1.37 * pChEMBL / heavy_atoms (Hopkins, Groom & Alex 2004;
# 1.37 ≈ 2.303·R·T kcal/mol). Exact values pin both the formula AND the constant.
check("LE = 1.37·p/N  (p=10, N=20 → 0.685)", approx(ci.ligand_efficiency(10, 20), 0.685))
check("LE  (p=5, N=25 → 0.274)", approx(ci.ligand_efficiency(5, 25), 0.274))
check("LE falls as heavy-atom count rises", ci.ligand_efficiency(8, 20) > ci.ligand_efficiency(8, 40))
check("LE guards divide-by-zero (N=0 → None)", ci.ligand_efficiency(7, 0) is None)

# Lipophilic efficiency: LLE = pChEMBL - cLogP (Leeson & Springthorpe 2007).
check("LLE = p - cLogP  (8.0 - 3.0 → 5.0)", approx(ci.lipophilic_efficiency(8.0, 3.0), 5.0))
check("LLE can be negative (6.0 - 7.0 → -1.0)", approx(ci.lipophilic_efficiency(6.0, 7.0), -1.0))

# If RDKit is present, confirm descriptors feed the formulas correctly on a known molecule.
if getattr(ci, "_RDKIT", False):
    pains, brenk = ci._catalogs()
    a = ci.analyze("CC(=O)Oc1ccccc1C(=O)O", pains, brenk)  # aspirin: 13 heavy atoms
    check("aspirin parses → 13 heavy atoms", a is not None and a["heavy_atoms"] == 13)
    check("LE derives from real heavy-atom count",
          approx(ci.ligand_efficiency(7.0, a["heavy_atoms"]), round(1.37 * 7.0 / 13, 3)))
else:
    print("  -- RDKit absent: descriptor checks skipped (the formula checks above are RDKit-free)")

print(f"\n{_passed} cheminformatics formula tests passed.")
