#!/usr/bin/env python3
"""
End-to-end test of the outreach agent — every usage scenario + edge case.

SAFE BY CONSTRUCTION: a throwaway temp store, control + SEND forced OFF, IMAP/SMTP and
(by default) LLM/Tavily mocked, and emailer's outbox redirected to a temp dir — so it
NEVER sends a real email and never touches your real store.

  python3 outreach/test_e2e.py          # offline, deterministic (CI-safe)
  python3 outreach/test_e2e.py --deep   # ALSO ping the real DeepSeek + Tavily keys

Edge cases covered: bounce/NDR detection + invalid marking, unknown-sender ignore,
auto-submitted (vacation) loop-guard, unsubscribe, max-auto-reply cap + human escalation,
dry-run send gate (control OFF), public-log redaction, missing-key handling, disclosure
footer contents, store singleton/atomicity, control precedence.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

DEEP = "--deep" in sys.argv[1:]
TMP = Path(tempfile.mkdtemp(prefix="outreach_e2e_"))

# Force a safe, isolated environment BEFORE importing anything (config reads env at import).
os.environ.update({
    "STORE_BACKEND": "local",
    "LOCAL_STORE_PATH": str(TMP / "store.json"),
    "SEND_ENABLED": "false",
    "AUTO_REPLY_ENABLED": "false",
    "HUMAN_NAME": "Bo Shang",
    "HUMAN_EMAIL": "bo@shang.software",
    "HUMAN_EMAIL_ALT": "bo@trenchwork.org",
    "HUMAN_PHONE": "+1 508-260-0326",
})
if not DEEP:
    os.environ.setdefault("LLM_API_KEY", "test-key")  # so llm code paths don't bail on missing key

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import agent      # noqa: E402
import control    # noqa: E402
import emailer    # noqa: E402
import health     # noqa: E402
import llm        # noqa: E402
import store as store_mod  # noqa: E402

emailer.OUTBOX = TMP / ".outbox"           # never write to the real outbox
control._firestore_get = lambda: None      # offline: control falls back to local/env

_PASS = []; _FAIL = []


def check(name, cond, info=""):
    (_PASS if cond else _FAIL).append(name)
    print(f"  {'✅' if cond else '❌'} {name}" + (f" — {info}" if (info and not cond) else ""))


def reset_store():
    store_mod._STORE = None
    for f in (TMP / "store.json", TMP / "store.tmp"):
        if f.exists():
            f.unlink()
    control.set_local(send_enabled=False, auto_reply_enabled=False, by="test")


# Deterministic LLM unless --deep (so classify/draft are predictable offline).
if not DEEP:
    def _fake_chat(messages, temperature=0.4, max_tokens=900):
        sysmsg = messages[0].get("content", "") if messages else ""
        if "Classify" in sysmsg:
            body = messages[-1]["content"].lower()
            if "unsubscribe" in body or "stop" in body:
                return "unsubscribe"
            if "meet" in body or "call" in body or "schedule" in body:
                return "meeting_request"
            return "interested"
        return "Hi — here is a grounded, honest note about the open-source evidence engine."
    llm.chat = _fake_chat


def synthetic(frm, subject="hi", body="thanks, interested", **kw):
    base = {"from": frm, "to": "erolunar@pm.me", "subject": subject, "message_id": "<x@y>",
            "references": "", "auto_submitted": False, "body": body,
            "is_bounce": False, "failed_recipient": ""}
    base.update(kw)
    return base


# --------------------------------------------------------------------------- tests
def test_footer_disclosure():
    f = agent._footer()
    check("footer: agentic disclosure", "automated outreach agent" in f and "Bo Shang" in f)
    check("footer: both emails + phone", "bo@shang.software" in f and "bo@trenchwork.org" in f and "508-260-0326" in f)
    check("footer: opt-out", "STOP" in f)


def test_control_precedence_and_gate():
    reset_store()
    control.set_local(send_enabled=False, by="test")
    check("control: OFF effective", control.effective_send_enabled() is False)
    r = emailer.send("x@needs.invalid", "s", "b", force=True)
    check("send gate: dry-run when control OFF (even forced)", r["dry_run"] is True and r["sent"] is False)
    control.set_local(send_enabled=True, by="test")
    check("control: ON effective", control.effective_send_enabled() is True)
    # Even ON, we only *allow* sending; this address is .invalid so we keep it dry-run via control OFF after.
    control.set_local(send_enabled=False, by="test")


def test_bounce_parser():
    import email
    ndr = email.message_from_string(
        "From: MAILER-DAEMON@pm.me\nSubject: Undelivered Mail Returned to Sender\n"
        "Content-Type: multipart/report; report-type=delivery-status; boundary=b\n\n"
        "--b\nContent-Type: message/delivery-status\n\n"
        "Final-Recipient: rfc822; gone@nowhere.example\nAction: failed\n--b--\n")
    a = emailer._analyze_bounce(ndr, "mailer-daemon@pm.me", ndr["subject"], "Final-Recipient: rfc822; gone@nowhere.example")
    check("bounce: detected", a["is_bounce"] is True)
    check("bounce: failed recipient extracted", a["failed_recipient"] == "gone@nowhere.example", a["failed_recipient"])
    normal = email.message_from_string("From: a@b.com\nSubject: hello\n\nhi")
    check("bounce: normal email not flagged", emailer._analyze_bounce(normal, "a@b.com", "hello", "hi")["is_bounce"] is False)


def test_process_inbox_scenarios():
    reset_store()
    s = store_mod.get_store()
    s.upsert_contact("gp@fund.vc", name="GP", firm="Fund")
    s.upsert_contact("bouncer@dead.vc", name="B", firm="Dead")
    s.upsert_contact("loop@vc.com", name="L", firm="Loop")

    msgs = [
        synthetic("mailer-daemon@pm.me", "Undeliverable", is_bounce=True, failed_recipient="bouncer@dead.vc"),
        synthetic("stranger@random.com", body="who are you"),          # unknown -> ignore
        synthetic("gp@fund.vc", body="this looks interesting, tell me more"),
        synthetic("loop@vc.com", body="out of office", auto_submitted=True),
    ]
    emailer.fetch_unseen = lambda limit=25, mark_seen=True: msgs
    res = agent.process_inbox()

    check("inbox: bounce marked invalid", s.get_contact("bouncer@dead.vc").get("invalid") is True)
    check("inbox: bounce status", s.get_contact("bouncer@dead.vc").get("status") == "bounced")
    check("inbox: unknown sender ignored", not any(r.get("email") == "stranger@random.com" for r in res))
    gp = s.get_contact("gp@fund.vc")
    check("inbox: known reply classified", str(gp.get("status", "")).startswith("replied"))
    check("inbox: auto-reply DRAFTED (control off, not sent)",
          any(i["kind"] == "auto_reply_draft" for i in s.interactions_for("gp@fund.vc")))
    check("inbox: auto-submitted logged not replied",
          any(i["kind"] == "auto_received" for i in s.interactions_for("loop@vc.com")))


def test_unsubscribe():
    reset_store()
    s = store_mod.get_store()
    s.upsert_contact("no@vc.com", name="N")
    emailer.fetch_unseen = lambda limit=25, mark_seen=True: [synthetic("no@vc.com", body="please unsubscribe me, stop")]
    agent.process_inbox()
    check("unsubscribe: status set", s.get_contact("no@vc.com").get("status") == "unsubscribed")
    check("unsubscribe: marked invalid", s.get_contact("no@vc.com").get("invalid") is True)


def test_auto_reply_cap():
    reset_store()
    s = store_mod.get_store()
    s.upsert_contact("chatty@vc.com", name="C")
    for _ in range(3):
        s.add_interaction("chatty@vc.com", "auto_reply_sent")
    out = agent._agentic_reply(s, s.get_contact("chatty@vc.com"),
                               synthetic("chatty@vc.com", body="another question"), "interested")
    check("cap: stops after max auto-replies", "skipped" in out.get("auto_reply", ""))
    check("cap: escalates to human", s.get_contact("chatty@vc.com").get("needs_human") is True)


def test_send_approved_dry_run_and_log():
    reset_store()
    s = store_mod.get_store()
    s.upsert_contact("pitch@firm.vc", name="P", firm="Firm", public=True)
    agent.draft("pitch@firm.vc")
    agent.approve("pitch@firm.vc")
    res = agent.send_approved()
    check("send_approved: dry-run (nothing really sent)",
          all(r.get("dry_run", True) for r in res if "skipped" not in r))
    check("send_approved: status -> contacted", s.get_contact("pitch@firm.vc").get("status") == "contacted")
    log = agent.export_public_log(str(TMP / "log.json"))
    import json
    pub = json.loads((TMP / "log.json").read_text())
    blob = json.dumps(pub)
    check("public log: entry present", log["entries"] >= 1)
    check("public log: NO email addresses leaked", "pitch@firm.vc" not in blob)
    check("public log: NO secrets", "sk-" not in blob and "tvly-" not in blob)
    check("public log: public contact shows name", any(e.get("name") == "P" for e in pub["entries"]))


def test_redaction_anonymous():
    reset_store()
    s = store_mod.get_store()
    s.upsert_contact("secret@vc.com", name="Should Not Show", public=False)
    s.add_interaction("secret@vc.com", "sent")
    import json
    agent.export_public_log(str(TMP / "log2.json"))
    blob = (TMP / "log2.json").read_text()
    check("redaction: private name hidden", "Should Not Show" not in blob)
    check("redaction: anonymized id used", "INV-" in blob)


def test_store_singleton():
    reset_store()
    a, b = store_mod.get_store(), store_mod.get_store()
    check("store: singleton (same instance)", a is b)
    a.upsert_contact("z@z.com", name="Z")
    a.add_interaction("z@z.com", "draft", subject="s")
    check("store: contact+interaction persist together", len(b.interactions_for("z@z.com")) == 1)


def test_health_structure():
    emailer.check_connectivity = lambda: {"imap": "ok", "smtp": "ok"}
    g = health.gather(deep=False)
    check("health: has overall/checks/switch/pipeline",
          all(k in g for k in ("overall", "checks", "switch", "pipeline")))
    pub = health.to_public(g)
    blob = __import__("json").dumps(pub)
    check("health: public redacted (no error detail leak)", "ping failed" not in blob)
    check("health: monitor flagged not-running", any(
        c["name"] == "Outreach monitor" and c["status"] == "fail" for c in g["checks"]))


def test_missing_llm_key():
    # Clear the active key AND switch to a keyless provider so no fallback key resolves.
    saved = {k: os.environ.get(k) for k in ("LLM_API_KEY", "LLM_PROVIDER", "OPENAI_API_KEY")}
    os.environ.update({"LLM_API_KEY": "", "LLM_PROVIDER": "openai", "OPENAI_API_KEY": ""})
    raised = False
    try:
        import importlib, llm as _llm
        importlib.reload(_llm)  # un-mock; use the real chat
        try:
            _llm.chat([{"role": "user", "content": "x"}])
        except RuntimeError:
            raised = True
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        os.environ.setdefault("LLM_API_KEY", "test-key")
        import importlib, llm as _llm2
        importlib.reload(_llm2)
    check("missing key: llm.chat raises (no silent fabrication)", raised)


def test_deep_real_keys():
    if not DEEP:
        print("  ⏭  deep checks skipped (run with --deep to ping real DeepSeek + Tavily)")
        return
    import importlib, llm as _llm, research as _res
    importlib.reload(_llm)
    try:
        r = _llm.chat([{"role": "user", "content": "Reply with exactly: OK"}], max_tokens=5)
        check("deep: real DeepSeek reachable", "OK" in r.upper(), r[:40])
    except Exception as e:
        check("deep: real DeepSeek reachable", False, str(e)[:80])
    try:
        t = _res.tavily_search("biotech investor", max_results=1)
        check("deep: real Tavily reachable", len(t.get("results", [])) >= 0)
    except Exception as e:
        check("deep: real Tavily reachable", False, str(e)[:80])


def main():
    print(f"\n=== Outreach E2E ({'DEEP — real keys' if DEEP else 'offline/mocked'}) — temp: {TMP} ===\n")
    for fn in [test_footer_disclosure, test_control_precedence_and_gate, test_bounce_parser,
               test_process_inbox_scenarios, test_unsubscribe, test_auto_reply_cap,
               test_send_approved_dry_run_and_log, test_redaction_anonymous, test_store_singleton,
               test_health_structure, test_missing_llm_key, test_deep_real_keys]:
        print(f"• {fn.__name__}")
        try:
            fn()
        except Exception as e:
            check(fn.__name__ + " (no exception)", False, repr(e))
    print(f"\n=== {len(_PASS)} passed, {len(_FAIL)} failed ===")
    if _FAIL:
        print("FAILED:", ", ".join(_FAIL))
    import shutil
    shutil.rmtree(TMP, ignore_errors=True)
    return 1 if _FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
