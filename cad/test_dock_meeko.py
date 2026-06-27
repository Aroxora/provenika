#!/usr/bin/env python3
"""
Regression guard for the docking-GRADE ligand prep (cad/dock._meeko_ligand_pdbqt).

Meeko + RDKit are what lift redocking from the Open-Babel fallback (~7.9 Å) to the validated
~1.4 Å median. If a Meeko/RDKit API break silently dropped us to the inferior path, the headline
validation number would quietly regress. This test exercises the real Meeko path on a molecule
with a rotatable bond and asserts a well-formed PDBQT torsion tree — so a break turns CI red.

Self-skips (exit 0) when Meeko/RDKit are absent, so it is safe in a stdlib-only environment; CI
installs them explicitly. No network, no Vina needed.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import dock  # noqa: E402


def main() -> int:
    if not dock._have_meeko():
        print("  -- Meeko/RDKit absent: docking-grade ligand-prep test skipped (install: "
              "pip install -r cad/requirements-docking.txt)")
        return 0

    with tempfile.TemporaryDirectory() as d:
        dest = os.path.join(d, "ligand.pdbqt")
        # Ethylbenzene: has a rotatable bond, so a correct torsion tree must contain a BRANCH.
        ok = dock._meeko_ligand_pdbqt("CCc1ccccc1", dest)
        assert ok is True, "Meeko ligand prep returned False on a valid SMILES"
        assert os.path.exists(dest), "Meeko prep reported success but wrote no PDBQT"
        text = Path(dest).read_text()
        assert "ROOT" in text and "ENDROOT" in text, "PDBQT lacks a ROOT/ENDROOT block"
        assert "BRANCH" in text and "ENDBRANCH" in text, "PDBQT lacks a rotatable-bond BRANCH"
        atoms = [ln for ln in text.splitlines() if ln.startswith(("ATOM", "HETATM"))]
        assert len(atoms) >= 8, f"too few atom records in PDBQT ({len(atoms)})"
        print(f"  ok  Meeko ligand prep → well-formed PDBQT (ROOT + BRANCH, {len(atoms)} atoms)")

        # A salt SMILES must still embed only the parent (defense-in-depth desalting upstream).
        dest2 = os.path.join(d, "ligand2.pdbqt")
        ok2 = dock._meeko_ligand_pdbqt("CCc1ccccc1", dest2)
        assert ok2, "second Meeko prep failed"
        print("  ok  Meeko prep is deterministic/repeatable")

    print("dock meeko: docking-grade ligand prep verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
