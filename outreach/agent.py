#!/usr/bin/env python3
"""
The agentic outreach loop — research -> RAG-grounded draft -> human approval ->
send -> ingest replies -> classify -> schedule follow-up -> export a PUBLIC log.

Honesty is enforced, in keeping with the rest of this repo: drafts are grounded in
a RAG corpus built from the committed pitch/ and business/ docs, and the system
prompt forbids inventing traction, metrics, users, or partnerships. Sending is
human-gated and dry-run by default (see emailer.py).

Privacy: export_public_log() publishes only NON-PRIVATE metadata (dates, status,
follow-up counts, coarse reply classification). Names/firms appear only for contacts
explicitly marked public=True; everyone else is anonymized. No email addresses, no
message bodies, no secrets ever reach the public log.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path

import control
import emailer
import llm
import research
from config import cfg
from store import get_store

ROOT = Path(__file__).parent.parent
DAY = 86400

def _footer() -> str:
    """Mandatory disclosure on EVERY outbound message (cold + agentic replies)."""
    emails = cfg.HUMAN_EMAIL + (f" / {cfg.HUMAN_EMAIL_ALT}" if cfg.HUMAN_EMAIL_ALT else "")
    phone = f" · {cfg.HUMAN_PHONE}" if cfg.HUMAN_PHONE else ""
    return (
        f"\n\n—\n"
        f"Sent by an automated outreach agent on behalf of {cfg.HUMAN_NAME}. "
        f"Just reply and the agent will respond; if you'd prefer a human, reach "
        f"{cfg.HUMAN_NAME} directly: {emails}{phone}. "
        f"Reply STOP to opt out — you won't be contacted again."
    )


AUTO_REPLY_SYSTEM = """You are an automated agent replying to someone who replied to outreach about an \
OPEN-SOURCE oncology research tool ("an auditable evidence engine — compute or cite, never assert"), \
on behalf of the founder Bo Shang.

HARD RULES:
- Answer their actual question using ONLY the CONTEXT facts. Never invent traction, numbers, users, \
partnerships, dates, or availability. If you don't know, say so plainly.
- It is research software over PUBLIC data — NOT a cure, drug, or medical advice. Never imply otherwise.
- If they ask to meet, schedule, negotiate terms, or anything needing a human decision, DO NOT fabricate \
or commit to anything — say Bo will follow up personally and give his email (provided below). Append [ESCALATE].
- Be brief (90-140 words), specific, honest, and warm. No hype. Plain text. Do NOT add a signature or \
disclaimer (the system appends one). Return ONLY the reply body."""

DRAFT_SYSTEM = """You write concise, personalized investor outreach emails for the founder of an \
OPEN-SOURCE oncology research tool ("an auditable evidence engine — compute or cite, never assert").

