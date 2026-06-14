#!/usr/bin/env python3
"""
Local CLI for the outreach agent — same actions as the Lambda, runnable from a shell.

Typical flow (all dry-run until you flip SEND_ENABLED and approve):
  python3 outreach/cli.py seed-memory
  python3 outreach/cli.py add --email gp@fund.vc --name "A. Partner" --firm "Fund VC" --category vc
  python3 outreach/cli.py draft --email gp@fund.vc
  python3 outreach/cli.py drafts                 # review the queue
  python3 outreach/cli.py approve --email gp@fund.vc
  python3 outreach/cli.py send                   # writes to .outbox/ unless SEND_ENABLED=true
  python3 outreach/cli.py ingest                 # read replies, classify
  python3 outreach/cli.py publish                # write the public web log
  python3 outreach/cli.py check                  # validate IMAP/SMTP creds (no send)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import agent
import emailer


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Agentic investor outreach (dry-run by default).")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("seed-memory").add_argument("--force", action="store_true")
    a = sub.add_parser("add")
    a.add_argument("--email", required=True)
    a.add_argument("--name", default="")
    a.add_argument("--firm", default="")
    a.add_argument("--category", default="investor")
    a.add_argument("--public", action="store_true", help="allow name/firm in the PUBLIC log")
    a.add_argument("--no-research", action="store_true")
    d = sub.add_parser("draft"); d.add_argument("--email", required=True); d.add_argument("--kind", default="first_touch")
    sub.add_parser("drafts")
    ap = sub.add_parser("approve"); ap.add_argument("--email", required=True)
    sub.add_parser("send")
    sub.add_parser("ingest")
    sub.add_parser("followups")
    sub.add_parser("publish")
    sub.add_parser("cycle")
    sub.add_parser("check")
    mon = sub.add_parser("monitor"); mon.add_argument("--once", action="store_true")
    ctl = sub.add_parser("control")
    ctl.add_argument("--send", choices=["on", "off"]); ctl.add_argument("--autoreply", choices=["on", "off"])
    h = sub.add_parser("health"); h.add_argument("--deep", action="store_true", help="also ping LLM + Tavily")
    k = sub.add_parser("keys", help="save user-submitted keys (gitignored .state/keys.json)")
    k.add_argument("--llm-key"); k.add_argument("--llm-base-url"); k.add_argument("--llm-anthropic-base-url")
    k.add_argument("--llm-format", choices=["openai", "anthropic", "auto"]); k.add_argument("--llm-model")
    k.add_argument("--tavily-key")
    args = p.parse_args(argv)

    if args.cmd == "seed-memory":
        out = {"memories": agent.seed_memory(force=args.force)}
    elif args.cmd == "add":
        out = agent.add_prospect(args.email, args.name, args.firm, args.category,
                                 public=args.public, research_it=not args.no_research)
    elif args.cmd == "draft":
        out = agent.draft(args.email, args.kind)
    elif args.cmd == "drafts":
        out = agent.list_drafts()
    elif args.cmd == "approve":
        out = agent.approve(args.email)
    elif args.cmd == "send":
        out = agent.send_approved()
    elif args.cmd == "ingest":
        out = agent.ingest_replies()
    elif args.cmd == "followups":
        out = agent.followups()
    elif args.cmd == "publish":
        out = agent.export_public_log()
    elif args.cmd == "cycle":
        out = agent.run_cycle()
    elif args.cmd == "check":
        out = emailer.check_connectivity()
    elif args.cmd == "monitor":
        import monitor
        return monitor.main(["--once"] if args.once else [])
    elif args.cmd == "health":
        import health
        g = health.gather(deep=args.deep)
        path = health.write_public(g)
        icon = {"ok": "✅", "warn": "⚠️ ", "fail": "❌"}
        print(f"\n=== Outreach health — overall: {icon[g['overall']]} {g['overall'].upper()} ===\n")
        for c in g["checks"]:
            print(f"  {icon[c['status']]} {c['name']:<24} {c['detail']}")
        sw = g["switch"]
        print(f"\n  switch[{sw['source']}]: send={sw['send_enabled']} auto_reply={sw['auto_reply_enabled']}")
        print(f"  pipeline: {g['pipeline']}")
        print(f"\n  public status -> {path}")
        return 1 if g["overall"] == "fail" else 0
    elif args.cmd == "keys":
        import json as _json
        from pathlib import Path as _Path
        path = _Path(__file__).parent / ".state" / "keys.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        cur = {}
        if path.exists():
            cur = _json.loads(path.read_text())
        mapping = {"LLM_API_KEY": args.llm_key, "LLM_BASE_URL": args.llm_base_url,
                   "LLM_ANTHROPIC_BASE_URL": args.llm_anthropic_base_url,
                   "LLM_FORMAT": args.llm_format, "LLM_MODEL": args.llm_model,
                   "TAVILY_API_KEY": args.tavily_key}
        for kk, vv in mapping.items():
            if vv:
                cur[kk] = vv
        path.write_text(_json.dumps(cur, indent=2))
        out = {"saved": sorted(k for k, v in mapping.items() if v), "path": str(path),
               "note": "gitignored; overrides .env, not real env vars"}
    elif args.cmd == "control":
        import control
        if args.send or args.autoreply:
            control.set_local(
                send_enabled=(args.send == "on") if args.send else None,
                auto_reply_enabled=(args.autoreply == "on") if args.autoreply else None,
                by="cli")
        out = control.summary()
    else:
        out = {"error": "unknown command"}
    print(json.dumps(out, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
