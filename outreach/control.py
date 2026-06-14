#!/usr/bin/env python3
"""
Remote control plane — the website's "agentic takeover" switch.

The static web app can't reach this Mac, but both sides can reach Firestore. So the
owner toggles a single control doc (`control/outreach`) from the site (Google SSO,
write-locked to the owner email by security rules), and the local monitor reads that
doc over Firestore's REST API — no SDK, no credentials needed here, because the doc
is world-READABLE while only the owner can WRITE it.

Effective flag resolution (first that exists wins):
  1. Firestore `control/outreach` (set from the website)   <- the remote switch
  2. outreach/.state/control.json (set via `cli.py control`) <- local override
  3. outreach/.env SEND_ENABLED / AUTO_REPLY_ENABLED         <- static default

This is a HUMAN kill-switch: it lets the owner turn the autonomous sender on/off; it
never turns itself on. Default (no doc, no file) is whatever .env says (OFF).
"""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

from config import cfg, get

PROJECT = get("FIRESTORE_PROJECT", "cancer-cure-osint")
LOCAL = Path(__file__).parent / ".state" / "control.json"
_TTL = 15  # seconds; avoid hammering Firestore on every send
_cache: dict = {"at": 0.0, "val": None}


def _firestore_get() -> dict | None:
    """Read the public control doc via Firestore REST (rules allow unauth read)."""
    url = (f"https://firestore.googleapis.com/v1/projects/{PROJECT}"
           f"/databases/(default)/documents/control/outreach")
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            f = (json.load(r) or {}).get("fields", {})
    except Exception:
        return None

    def b(k):
        return f.get(k, {}).get("booleanValue")

    return {"sendEnabled": b("sendEnabled"), "autoReplyEnabled": b("autoReplyEnabled"),
            "updatedBy": f.get("updatedBy", {}).get("stringValue", ""), "source": "firestore"}


def _local_get() -> dict | None:
    try:
        return {**json.loads(LOCAL.read_text()), "source": "local"}
    except Exception:
        return None


def state(force: bool = False) -> dict:
    now = time.time()
    if not force and _cache["val"] is not None and now - _cache["at"] < _TTL:
        return _cache["val"]
    val = _firestore_get() or _local_get() or {
        "sendEnabled": None, "autoReplyEnabled": None, "source": "env"}
    _cache.update(at=now, val=val)
    return val


def effective_send_enabled() -> bool:
    v = state().get("sendEnabled")
    return cfg.SEND_ENABLED if v is None else bool(v)


def effective_auto_reply_enabled() -> bool:
    v = state().get("autoReplyEnabled")
    return cfg.AUTO_REPLY_ENABLED if v is None else bool(v)


def set_local(send_enabled=None, auto_reply_enabled=None, by: str = "cli") -> dict:
    """Local override (testing / no-Firestore). The website writes Firestore instead."""
    cur = _local_get() or {}
    if send_enabled is not None:
        cur["sendEnabled"] = bool(send_enabled)
    if auto_reply_enabled is not None:
        cur["autoReplyEnabled"] = bool(auto_reply_enabled)
    cur["updatedBy"] = by
    cur["updatedAt"] = time.time()
    LOCAL.parent.mkdir(parents=True, exist_ok=True)
    LOCAL.write_text(json.dumps(cur, indent=2))
    _cache["val"] = None  # invalidate
    return cur


def summary() -> dict:
    s = state(force=True)
    return {"send_enabled": effective_send_enabled(),
            "auto_reply_enabled": effective_auto_reply_enabled(),
            "source": s.get("source"), "updated_by": s.get("updatedBy", "")}
