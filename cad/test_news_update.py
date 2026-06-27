#!/usr/bin/env python3
"""
Offline tests for the news fact-check gate (cad/news_update.py). Tavily is monkeypatched — no
network, no key. Verifies the corroboration logic and that the riskiest item (Tavily's
AI-synthesized `answer`) is withheld when not corroborated by independent sources.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import news_update as N  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def test_domain():
    check("strips www.", N._domain("https://www.fda.gov/news/x") == "fda.gov")
    check("bare host", N._domain("https://www.nature.com/articles/y") == "nature.com")
    check("blank on junk", N._domain("not a url") in ("", "not a url"))


def test_corroboration_levels():
    multi = [{"url": "https://fda.gov/a"}, {"url": "https://nature.com/b"}, {"url": "https://fda.gov/c"}]
    one = [{"url": "https://blog.example.com/a"}, {"url": "https://blog.example.com/b"}]
    none = [{"title": "x"}]
    check("2 distinct domains → corroborated", N.corroboration(multi)["corroborated"] is True)
    check("corroborated counts distinct domains (2, not 3)", N.corroboration(multi)["n_sources"] == 2)
    check("single domain → single-source, not corroborated", N.corroboration(one)["label"] == "single-source")
    check("single domain not corroborated", N.corroboration(one)["corroborated"] is False)
    check("no urls → no source", N.corroboration(none)["n_sources"] == 0)


def _run_with(results, answer):
    """Run the digest with a stubbed Tavily response and return the written LATEST.md text."""
    N.tavily_search = lambda key, q, days, mx: {"results": results, "answer": answer}
    with tempfile.TemporaryDirectory() as d:
        N.INTEL_DIR = Path(d)
        os.environ["TAVILY_API_KEY"] = "test-key"
        import argparse
        args = argparse.Namespace(queries=["KRAS G12D inhibitor"], days=7, max_results=5, min_sources=2)
        N.run(args)
        return (Path(d) / "LATEST.md").read_text()


def test_ai_answer_gated_on_corroboration():
    # Corroborated (2 domains): AI-synthesized answer is shown but labeled.
    txt = _run_with([{"title": "A", "url": "https://fda.gov/a"}, {"title": "B", "url": "https://nature.com/b"}],
                    "KRAS G12D drug X showed responses.")
    check("corroborated → AI lead shown + labeled", "AI-synthesized lead" in txt and "corroborated" in txt)

    # Single-source: AI answer WITHHELD.
    txt2 = _run_with([{"title": "A", "url": "https://blog.example.com/a"}], "Unverified claim Y.")
    check("single-source → AI summary withheld", "AI-synthesized summary withheld" in txt2)
    check("single-source items flagged", "single-source" in txt2)
    check("withheld answer text not leaked", "Unverified claim Y" not in txt2)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    saved = os.environ.get("TAVILY_API_KEY")
    try:
        for t in tests:
            t()
    finally:
        if saved is None:
            os.environ.pop("TAVILY_API_KEY", None)
    print(f"\n{_passed} news-gate assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
