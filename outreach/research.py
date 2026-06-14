#!/usr/bin/env python3
"""
Prospect research via Tavily — turn a name/firm into a short, cited profile used
to personalize outreach. Returns real search results + sources; never invents.
"""

from __future__ import annotations

import json
import urllib.request

from config import cfg


def tavily_search(query: str, max_results: int = 5) -> dict:
    if not cfg.TAVILY_API_KEY:
        raise RuntimeError("TAVILY_API_KEY is not set (see outreach/.env).")
    body = json.dumps({
        "api_key": cfg.TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
        "include_answer": True,
        "search_depth": "advanced",
    }).encode()
    req = urllib.request.Request("https://api.tavily.com/search", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def profile_prospect(name: str, firm: str = "") -> dict:
    """Research an investor/prospect. Returns {summary, sources:[{title,url}]}.
    summary is Tavily's extractive answer (a lead to verify), NOT a fabricated bio."""
    q = f"{name} {firm} investor thesis biotech / techbio / AI drug discovery focus".strip()
    data = tavily_search(q)
    return {
        "query": q,
        "summary": data.get("answer", "") or "",
        "sources": [{"title": r.get("title", ""), "url": r.get("url", "")}
                    for r in data.get("results", [])],
    }
