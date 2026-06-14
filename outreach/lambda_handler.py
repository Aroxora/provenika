#!/usr/bin/env python3
"""
AWS Lambda entrypoint. Dispatches on event["action"].

EventBridge schedule -> {"action": "run_cycle"} runs the daily loop (ingest replies,
draft follow-ups, send APPROVED drafts within caps, publish the public log).

Secrets come from the Lambda environment (wire them from AWS Secrets Manager / SSM
in template.yaml). Nothing here ever sends unless SEND_ENABLED=true AND a draft was
human-approved. See README.md.
"""

from __future__ import annotations

import json

import agent


def handler(event, context=None):
    action = (event or {}).get("action", "run_cycle")
    args = (event or {}).get("args", {})
    fn = {
        "run_cycle": lambda: agent.run_cycle(),
        "ingest_replies": lambda: agent.ingest_replies(),
        "followups": lambda: agent.followups(),
        "send_approved": lambda: agent.send_approved(),
        "export_public_log": lambda: agent.export_public_log(),
        "seed_memory": lambda: {"memories": agent.seed_memory(force=args.get("force", False))},
        "add_prospect": lambda: agent.add_prospect(**args),
        "draft": lambda: agent.draft(args["email"], args.get("kind", "first_touch")),
        "approve": lambda: agent.approve(args["email"]),
    }.get(action)
    if not fn:
        return {"statusCode": 400, "body": json.dumps({"error": f"unknown action {action}"})}
    return {"statusCode": 200, "body": json.dumps(fn(), default=str)}


if __name__ == "__main__":  # local: python lambda_handler.py '{"action":"run_cycle"}'
    import sys
    evt = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {"action": "run_cycle"}
    print(handler(evt))
