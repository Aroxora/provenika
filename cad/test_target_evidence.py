#!/usr/bin/env python3
"""Offline tests for Open Targets target-validation evidence (cad/target_evidence.py). API mocked."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import target_evidence as TE  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def test_genetic_support_labels():
    strong = [{"genetic_score": 0.8}, {"genetic_score": 0.3}]
    check("strong when best genetic >= 0.5", "strong" in TE.genetic_support_label(strong))
    check("strong cites Nelson 2015 (~2x)", "2x" in TE.genetic_support_label(strong))
    check("moderate band", "moderate" in TE.genetic_support_label([{"genetic_score": 0.3}]))
    check("weak band", "weak" in TE.genetic_support_label([{"genetic_score": 0.1}]))
    none = TE.genetic_support_label([{"genetic_score": None}])
    check("absence is not evidence against", "not evidence against" in none)


def test_evidence_shape_mocked():
    TE.resolve_ensembl = lambda s: ("ENSG00000146648", "EGFR")
    TE.associations = lambda e, size=6: [
        {"disease": "non-small cell lung carcinoma", "disease_id": "MONDO_1", "overall_score": 0.85,
         "genetic_score": 0.75, "somatic_score": 0.83, "known_drug_score": None,
         "url": "https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_1"},
    ]
    ev = TE.evidence("EGFR")
    check("ensembl id resolved", ev["ensembl_id"] == "ENSG00000146648")
    check("top associations populated", len(ev["top_associations"]) == 1)
    check("genetic support read-out present", "genetic" in ev["genetic_support"])
    check("source is Open Targets", "Open Targets" in ev["source"])
    check("disclaimer: not an outcome prediction", "not a per-program forecast" in ev["disclaimer"])
    md = TE.to_markdown(ev)
    check("markdown table cites the disease + evidence link", "non-small cell lung carcinoma" in md and "platform.opentargets.org" in md)


def test_not_found():
    TE.resolve_ensembl = lambda s: None
    ev = TE.evidence("NOTAGENE")
    check("unknown target → error, no fabrication", ev.get("error") and "top_associations" not in ev)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} target-evidence assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
