#!/usr/bin/env python3
"""Offline tests for the clinical resistance landscape (cad/resistance.py) and its rendering in the
validation request. No network."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import resistance as R  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def test_lookup_and_aliases():
    check("EGFR has a resistance entry", R.resistance_for("EGFR") is not None)
    check("symbol is case-insensitive", R.resistance_for("egfr") is not None)
    check("HER2 alias maps to ERBB2 (no entry -> None, honest)", R.resistance_for("HER2") == R.resistance_for("ERBB2"))
    check("BCR-ABL alias maps to ABL1", R.resistance_for("BCR-ABL") is R.resistance_for("ABL1"))
    check("unknown target returns None (never fabricated)", R.resistance_for("ZZZ9") is None)
    check("empty returns None", R.resistance_for("") is None)


def test_entries_are_cited_and_well_formed():
    for sym, rec in R.RESISTANCE.items():
        check(f"{sym} has context + unmet + mutations", bool(rec.get("context")) and bool(rec.get("unmet")) and rec["mutations"])
        for m in rec["mutations"]:
            check(f"{sym} {m['mut']} names confers/covered/ref",
                  bool(m.get("confers")) and bool(m.get("covered_by")) and bool(m.get("ref")))


def test_known_facts_are_right():
    egfr = R.landscape_markdown("EGFR")
    check("EGFR landscape names T790M and osimertinib", "T790M" in egfr and "osimertinib" in egfr)
    check("EGFR landscape names C797S as the post-osimertinib gap", "C797S" in egfr)
    btk = R.landscape_markdown("BTK")
    check("BTK landscape names C481S and pirtobrutinib", "C481S" in btk and "pirtobrutinib" in btk)
    abl = R.landscape_markdown("ABL1")
    check("ABL1 landscape names T315I and ponatinib/asciminib",
          "T315I" in abl and "ponatinib" in abl and "asciminib" in abl)
    kras = R.landscape_markdown("KRAS")
    check("KRAS landscape names the Y96 switch-II gap and the G12C inhibitors",
          "Y96" in kras and "adagrasib" in kras and "RAS(ON)" in kras)


def test_markdown_is_honest_and_silent_when_absent():
    md = R.landscape_markdown("EGFR")
    check("section frames the unmet need", "Unmet need" in md and "earns its place" in md)
    check("section is honest about scope (not exhaustive)", "not exhaustive" in md)
    check("section says not medical advice", "not medical advice" in md)
    check("no curated entry -> empty string (silent, not fabricated)", R.landscape_markdown("TP53") == "")


def test_renders_in_validation_request():
    import validation_package as V
    pkg = {"target": "EGFR", "symbol": "EGFR", "candidates": [], "n_candidates": 0, "standard_of_care": []}
    md = V.to_markdown(pkg, "egfr")
    check("validation request includes the resistance landscape", "Resistance landscape" in md and "T790M" in md)
    pkg2 = {"target": "TP53", "symbol": "TP53", "candidates": [], "n_candidates": 0, "standard_of_care": []}
    check("no section for a target without a curated entry", "Resistance landscape" not in V.to_markdown(pkg2, "tp53"))


def test_json_payload_is_well_formed_and_faithful():
    p = R.landscape_payload()
    check("payload stamps no date when none is given (deterministic)", "generated" not in p)
    check("payload counts every curated target", p["n_targets"] == len(R.RESISTANCE) == len(p["targets"]))
    syms = {t["symbol"] for t in p["targets"]}
    check("payload surfaces EGFR/BTK/ABL1/ALK", {"EGFR", "BTK", "ABL1", "ALK"} <= syms)
    for t in p["targets"]:
        check(f"{t['symbol']} payload entry keeps context + unmet + mutations",
              bool(t["context"]) and bool(t["unmet"]) and len(t["mutations"]) >= 1)
        for m in t["mutations"]:
            check(f"{t['symbol']} {m['mut']} payload mutation stays cited",
                  bool(m["confers"]) and bool(m["covered_by"]) and bool(m["ref"]))
            check(f"{t['symbol']} {m['mut']} payload leaks no unknown keys",
                  set(m) <= {"mut", "confers", "covered_by", "ref", "url"})
    check("payload carries the honesty disclaimer", "not medical advice" in p["disclaimer"])
    check("an explicit date flows into the snapshot", R.landscape_payload("2026-06-27")["generated"] == "2026-06-27")


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} resistance assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
