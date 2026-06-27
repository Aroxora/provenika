#!/usr/bin/env python3
"""Offline tests for the shared mutation/variant parser (cad/mutations.py)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import mutations as m  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


# parse_variants
check("KRAS G12C → {G12C}", m.parse_variants("KRAS G12C") == {"G12C"})
check("EGFR L858R/T790M → both", m.parse_variants("EGFR L858R/T790M") == {"L858R", "T790M"})
check("plain EGFR → empty", m.parse_variants("EGFR") == set())
check("BRAF V600E → {V600E}", m.parse_variants("BRAF V600E") == {"V600E"})
check("case-insensitive", m.parse_variants("kras g12c") == {"G12C"})
# Must NOT fire on ordinary gene names / tokens that merely look mutation-ish.
check("MAP2K1 is not a mutation", m.parse_variants("MAP2K1") == set())
check("CDK4 is not a mutation", m.parse_variants("CDK4") == set())

# parse_mutation
check("parse G12C", m.parse_mutation("G12C") == ("G", 12, "C"))
check("parse T790M", m.parse_mutation("T790M") == ("T", 790, "M"))
check("parse stop Q61*", m.parse_mutation("Q61*") == ("Q", 61, "*"))
check("non-mutation → None", m.parse_mutation("EGFR") is None)
check("partial token → None", m.parse_mutation("G12") is None)

# strip_variants
check("strip KRAS G12C → KRAS", m.strip_variants("KRAS G12C") == "KRAS")
check("strip EGFR L858R/T790M → EGFR", m.strip_variants("EGFR L858R/T790M") == "EGFR")
check("strip leaves plain name", m.strip_variants("EGFR") == "EGFR")
check("only-a-mutation falls back to original", m.strip_variants("G12C") == "G12C")

# three_to_one
check("CYS → C", m.three_to_one("CYS") == "C")
check("GLY → G", m.three_to_one("GLY") == "G")
check("MSE (selenomethionine) → M", m.three_to_one("MSE") == "M")
check("unknown → None", m.three_to_one("XYZ") is None)

print(f"\n{_passed} mutation-parser assertions passed.")
