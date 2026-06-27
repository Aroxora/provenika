#!/usr/bin/env python3
"""
Offline tests for the explanation layer's number-guard (cad/explain.py) — the safeguard that makes
the LLM explainer structurally unable to introduce a figure. No network, no API key needed.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import explain as E  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


DATA = {
    "target": "EGFR",
    "pdb_count": 354,
    "top_hits": [
        {"chembl_id": "CHEMBL5746224", "best_pchembl": 9.5, "smiles": "CCO"},
        {"chembl_id": "CHEMBL176582", "best_pchembl": 11.0},
    ],
    "note": "redocking benchmark 52.6% at 1.90 A median",
}


def test_collect_numbers():
    nums = E.collect_numbers(DATA)
    for v in (354.0, 9.5, 11.0, 52.6, 1.9):
        check(f"collected {v}", any(abs(v - n) < 0.01 for n in nums))


def test_faithful_text_passes():
    txt = ("EGFR has 354 PDB structures. The top hit CHEMBL5746224 has pChEMBL 9.5; the redocking "
           "benchmark reproduced 52.6% of poses at a 1.90 A median. There are 2 top hits shown.")
    bad = E.foreign_numbers(txt, DATA)
    check("a faithful explanation has no foreign numbers", bad == [])
    check("guard reports ok", E.guard(txt, DATA)["ok"] is True)


def test_fabricated_number_is_caught():
    txt = "The top hit binds EGFR with an IC50 of 0.3 nM and improves survival by 40%."
    bad = E.foreign_numbers(txt, DATA)
    check("fabricated 0.3 is flagged", "0.3" in bad)
    check("fabricated 40 is flagged", "40" in bad)
    check("guard fails on fabrication", E.guard(txt, DATA)["ok"] is False)


def test_ordinals_and_counts_allowed():
    txt = "Of the 2 hits, the 1st is the strongest; it is 1 of 2 quinazolines."
    check("counts/ordinals (1,2) are allowed", E.foreign_numbers(txt, DATA) == [])


def test_explain_skips_without_key(monkeypatch=None):
    import os
    saved = {k: os.environ.pop(k, None) for k in ("DEEPSEEK_API_KEY", "OPENAI_API_KEY")}
    try:
        res = E.explain(DATA, kind="dossier")
        check("no key → skipped (never fabricates)", "skipped" in res)
    finally:
        for k, v in saved.items():
            if v is not None:
                os.environ[k] = v


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} explain-guard assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
