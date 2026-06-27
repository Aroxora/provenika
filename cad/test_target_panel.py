#!/usr/bin/env python3
"""
Offline tests for the oncology target-panel ranker (cad/target_panel.py).

The Open Targets HTTP layer (resolve_ensembl / associations) is monkeypatched with canned rows, so
NO network is used. These guard the two things that matter: (1) the ranking key is the strongest
CANCER genetic-evidence score (not a non-cancer Mendelian disease, not a fabricated composite), and
(2) honesty — every number shown traces to fetched input, somatic-only targets sort below
genetically-supported ones with an honest read-out, and a not-found target degrades, never crashes.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import target_panel as P  # noqa: E402
import target_evidence as TE  # noqa: E402

# Canned Open Targets responses keyed by symbol. Each assoc row mirrors target_evidence.associations().
_DB = {
    "STRONGGENE": [  # strong CANCER genetic support (0.92 breast) + a stronger NON-cancer disease (must be ignored)
        {"disease": "breast cancer", "overall_score": 0.88, "genetic_score": 0.92,
         "somatic_score": 0.40, "known_drug_score": 0.75},
        {"disease": "intellectual disability", "overall_score": 0.99, "genetic_score": 0.99,
         "somatic_score": None, "known_drug_score": None},
    ],
    "MIDGENE": [  # moderate cancer genetic support (0.45 colorectal)
        {"disease": "colorectal cancer", "overall_score": 0.70, "genetic_score": 0.45,
         "somatic_score": 0.30, "known_drug_score": 0.60},
    ],
    "SOMATICONLY": [  # a real cancer driver, but NO genetic-association evidence (somatic-driven)
        {"disease": "lymphoma", "overall_score": 0.66, "genetic_score": None,
         "somatic_score": 0.80, "known_drug_score": 0.50},
    ],
}


def _install_stub():
    TE.resolve_ensembl = lambda s: (f"ENSG_{s}", s) if s in _DB else None
    TE.associations = lambda ens, size=20: _DB[ens.replace("ENSG_", "")]


_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def test_ranks_by_cancer_genetic_score():
    _install_stub()
    rows = P.rank(["MIDGENE", "SOMATICONLY", "STRONGGENE", "NOPE"])
    order = [r["symbol"] for r in rows]
    check("strongest cancer genetic target ranks first", order[0] == "STRONGGENE")
    check("moderate genetic target ranks above somatic-only", order.index("MIDGENE") < order.index("SOMATICONLY"))
    check("not-found target sorts last", order[-1] == "NOPE")


def test_picks_cancer_not_mendelian_disease():
    _install_stub()
    row = P.evaluate("STRONGGENE")
    # the 0.99 intellectual-disability genetic score must NOT be chosen; the 0.92 breast-cancer one must.
    check("ranking key is the CANCER genetic score (0.92), not the Mendelian 0.99",
          abs(row["genetic_score"] - 0.92) < 1e-9)
    check("names the cancer it refers to", row["genetic_cancer"] == "breast cancer")


def test_somatic_only_is_honest_not_a_failure():
    _install_stub()
    row = P.evaluate("SOMATICONLY")
    check("somatic-only target has no fabricated genetic score", row["genetic_score"] is None)
    check("read-out is honest about somatic-driven / no genetic evidence",
          "somatic" in row["readout"].lower() or "no genetic" in row["readout"].lower()
          or "no GENETIC" in row["readout"])


def test_markdown_only_shows_fetched_numbers():
    _install_stub()
    rows = P.rank(["STRONGGENE", "MIDGENE", "SOMATICONLY", "NOPE"])
    md = P.to_markdown(rows)
    check("markdown shows the fetched cancer genetic score", "0.92" in md)
    check("markdown never shows the ignored non-cancer 0.99 as the key", "**0.99**" not in md)
    check("markdown surfaces the not-found target honestly", "not found in Open Targets" in md)
    check("markdown carries the honesty disclaimer (prior not forecast)", "not a per-program forecast" in md.lower())
    check("markdown cites Nelson 2015 genetic-support rationale", "Nelson" in md)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} target-panel assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
