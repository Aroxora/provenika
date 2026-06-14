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
    else:
        out = {"error": "unknown command"}
    print(json.dumps(out, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
