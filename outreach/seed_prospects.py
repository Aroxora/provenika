#!/usr/bin/env python3
"""
Seed the outreach store from prospects.seed.json and pre-draft (UNSENT) emails.

Only prospects whose genuine channel is a public intake inbox (`email` set) become
email contacts with a draft. Form/grant/intro targets are left to apply via their
link (see pitch/TARGET-LIST.md) — emailing them would be the wrong channel.

Drafts are NOT sent. Going live still requires you to review, `approve`, and flip the
control switch. Run:  python3 outreach/seed_prospects.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import agent
from store import get_store


def main() -> int:
    data = json.loads((HERE / "prospects.seed.json").read_text())
    store = get_store()
    agent.seed_memory()  # ensure RAG grounding exists

    seeded, skipped = [], []
    for p in data["prospects"]:
        if not p.get("email"):
            skipped.append(f"{p['firm']} (channel: {p['channel']} -> {p['apply']})")
            continue
        store.upsert_contact(
            p["email"], name=p.get("partner") or p["firm"], firm=p["firm"],
            category=p["category"], public=False,
            profile={"summary": p.get("fit", ""), "sources": [{"title": p["firm"], "url": p.get("source", "")}]},
            priority=p.get("priority"), channel=p["channel"], apply_url=p.get("apply"))
        d = agent.draft(p["email"], kind="first_touch")
        seeded.append({"firm": p["firm"], "email": p["email"], "drafted": "error" not in d})

    print(json.dumps({
        "seeded_email_drafts": seeded,
        "apply_via_form_or_intro": skipped,
        "next": "Review drafts: python3 outreach/cli.py drafts | approve: cli.py approve --email <e> "
                "| go live: set control switch ON (website Admin) and cli.py send",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
