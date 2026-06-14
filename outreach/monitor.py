#!/usr/bin/env python3
"""
24/7 local IMAP monitor — real-time inbox watcher for the outreach agent.

Because Proton Bridge runs locally, we can watch the mailbox continuously (IMAP IDLE,
falling back to polling) instead of only on a cloud schedule. On any new mail it runs
the same handler the cloud cycle uses: detect bounces -> mark invalid, classify replies
-> agentic response (gated), and periodically draft follow-ups + refresh the public log.

It is crash-tolerant and bridge-tolerant: if Proton Bridge is down it simply keeps
retrying until it's back. Sending stays governed by SEND_ENABLED / AUTO_REPLY_ENABLED,
so running this 24/7 is safe — by default it monitors and drafts, and sends nothing.

Run:
  python3 outreach/monitor.py            # run forever (what launchd runs)
  python3 outreach/monitor.py --once     # one pass, then exit (for testing)
Install as a macOS auto-start service: see outreach/install_monitor.sh.
"""

from __future__ import annotations

import socket
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import agent
import emailer
from config import cfg

PUBLISH_EVERY = 600  # seconds between follow-up checks + public-log refresh


def log(msg: str) -> None:
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def _idle_once(timeout: int) -> bool:
    """Dedicated IMAP IDLE wait: block until the server reports activity or timeout.
    Best-effort; raises on protocol/connection trouble so the caller can fall back."""
    m = emailer._imap_connect()
    try:
        m.select("INBOX")
        tag = m._new_tag()
        m.send(tag + b" IDLE\r\n")
        if not m.readline().lstrip().startswith(b"+"):
            return False
        m.socket().settimeout(timeout)
        woke = False
        try:
            woke = bool(m.readline())          # any server push = new activity
        except (socket.timeout, OSError):
            woke = False
        try:
            m.send(b"DONE\r\n"); m.readline()
        except Exception:
            pass
        return woke
    finally:
        try:
            m.logout()
        except Exception:
            pass


def _process_and_maintain(last_publish: float) -> float:
    res = agent.process_inbox()
    errs = [r for r in res if isinstance(r, dict) and r.get("error")]
    if errs:
        log(f"inbox errors: {errs}")
    elif res:
        log(f"inbox: processed {len(res)} item(s): "
            + ", ".join(r.get("event") or r.get("classification") or "?" for r in res))
    now = time.time()
    if now - last_publish > PUBLISH_EVERY:
        try:
            fu = agent.followups()
            pub = agent.export_public_log()
            log(f"maintenance: {len(fu)} follow-up(s) checked; public log -> {pub.get('entries')} entries")
        except Exception as e:
            log(f"maintenance error: {e}")
        return now
    return last_publish


def main(argv=None) -> int:
    once = "--once" in (argv or sys.argv[1:])
    log(f"monitor starting — send={cfg.SEND_ENABLED} auto_reply={cfg.AUTO_REPLY_ENABLED} "
        f"idle={cfg.MONITOR_USE_IDLE} poll={cfg.MONITOR_POLL_SECONDS}s "
        f"imap={cfg.IMAP_HOST}:{cfg.IMAP_PORT}")
    last_publish = 0.0
    use_idle = cfg.MONITOR_USE_IDLE
    backoff = 5
    while True:
        try:
            last_publish = _process_and_maintain(last_publish)
            backoff = 5
            if once:
                return 0
            if use_idle:
                try:
                    if _idle_once(min(300, max(30, cfg.MONITOR_POLL_SECONDS * 10))):
                        log("IDLE: new activity")
                except Exception as e:
                    log(f"IDLE unavailable ({e}); switching to polling")
                    use_idle = False
                    time.sleep(cfg.MONITOR_POLL_SECONDS)
            else:
                time.sleep(cfg.MONITOR_POLL_SECONDS)
        except KeyboardInterrupt:
            log("monitor stopping (interrupt)")
            return 0
        except Exception as e:
            log(f"loop error: {e}; retrying in {backoff}s")
            if once:
                return 1
            time.sleep(backoff)
            backoff = min(300, backoff * 2)


if __name__ == "__main__":
    raise SystemExit(main())
