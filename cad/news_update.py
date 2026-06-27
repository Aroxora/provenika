#!/usr/bin/env python3
"""
News auto-update — pulls recent intelligence on watched targets/modalities via
the Tavily API and writes a dated markdown digest under cad/intel/.

Designed to run in CI on a schedule (see .github/workflows/news-update.yml). The
Tavily key is read ONLY from the TAVILY_API_KEY environment variable (in CI it
comes from GitHub Actions secrets) — it is never read from or written to the repo.
If no key is set, the script exits 0 without doing anything (so CI stays green).

Watchlist: one query per line in cad/watchlist.txt (created with defaults on first
run). Override with --queries.

Usage:
  TAVILY_API_KEY=... python3 cad/news_update.py
  TAVILY_API_KEY=... python3 cad/news_update.py --queries "KRAS G12D inhibitor" --days 14
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent.parent
INTEL_DIR = ROOT / "cad" / "intel"
WATCHLIST = ROOT / "cad" / "watchlist.txt"
TAVILY_URL = "https://api.tavily.com/search"

DEFAULT_WATCHLIST = [
    "oncology drug FDA approval",
    "KRAS inhibitor clinical trial results",
    "EGFR inhibitor resistance new drug",
    "antibody-drug conjugate oncology trial",
    "CAR-T cell therapy solid tumor",
    "targeted protein degradation PROTAC oncology",
]


def load_watchlist() -> list[str]:
    if WATCHLIST.exists():
        lines = [l.strip() for l in WATCHLIST.read_text().splitlines()]
        return [l for l in lines if l and not l.startswith("#")]
    WATCHLIST.write_text(
        "# One search query per line. Lines starting with # are ignored.\n"
        + "\n".join(DEFAULT_WATCHLIST) + "\n"
    )
    return DEFAULT_WATCHLIST


def tavily_search(api_key: str, query: str, days: int, max_results: int) -> dict:
    body = json.dumps({
        "api_key": api_key,
        "query": query,
        "topic": "news",
        "days": days,
        "max_results": max_results,
        "search_depth": "basic",
        "include_answer": True,
    }).encode()
    req = urllib.request.Request(
        TAVILY_URL, data=body,
        headers={"Content-Type": "application/json", "User-Agent": "oncology-osint-cad/1.0"},
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.load(resp)


def _domain(url: str) -> str:
    """Bare registrable-ish hostname for counting independent sources."""
    try:
        h = (urlparse(url).hostname or "").lower()
        return h[4:] if h.startswith("www.") else h
    except Exception:
        return ""


def corroboration(results: list[dict], min_sources: int = 2) -> dict:
    """How many INDEPENDENT domains back a query's results — the fact-check gate. A lead reported by
    one site is weaker than one reported by several. Returns the distinct-domain count + a label."""
    domains = sorted({_domain(r.get("url", "")) for r in results if r.get("url")})
    n = len(domains)
    label = ("corroborated" if n >= min_sources else "single-source" if n == 1 else "no source")
    return {"n_sources": n, "domains": domains, "label": label, "corroborated": n >= min_sources}


def run(args) -> int:
    api_key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not api_key:
        print("TAVILY_API_KEY not set — skipping news update (CI stays green).")
        return 0

    queries = args.queries or load_watchlist()
    now = datetime.now(timezone.utc)
    INTEL_DIR.mkdir(parents=True, exist_ok=True)

    out = [f"# Research intelligence digest — {now:%Y-%m-%d}",
           f"\n_Auto-generated from Tavily news search (last {args.days} days). Headlines are **leads "
           "to verify at the primary source — not validated facts.** Each query is fact-check-gated by "
           f"independent-source corroboration (≥{args.min_sources} distinct domains = corroborated). "
           "Tavily's AI-synthesized summary is shown only when corroborated and is itself a lead._\n"]

    total = 0
    for q in queries:
        try:
            data = tavily_search(api_key, q, args.days, args.max_results)
        except Exception as e:  # network/api hiccup on one query shouldn't kill the run
            out.append(f"## {q}\n\n_Search failed: {type(e).__name__}_\n")
            continue
        results = data.get("results", [])
        corr = corroboration(results, args.min_sources)
        out.append(f"## {q}\n")
        out.append(f"_Corroboration: **{corr['label']}** — {corr['n_sources']} independent "
                   f"source(s){(': ' + ', '.join(corr['domains'])) if corr['domains'] else ''}._\n")
        # Tavily's `answer` is an LLM SYNTHESIS, not a primary source — the riskiest "fact" here. Gate
        # it on corroboration: include only when ≥min_sources independent domains exist, always labeled.
        if data.get("answer"):
            if corr["corroborated"]:
                out.append(f"> 🤖 _AI-synthesized lead (Tavily; verify at sources below):_ "
                           f"{data['answer'].strip()}\n")
            else:
                out.append("> 🤖 _AI-synthesized summary withheld — not corroborated by "
                           f"≥{args.min_sources} independent sources. Read the source(s) directly._\n")
        if not results:
            out.append("_No recent results._\n")
        for r in results:
            title = (r.get("title") or "untitled").strip()
            url = r.get("url", "")
            dom = _domain(url)
            date = r.get("published_date", "") or ""
            snippet = (r.get("content") or "").strip().replace("\n", " ")
            tag = " ⚠️ single-source" if corr["n_sources"] == 1 else ""
            out.append(f"- [{title}]({url}) {('— ' + date[:10]) if date else ''}"
                       f"{(' · ' + dom) if dom else ''}{tag}")
            if snippet:
                out.append(f"  - {snippet[:240]}{'…' if len(snippet) > 240 else ''}")
            total += 1
        out.append("")

    out.append(f"\n---\n*{total} items across {len(queries)} queries. "
               f"Generated {now:%Y-%m-%d %H:%M UTC}. Verify before relying on any item.*\n")

    digest = "\n".join(out)
    dated = INTEL_DIR / f"{now:%Y-%m-%d}.md"
    dated.write_text(digest)
    (INTEL_DIR / "LATEST.md").write_text(digest)
    try:
        rel = dated.relative_to(ROOT)
    except ValueError:
        rel = dated
    print(f"Wrote {rel} ({total} items).")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Pull recent target/modality news into a digest (Tavily).")
    p.add_argument("--queries", nargs="*", help="Override the watchlist with explicit queries.")
    p.add_argument("--days", type=int, default=7, help="Look-back window in days (default 7).")
    p.add_argument("--max-results", type=int, default=5, help="Results per query (default 5).")
    p.add_argument("--min-sources", type=int, default=2,
                   help="Independent domains required to mark a lead 'corroborated' (default 2).")
    args = p.parse_args(argv)
    try:
        return run(args)
    except urllib.error.URLError as e:
        print(f"Network error reaching Tavily: {e}", file=sys.stderr)
        return 0  # don't fail CI on a transient network issue


if __name__ == "__main__":
    raise SystemExit(main())
