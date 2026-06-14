#!/usr/bin/env python3
"""
Health & status for the outreach service.

Produces a full operator report (CLI) and a redacted PUBLIC status JSON the website
renders (web/public/data/outreach/status.json). Also defines the monitor heartbeat.

Checks: LLM + Tavily keys (presence; --deep pings them), IMAP + SMTP connectivity
(login only, never sends), Firestore control reachability, the control switch state,
the monitor's liveness (heartbeat freshness), and pipeline counts. Light by default
(no API spend); pass deep=True to actually ping the LLM/Tavily endpoints.
"""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

import control
import emailer
from config import cfg, get
from store import get_store

HERE = Path(__file__).parent
HEARTBEAT = HERE / ".state" / "heartbeat.json"
PUBLIC = HERE.parent / "web" / "public" / "data" / "outreach" / "status.json"

OK, WARN, FAIL = "ok", "warn", "fail"


def _c(name, status, detail=""):
    return {"name": name, "status": status, "detail": detail}


def _pipeline() -> dict:
    s = get_store()
    contacts = s.all_contacts()
    d = sent = replied = bounced = 0
    for c in contacts:
        for i in s.interactions_for(c["email"]):
            k = i.get("kind")
            d += k == "draft"
            sent += k == "sent"
            replied += k == "reply"
        if c.get("status") == "bounced" or c.get("invalid"):
            bounced += 1
    return {"contacts": len(contacts), "drafts": d, "sent": sent, "replied": replied, "bounced": bounced}


def _heartbeat_check() -> dict:
    try:
        hb = json.loads(HEARTBEAT.read_text())
        age = time.time() - hb.get("ts", 0)
        fresh = age < max(120, cfg.MONITOR_POLL_SECONDS * 4)
        return _c("Outreach monitor", OK if fresh else FAIL,
                  f"last heartbeat {int(age)}s ago" if fresh else
                  f"stale ({int(age)}s) — daemon not running? `bash outreach/install_monitor.sh`")
    except Exception:
        return _c("Outreach monitor", FAIL, "no heartbeat — not started (`bash outreach/install_monitor.sh`)")


def _firestore_check() -> dict:
    project = get("FIRESTORE_PROJECT", "cancer-cure-osint")
    url = (f"https://firestore.googleapis.com/v1/projects/{project}"
           f"/databases/(default)/documents/control/outreach")
    try:
        urllib.request.urlopen(url, timeout=8)
        return _c("Firestore control", OK, "control doc present (website switch active)")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return _c("Firestore control", WARN, "reachable, no control doc yet (using local/.env)")
        return _c("Firestore control", WARN, f"HTTP {e.code} (using local/.env)")
    except Exception:
        return _c("Firestore control", WARN, "unreachable (using local/.env)")


def _llm_check(deep: bool) -> dict:
    if not cfg.LLM_API_KEY:
        return _c("LLM", FAIL, "LLM_API_KEY not set")
    if not deep:
        return _c("LLM", OK, f"configured ({cfg.LLM_PROVIDER}/{cfg.LLM_MODEL}, format={cfg.LLM_FORMAT}); --deep to ping")
    try:
        import llm
        llm.chat([{"role": "user", "content": "ping"}], max_tokens=3)
        return _c("LLM", OK, f"reachable ({cfg.LLM_PROVIDER}/{cfg.LLM_MODEL} via {llm.active_format()})")
    except Exception as e:
        return _c("LLM", FAIL, f"ping failed: {str(e)[:80]}")


def _tavily_check(deep: bool) -> dict:
    if not cfg.TAVILY_API_KEY:
        return _c("Tavily", WARN, "TAVILY_API_KEY not set (research disabled)")
    if not deep:
        return _c("Tavily", OK, "configured; --deep to ping")
    try:
        import research
        research.tavily_search("ping", max_results=1)
        return _c("Tavily", OK, "reachable")
    except Exception as e:
        return _c("Tavily", FAIL, f"ping failed: {str(e)[:80]}")


def gather(deep: bool = False) -> dict:
    conn = emailer.check_connectivity()
    checks = [
        _llm_check(deep),
        _tavily_check(deep),
        _c("IMAP (Proton Bridge)", OK if conn["imap"] == "ok" else FAIL,
           conn["imap"] if conn["imap"] != "ok" else "login ok"),
        _c("SMTP (Proton Bridge)", OK if conn["smtp"] == "ok" else FAIL,
           conn["smtp"] if conn["smtp"] != "ok" else "login ok"),
        _firestore_check(),
        _heartbeat_check(),
    ]
    switch = control.summary()
    pipeline = _pipeline()
    statuses = [c["status"] for c in checks]
    overall = FAIL if FAIL in statuses else (WARN if WARN in statuses else OK)
    return {"generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "overall": overall, "checks": checks, "switch": switch, "pipeline": pipeline}


def to_public(g: dict) -> dict:
    """Redact operator detail down to safe, generic public status."""
    GENERIC = {OK: "operational", WARN: "degraded", FAIL: "unavailable"}
    return {
        "generated": g["generated"],
        "overall": g["overall"],
        "services": [{"name": c["name"], "status": c["status"], "detail": GENERIC[c["status"]]}
                     for c in g["checks"]],
        "switch": {"send_enabled": g["switch"]["send_enabled"],
                   "auto_reply_enabled": g["switch"]["auto_reply_enabled"],
                   "source": g["switch"]["source"]},
        "pipeline": g["pipeline"],
    }


def write_public(g: dict) -> Path:
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC.write_text(json.dumps(to_public(g), indent=2))
    return PUBLIC


def beat() -> None:
    """Write the monitor liveness heartbeat (called by monitor.py each loop)."""
    HEARTBEAT.parent.mkdir(parents=True, exist_ok=True)
    HEARTBEAT.write_text(json.dumps({
        "ts": time.time(), "switch": control.summary(), "pipeline": _pipeline()}))
