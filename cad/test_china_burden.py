#!/usr/bin/env python3
"""
Offline tests for the China cancer-burden lens (cad/china_burden.py) and the `--china` view in
cad/target_panel.py. No network.

Guards the two things that make this useful AND honest: (1) a target's disease maps to the correct
China top-burden cancer and the scan picks the HIGHEST-priority cancer a target touches; (2) the brief
and the China view stay honest — figures are the cited 2022 national estimates, mapping is a relevance
heuristic, and the source (Han 2022 / National Cancer Center) is named.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import china_burden as CB  # noqa: E402
import target_panel as P  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def test_disease_mapping():
    check("lung maps to China #1", CB.priority_for_disease("EGFR-related lung cancer")["mortality_rank"] == 1)
    check("liver/HCC maps to China #2", CB.priority_for_disease("hepatocellular carcinoma")["mortality_rank"] == 2)
    check("gastric maps to China #3", CB.priority_for_disease("gastric cancer")["mortality_rank"] == 3)
    check("colorectal maps to China #4", CB.priority_for_disease("colorectal cancer")["mortality_rank"] == 4)
    check("non-burden cancer maps to None", CB.priority_for_disease("papillary renal cell carcinoma") is None)
    check("empty maps to None", CB.priority_for_disease("") is None)


def test_scan_picks_highest_priority():
    # A target hitting both a niche cancer and lung must surface as lung (rank 1).
    best = CB.scan_diseases(["papillary renal cell carcinoma", "lung adenocarcinoma"])
    check("scan returns the highest-priority (lung)", best and best["key"] == "lung")
    check("scan of only-niche returns None", CB.scan_diseases(["thyroid carcinoma", "glioma"]) is None)
    check("scan of empty returns None", CB.scan_diseases([]) is None)


def test_brief_is_cited_and_honest():
    md = CB.burden_brief_markdown()
    check("brief names the National Cancer Center source", "National Cancer Center" in md and "39036382" in md)
    check("brief states the 2022 totals", "4.82" in md and "2.57" in md)
    check("brief shows lung as death rank #1", "肺癌" in md and "#1" in md)
    check("brief is honest: not a per-program forecast", "not per-program forecasts" in md)
    check("brief says not medical advice", "not medical advice" in md)


def test_china_view_orders_by_burden():
    rows = [
        {"symbol": "EGFR", "url": "u", "genetic_score": 0.93, "genetic_cancer": "lung cancer",
         "known_drug_score": 0.99, "china_cancer": "Lung cancer", "china_cancer_cn": "肺癌", "china_death_rank": 1},
        {"symbol": "KRAS", "url": "u", "genetic_score": 0.90, "genetic_cancer": "gastric cancer",
         "known_drug_score": None, "china_cancer": "Stomach (gastric) cancer", "china_cancer_cn": "胃癌", "china_death_rank": 3},
        {"symbol": "ALK", "url": "u", "genetic_score": 0.96, "genetic_cancer": "neuroblastoma",
         "known_drug_score": 0.9, "china_cancer": None, "china_cancer_cn": None, "china_death_rank": None},
    ]
    md = P.to_china_markdown(rows)
    check("China view leads with the burden brief", "China's cancer burden" in md)
    check("lung target (EGFR) appears before gastric (KRAS)", md.index("EGFR") < md.index("KRAS"))
    check("unmapped target (ALK) listed as not-mapped, not dropped silently", "ALK" in md and "not mapped" in md)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} China-burden assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