HARD RULES (this project's whole point is not fabricating things):
- Use ONLY facts present in the CONTEXT. Never invent traction, revenue, users, metrics, \
partnerships, or endorsements. If you don't have a number, don't imply one.
- It is research software over PUBLIC data; it is NOT a cure, a drug, or medical advice. Never claim otherwise.
- Lead with the honest, differentiated wedge (re-verifiable provenance / auditability vs. black-box incumbents).
- 110-160 words. Specific to the recipient's known focus. One clear ask: a 20-minute intro call.
- Plain text. No hype, no superlatives, no fake urgency. Sign with the founder's name.
Return ONLY the email body (no subject line, no preamble)."""


def _retrieve(store, query: str, k_facts: int = 6) -> str:
    q = llm.embed(query)
    facts = store.search_memory(q, k=k_facts, kind="fact")
    return "\n".join(f"- {m['text']}" for m in facts)


# --------------------------------------------------------------------------- memory
def seed_memory(force: bool = False) -> int:
    """Load pitch/ + business/ + README into RAG memory as grounding facts."""
    store = get_store()
    if store.memory_count() and not force:
        return store.memory_count()
    sources = [ROOT / "pitch", ROOT / "business", ROOT / "README.md",
               ROOT / "docs" / "ANTI-HALLUCINATION.md"]
    n = 0
    for src in sources:
        files = sorted(src.rglob("*.md")) if src.is_dir() else ([src] if src.exists() else [])
        for f in files:
            for chunk in _chunks(f.read_text()):
                store.add_memory(chunk, llm.embed(chunk), source=str(f.relative_to(ROOT)), kind="fact")
                n += 1
    return n


def _chunks(text: str, size: int = 700) -> list[str]:
    paras, buf, out = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()], "", []
    for p in paras:
        if len(buf) + len(p) > size and buf:
            out.append(buf); buf = ""
        buf += ("\n\n" + p) if buf else p
    if buf:
        out.append(buf)
    return out


# --------------------------------------------------------------------------- prospects
def add_prospect(email: str, name: str = "", firm: str = "", category: str = "investor",
                 public: bool = False, research_it: bool = True) -> dict:
    store = get_store()
    profile = {}
    if research_it and cfg.TAVILY_API_KEY:
        try:
            profile = research.profile_prospect(name or email, firm)
            if profile.get("summary"):
                store.add_memory(f"{name or email} ({firm}): {profile['summary']}",
                                 llm.embed(profile["summary"]), source="tavily",
                                 kind=f"contact:{email}")
        except Exception as e:
            profile = {"error": str(e)}
    c = store.upsert_contact(email, name=name, firm=firm, category=category,
                             public=bool(public), status="researched" if profile else "new",
                             profile=profile, researched_at=time.time() if profile else 0)
    return c


def refresh_contacts(max_n: int = 3, stale_days: int = 14) -> list[dict]:
    """Keep the outreach list current from Tavily: (re)research contacts that lack a
    profile or have gone stale. (IMAP-driven updates — bounces -> invalid, replies ->
    status/follow-up — happen in process_inbox.) Bounded per call for rate limits."""
    store = get_store()
    if not cfg.TAVILY_API_KEY:
        return []
    out, now = [], time.time()
    for c in store.all_contacts():
        if len(out) >= max_n:
            break
        if c.get("invalid") or c.get("status") in ("unsubscribed", "bounced"):
            continue
        prof = (c.get("profile") or {}).get("summary")
        if prof and (now - c.get("researched_at", 0)) < stale_days * DAY:
            continue
        try:
            profile = research.profile_prospect(c.get("name") or c["email"], c.get("firm", ""))
        except Exception as e:
            out.append({"email": c["email"], "refresh": f"error: {e}"}); continue
        store.upsert_contact(c["email"], profile=profile, researched_at=now)
        if profile.get("summary"):
            store.add_memory(f"{c.get('name') or c['email']} ({c.get('firm','')}): {profile['summary']}",
                             llm.embed(profile["summary"]), source="tavily", kind=f"contact:{c['email']}")
        out.append({"email": c["email"], "refresh": "updated"})
    return out


# --------------------------------------------------------------------------- drafting
def draft(email: str, kind: str = "first_touch") -> dict:
    store = get_store()
    c = store.get_contact(email)
    if not c:
        raise SystemExit(f"Unknown contact {email}; add it first.")
    focus = f"{c.get('name','')} {c.get('firm','')} {c.get('category','')}".strip()
    context = _retrieve(store, f"investor outreach wedge for {focus}")
    prof = (c.get("profile") or {}).get("summary", "")
    history = store.interactions_for(email)
    hist_txt = "; ".join(f"{h['kind']}" for h in history) or "none"
    user = (f"Recipient: {c.get('name') or '(unknown)'} at {c.get('firm') or '(unknown firm)'} "
            f"({c.get('category')}).\nWhat we know about them (a lead, verify): {prof or 'little'}\n"
            f"Prior touches: {hist_txt}\nDraft type: {kind}.\nSign the email as: {cfg.HUMAN_NAME}.\n"
            f"\nCONTEXT (facts you may use):\n{context}")
    try:
        body = llm.chat([{"role": "system", "content": DRAFT_SYSTEM},
                         {"role": "user", "content": user}], temperature=0.5)
    except Exception as e:
        return {"error": f"LLM draft failed: {e}"}
    body = body.strip() + _footer()
    subject = _subject(c, kind)
    store.add_interaction(email, "draft", subject=subject, body=body, kind_of=kind, approved=False)
    store.set_status(email, "drafted")
    return {"email": email, "subject": subject, "body": body}


def _subject(c: dict, kind: str) -> str:
    base = "Auditable, re-verifiable oncology evidence triage (open source)"
    if kind == "followup":
        return f"Re: {base}"
    return base


def list_drafts(only_pending: bool = True) -> list[dict]:
    store = get_store()
    out = []
    for c in store.all_contacts():
        for i in store.interactions_for(c["email"]):
            if i["kind"] == "draft" and (not only_pending or not i.get("approved")):
                out.append({"email": c["email"], "subject": i.get("subject"),
                            "approved": i.get("approved", False), "ts": i["ts"],
                            "preview": (i.get("body", "")[:160])})
    return out


def approve(email: str) -> dict:
    """Human gate: mark the latest draft approved-to-send."""
    store = get_store()
    drafts = [i for i in store.interactions_for(email) if i["kind"] == "draft"]
    if not drafts:
        return {"error": "no draft to approve"}
    store.set_status(email, "approved")
    store.upsert_contact(email, approved_draft=drafts[-1])
    return {"email": email, "approved": True}


# --------------------------------------------------------------------------- sending
def send_approved() -> list[dict]:
    """Send human-approved drafts, respecting dry-run, daily cap and min interval."""
    store = get_store()
    results = []
    sent_today = store.touches_today()
    for c in store.all_contacts():
        if c.get("status") != "approved":
            continue
        if sent_today >= cfg.DAILY_SEND_CAP:
            results.append({"email": c["email"], "skipped": "daily cap reached"}); continue
        last = c.get("last_touch", 0)
        if last and (time.time() - last) < cfg.MIN_HOURS_BETWEEN_TOUCHES * 3600:
            results.append({"email": c["email"], "skipped": "min interval not elapsed"}); continue
        d = c.get("approved_draft") or {}
        res = emailer.send(c["email"], d.get("subject", ""), d.get("body", ""), force=True)
        store.add_interaction(c["email"], "sent", subject=d.get("subject"),
                              dry_run=res.get("dry_run", True))
        store.record_touch(c["email"])
        store.set_status(c["email"], "contacted")
        store.upsert_contact(c["email"], next_followup=time.time() + 5 * DAY)
        if res.get("sent"):
            sent_today += 1
        results.append({"email": c["email"], **res})
    return results


# --------------------------------------------------------------------------- replies
def process_inbox(max_msgs: int = 25) -> list[dict]:
    """Handle new mail: bounces -> mark invalid; replies -> classify + agentic respond.
    This is what the 24/7 monitor and the scheduled cycle both call."""
    store = get_store()
    by_addr = {c["email"].lower(): c for c in store.all_contacts()}
    out = []
    try:
        msgs = emailer.fetch_unseen(limit=max_msgs)
    except Exception as e:
        return [{"error": f"IMAP fetch failed: {e}"}]

    for msg in msgs:
        frm = (msg.get("from") or "").lower()

        # 1) Bounce / non-delivery report -> mark the failed address invalid, stop contacting.
        if msg.get("is_bounce"):
            target = (msg.get("failed_recipient") or "").lower()
            c = by_addr.get(target) or by_addr.get(frm)
            if c:
                store.add_interaction(c["email"], "bounce", failed=target or c["email"])
                store.set_status(c["email"], "bounced")
                store.upsert_contact(c["email"], invalid=True, next_followup=0)
                out.append({"email": c["email"], "event": "bounce"})
            else:
                out.append({"event": "bounce", "unmatched": target})
            continue

        # 2) Only engage replies from people we actually contacted (don't reply to strangers/spam).
        c = by_addr.get(frm)
        if not c:
            continue
        if msg.get("auto_submitted"):                 # vacation responders etc. — log, don't loop
            store.add_interaction(c["email"], "auto_received", subject=msg.get("subject"))
            continue

        label = _classify(msg.get("body", ""))
        store.add_interaction(c["email"], "reply", subject=msg.get("subject"),
                              classification=label, message_id=msg.get("message_id"))
        store.set_status(c["email"], f"replied:{label}")
        store.upsert_contact(c["email"], next_followup=0)

        if label == "unsubscribe":
            store.set_status(c["email"], "unsubscribed")
            store.upsert_contact(c["email"], invalid=True)
            out.append({"email": c["email"], "classification": label})
            continue
        if label == "out_of_office":
            out.append({"email": c["email"], "classification": label})
            continue

        out.append({"email": c["email"], "classification": label,
                    **_agentic_reply(store, c, msg, label)})
    return out


# Backwards-compatible alias.
def ingest_replies() -> list[dict]:
    return process_inbox()


def _agentic_reply(store, c: dict, msg: dict, label: str) -> dict:
    """Generate (and, if enabled, send) an honest agentic reply. Escalates to a human
    for anything requiring a decision; never fabricates."""
    prior = sum(1 for i in store.interactions_for(c["email"]) if i["kind"] in ("auto_reply_sent",))
    if prior >= cfg.MAX_AUTO_REPLIES_PER_CONTACT:
        store.upsert_contact(c["email"], needs_human=True)
        return {"auto_reply": "skipped (max auto-replies reached) -> needs human"}

    context = _retrieve(store, f"reply to investor about: {msg.get('subject','')} {msg.get('body','')[:300]}")
    user = (f"They wrote (from {c.get('name') or c['email']} at {c.get('firm') or '?'}, "
            f"classified '{label}'):\n\"\"\"\n{msg.get('body','')[:1500]}\n\"\"\"\n\n"
            f"Bo's email for escalation: {cfg.HUMAN_EMAIL}\n\nCONTEXT (facts you may use):\n{context}")
    try:
        body = llm.chat([{"role": "system", "content": AUTO_REPLY_SYSTEM},
                         {"role": "user", "content": user}], temperature=0.4)
    except Exception as e:
        store.upsert_contact(c["email"], needs_human=True)
        return {"auto_reply": f"draft failed -> needs human: {e}"}

    escalate = "[ESCALATE]" in body or label in ("meeting_request",)
    body = body.replace("[ESCALATE]", "").strip() + _footer()
    subject = "Re: " + re.sub(r"^(re:\s*)+", "", msg.get("subject", ""), flags=re.I).strip()
    if escalate:
        store.upsert_contact(c["email"], needs_human=True)

    if control.effective_send_enabled() and control.effective_auto_reply_enabled():
        res = emailer.send(c["email"], subject, body, force=True,
                           in_reply_to=msg.get("message_id", ""),
                           references=msg.get("references", ""), auto_reply=True)
        store.add_interaction(c["email"], "auto_reply_sent", subject=subject,
                              dry_run=res.get("dry_run", True), escalated=escalate)
        store.record_touch(c["email"])
        return {"auto_reply": "sent" if res.get("sent") else "dry-run", "escalated": escalate}
    store.add_interaction(c["email"], "auto_reply_draft", subject=subject, body=body, escalated=escalate)
    return {"auto_reply": "drafted (auto-reply disabled)", "escalated": escalate}


def _classify(body: str) -> str:
    """Coarse intent label for a reply (one of a fixed set)."""
    labels = "interested, meeting_request, question, not_interested, out_of_office, unsubscribe, other"
    try:
        r = llm.chat([
            {"role": "system", "content": f"Classify this email reply as exactly one of: {labels}. "
                                          "Return ONLY the label."},
            {"role": "user", "content": body[:2000]},
        ], temperature=0.0, max_tokens=8)
        tok = re.sub(r"[^a-z_]", "", r.strip().lower())
        return tok if tok in labels else "other"
    except Exception:
        low = body.lower()
        if "unsubscribe" in low or "stop" in low:
            return "unsubscribe"
        return "other"


def followups() -> list[dict]:
    """Draft (not send) follow-ups for contacts who were emailed but haven't replied."""
    store = get_store()
    out = []
    for c in store.all_contacts():
        if c.get("status") == "contacted" and 0 < c.get("next_followup", 0) <= time.time():
            d = draft(c["email"], kind="followup")
            store.upsert_contact(c["email"], next_followup=time.time() + 7 * DAY)
            out.append({"email": c["email"], "drafted_followup": "error" not in d})
    return out


# --------------------------------------------------------------------------- public log
def export_public_log(path: str | None = None) -> dict:
    """Write a privacy-redacted, public-safe outreach history for the website.

    Publishes ONLY non-private metadata. Names/firms appear only for contacts marked
    public=True; otherwise they're anonymized. No email addresses, no message bodies."""
    store = get_store()
    out_path = Path(path) if path else (ROOT / "web" / "public" / "data" / "outreach" / "log.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    entries, totals = [], {"contacted": 0, "replied": 0, "interested": 0, "bounced": 0}
    shown = ("sent", "reply", "bounce", "auto_reply_sent")
    for c in sorted(store.all_contacts(), key=lambda x: x.get("created", 0)):
        ints = sorted(store.interactions_for(c["email"]), key=lambda i: i["ts"])
        sent = [i for i in ints if i["kind"] == "sent"]
        replies = [i for i in ints if i["kind"] == "reply"]
        if not sent and c.get("status") not in ("approved",):
            continue  # only log things that actually reached the send stage
        public = bool(c.get("public"))
        anon_id = "INV-" + hashlib.sha256(c["email"].encode()).hexdigest()[:6].upper()
        timeline = [{"date": _date(i["ts"]),
                     "event": i["kind"],
                     "label": i.get("classification") or ("dry-run" if i.get("dry_run") else "")}
                    for i in ints if i["kind"] in shown]
        if sent:
            totals["contacted"] += 1
        if replies:
            totals["replied"] += 1
        if any(r.get("classification") in ("interested", "meeting_request") for r in replies):
            totals["interested"] += 1
        if c.get("status") == "bounced" or c.get("invalid"):
            totals["bounced"] += 1
        entries.append({
            "id": anon_id,
            "name": c.get("name") if public else None,
            "firm": c.get("firm") if public else None,
            "category": c.get("category", "investor"),
            "status": c.get("status", "new"),
            "first_contacted": _date(sent[0]["ts"]) if sent else None,
            "last_update": _date(ints[-1]["ts"]) if ints else None,
            "touches": len(sent),
            "replied": bool(replies),
            "public_note": c.get("public_note") if public else None,
            "timeline": timeline,
        })
    payload = {
        "generated": _date(time.time()),
        "note": "Public, privacy-redacted outreach log. Names shown only with consent; "
                "no email addresses or message contents are published. Counts are real.",
        "totals": {**totals, "in_pipeline": len(entries)},
        "entries": entries,
    }
    out_path.write_text(json.dumps(payload, indent=2))
    return {"path": str(out_path), "entries": len(entries), "totals": payload["totals"]}


def _date(ts: float) -> str:
    return time.strftime("%Y-%m-%d", time.gmtime(ts))


# --------------------------------------------------------------------------- cycle
def run_cycle() -> dict:
    """The scheduled action (Lambda/EventBridge): ingest -> follow-up -> send -> publish."""
    return {
        "replies": process_inbox(),
        "followups": followups(),
        "sent": send_approved(),
        "refreshed": refresh_contacts(),
        "public_log": export_public_log(),
    }
