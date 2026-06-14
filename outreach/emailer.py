#!/usr/bin/env python3
"""
Email I/O via Proton Bridge (or any IMAP/SMTP), stdlib only.

SAFETY FIRST:
  * Sending is OFF by default. With SEND_ENABLED=false (the default), send() writes
    the message to outreach/.outbox/ and returns dry_run=True — nothing leaves the box.
  * Even when enabled, send() refuses past the daily cap / minimum interval (enforced
    by the caller via the store) and only ever sends human-APPROVED drafts.
Proton Bridge listens on 127.0.0.1 with a self-signed cert, so TLS verification is
relaxed for localhost only (documented; do not point this at a remote host as-is).
"""

from __future__ import annotations

import email
import imaplib
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import parseaddr
from pathlib import Path

from config import cfg

OUTBOX = Path(__file__).parent / ".outbox"


def _ctx(host: str) -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    if host in ("127.0.0.1", "localhost", "::1"):       # Proton Bridge self-signed cert
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return ctx


def send(to_email: str, subject: str, body: str, *, force: bool = False,
         in_reply_to: str = "", references: str = "", auto_reply: bool = False) -> dict:
    """Send (or dry-run) one plain-text email. Returns {sent, dry_run, path?}."""
    msg = EmailMessage()
    msg["From"] = f"{cfg.FROM_NAME} <{cfg.FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if cfg.REPLY_TO:
        msg["Reply-To"] = cfg.REPLY_TO
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
        msg["References"] = references or in_reply_to
    if auto_reply:
        msg["Auto-Submitted"] = "auto-replied"   # RFC 3834: prevents auto-responder loops
    msg.set_content(body)

    import control  # local import avoids any import cycle
    if not (control.effective_send_enabled() and force):
        OUTBOX.mkdir(parents=True, exist_ok=True)
        p = OUTBOX / f"{int(time.time())}_{to_email.replace('@', '_at_')}.eml"
        p.write_text(msg.as_string())
        return {"sent": False, "dry_run": True, "path": str(p),
                "reason": "sending disabled (control switch / SEND_ENABLED off) — wrote to outbox"}

    host, port = cfg.SMTP_HOST, cfg.SMTP_PORT
    if cfg.SMTP_SECURITY == "SSL":
        with smtplib.SMTP_SSL(host, port, context=_ctx(host), timeout=30) as s:
            if cfg.SMTP_USER:
                s.login(cfg.SMTP_USER, cfg.SMTP_PASS)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as s:
            if cfg.SMTP_SECURITY == "STARTTLS":
                s.starttls(context=_ctx(host))
            if cfg.SMTP_USER:
                s.login(cfg.SMTP_USER, cfg.SMTP_PASS)
            s.send_message(msg)
    return {"sent": True, "dry_run": False, "to": to_email}


def notify(subject: str, body: str, *, force: bool = False) -> dict:
    """Send an operational UPDATE email to NOTIFY_EMAIL (bo@shang.software by default).
    Same gating as send(): dry-runs to the outbox unless sending is enabled. Use for
    deploy/health/reply alerts — not for prospect outreach."""
    return send(cfg.NOTIFY_EMAIL, f"[Provenika] {subject}", body, force=force)


def _imap_connect() -> imaplib.IMAP4:
    host, port = cfg.IMAP_HOST, cfg.IMAP_PORT
    if cfg.IMAP_SECURITY == "SSL":
        m = imaplib.IMAP4_SSL(host, port, ssl_context=_ctx(host))
    else:
        m = imaplib.IMAP4(host, port)
        if cfg.IMAP_SECURITY == "STARTTLS":
            m.starttls(ssl_context=_ctx(host))
    m.login(cfg.IMAP_USER, cfg.IMAP_PASS)
    return m


def check_connectivity() -> dict:
    """Login to SMTP + IMAP and disconnect — validates creds WITHOUT sending."""
    out = {"imap": "?", "smtp": "?"}
    try:
        m = _imap_connect(); m.select("INBOX"); m.logout(); out["imap"] = "ok"
    except Exception as e:
        out["imap"] = f"error: {e}"
    try:
        host = cfg.SMTP_HOST
        if cfg.SMTP_SECURITY == "SSL":
            s = smtplib.SMTP_SSL(host, cfg.SMTP_PORT, context=_ctx(host), timeout=15)
        else:
            s = smtplib.SMTP(host, cfg.SMTP_PORT, timeout=15)
            if cfg.SMTP_SECURITY == "STARTTLS":
                s.starttls(context=_ctx(host))
        if cfg.SMTP_USER:
            s.login(cfg.SMTP_USER, cfg.SMTP_PASS)
        s.noop(); s.quit(); out["smtp"] = "ok"
    except Exception as e:
        out["smtp"] = f"error: {e}"
    return out


def _body_text(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                try:
                    return part.get_payload(decode=True).decode(errors="replace")
                except Exception:
                    continue
        return ""
    try:
        return msg.get_payload(decode=True).decode(errors="replace")
    except Exception:
        return str(msg.get_payload())


_BOUNCE_SUBJECT = re.compile(
    r"undeliver|delivery (status|failure)|failure notice|returned mail|"
    r"mail delivery failed|delivery has failed|message not delivered", re.I)
_FINAL_RCPT = re.compile(r"final-recipient:\s*rfc822;\s*([^\s]+)", re.I)
_ORIG_RCPT = re.compile(r"original-recipient:\s*rfc822;\s*([^\s]+)", re.I)


def _analyze_bounce(msg: "email.message.Message", from_addr: str, subject: str, body: str) -> dict:
    """Detect a non-delivery report and extract the address that failed."""
    ctype = (msg.get_content_type() or "").lower()
    daemon = any(t in from_addr.lower() for t in ("mailer-daemon", "postmaster", "mail-daemon"))
    is_report = ctype == "multipart/report" or "report-type=delivery-status" in (msg.get("Content-Type", "") or "")
    is_bounce = daemon or is_report or bool(_BOUNCE_SUBJECT.search(subject or ""))
    failed = ""
    if is_bounce:
        m = _FINAL_RCPT.search(body) or _ORIG_RCPT.search(body)
        failed = (m.group(1).strip("<>").strip() if m else "")
    return {"is_bounce": is_bounce, "failed_recipient": failed}


def fetch_unseen(limit: int = 25, mark_seen: bool = True) -> list[dict]:
    """Read UNSEEN inbox messages (read-only beyond the optional Seen flag).
    Each item includes bounce analysis and the Auto-Submitted header (loop guard)."""
    m = _imap_connect()
    try:
        m.select("INBOX")
        typ, data = m.search(None, "UNSEEN")
        ids = data[0].split()[:limit] if data and data[0] else []
        out = []
        for i in ids:
            fetch_flag = "(RFC822)" if mark_seen else "(BODY.PEEK[])"
            typ, msg_data = m.fetch(i, fetch_flag)
            if not msg_data or not msg_data[0]:
                continue
            msg = email.message_from_bytes(msg_data[0][1])
            from_addr = parseaddr(msg.get("From", ""))[1]
            subject = msg.get("Subject", "")
            body = _body_text(msg)[:8000]
            auto = (msg.get("Auto-Submitted", "") or "").lower()
            out.append({
                "from": from_addr,
                "to": parseaddr(msg.get("To", ""))[1],
                "subject": subject,
                "message_id": msg.get("Message-ID", ""),
                "references": msg.get("References", ""),
                "auto_submitted": auto and auto != "no",
                "body": body[:5000],
                **_analyze_bounce(msg, from_addr, subject, body),
            })
        return out
    finally:
        m.logout()
