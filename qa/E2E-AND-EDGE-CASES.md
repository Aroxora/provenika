# Outreach agent — E2E testing & edge-case handling

How the outreach system is tested end-to-end and how each failure/edge case is caught.
The suite is **safe by construction**: a throwaway temp store, sending forced OFF, IMAP/SMTP and
(by default) LLM/Tavily mocked, outbox redirected to a temp dir — it can never send a real email.

```bash
python3 outreach/test_e2e.py          # offline, deterministic — 33 checks (CI-safe)
python3 outreach/test_e2e.py --deep   # + real DeepSeek & Tavily pings — 35 checks
```
**Latest run: 33/33 offline, 35/35 deep (real keys) — all green.**

## How the pipeline works (recap)

`research (Tavily) → RAG-grounded draft (LLM) → human approval → send (SMTP) → ingest+classify
replies (IMAP) → agentic reply / follow-up → public log + status`. Sending is gated by a control
switch (website Firestore doc → local file → .env) read live by the 24/7 monitor.

## Scenarios & edge cases covered

| # | Scenario / edge case | How it's caught / handled | Test |
|---|----------------------|---------------------------|------|
| 1 | **Disclosure** on every email | `_footer()` always appends "automated agent on behalf of Bo Shang", both emails, phone, STOP | `test_footer_disclosure` |
| 2 | **Send gate** | `emailer.send` dry-runs (writes outbox) unless `control.effective_send_enabled()` AND `force` — so OFF means nothing leaves, even if code calls send with force | `test_control_precedence_and_gate` |
| 3 | **Control precedence** | Firestore doc → local `control.json` → `.env`; website OFF overrides env ON | same |
| 4 | **Bounce / NDR** | `_analyze_bounce` flags mailer-daemon / `multipart/report` / failure subjects and extracts the DSN `Final-Recipient`; that contact is marked `invalid` + `bounced`, follow-ups stop | `test_bounce_parser`, `test_process_inbox_scenarios` |
| 5 | **Unknown sender** (spam / not a contact) | `process_inbox` only engages addresses already in the store; strangers are ignored (no auto-reply to randoms) | `test_process_inbox_scenarios` |
| 6 | **Auto-responder loop** | inbound `Auto-Submitted` is logged, never replied to; our replies set `Auto-Submitted: auto-replied` (RFC 3834) | `test_process_inbox_scenarios` |
| 7 | **Unsubscribe / STOP** | classified → status `unsubscribed`, marked `invalid`, never contacted again | `test_unsubscribe` |
| 8 | **Runaway auto-replies** | `MAX_AUTO_REPLIES_PER_CONTACT` cap → stops and escalates (`needs_human`) instead of looping | `test_auto_reply_cap` |
| 9 | **Escalation** | meeting/decision asks or `[ESCALATE]` → defers to the human (bo@shang.software), no fabricated commitments | `_agentic_reply` (covered via cap/draft paths) |
| 10 | **Approved-only cold send** | `send_approved` only sends contacts the human set to `approved`; dry-run proves nothing leaves with switch OFF | `test_send_approved_dry_run_and_log` |
| 11 | **Public-log redaction** | no email addresses, no message bodies, no secrets; names only when `public=true`, else `INV-xxxxxx` | `test_send_approved_dry_run_and_log`, `test_redaction_anonymous` |
| 12 | **Store integrity** | `get_store()` is a process singleton + atomic writes (`os.replace`) — divergent copies can't clobber each other | `test_store_singleton` |
| 13 | **Health/status** | `health.gather` reports every dependency; `to_public` redacts operator detail; monitor liveness via heartbeat | `test_health_structure` |
| 14 | **Missing/!bad LLM key** | `llm.chat` raises (never silently fabricates); health flags it; drafting returns an error, not a made-up email | `test_missing_llm_key` |
| 15 | **Real keys reachable** | live DeepSeek chat + Tavily search succeed (deep mode) | `test_deep_real_keys` |

## Why these are the right edge cases

The whole repo's thesis is *don't fabricate, don't act irreversibly without a human*. The outreach
agent inherits both: it can't invent recipient addresses (forms/intros vs verified public inboxes are
explicit — see [`../pitch/TARGET-LIST.md`](../pitch/TARGET-LIST.md)), it can't send without an explicit
human switch + per-message approval for cold mail, it can't loop on auto-responders or spam, and it
never publishes private data. Bounces and unsubscribes prune the list automatically so it stays clean.

## What is NOT auto-tested here (do manually before relying on it)
- Real external **delivery** (we verified a self-send SMTP→IMAP round-trip once; we don't auto-send to third parties).
- Firestore **website→monitor** control path end-to-end (needs `firestore.rules` deployed; `health` shows its state).
- Long-run monitor stability (the launchd daemon; `outreach/.state/monitor.log` + `/status` show liveness).

## Running in CI
`test_e2e.py` (offline) is deterministic and network-free — safe to add to the `cad-tools`/Python CI job
alongside `cad/test_provenance.py`.
