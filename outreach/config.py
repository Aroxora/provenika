#!/usr/bin/env python3
"""
Config — load settings from the environment (and a local .env for dev).

Precedence: real environment variables > outreach/.env file > defaults. In the
cloud, set real env vars from AWS Secrets Manager / SSM (Lambda) or GitHub Actions
secrets — never bake secrets into code or a committed file.
"""

from __future__ import annotations

import os
from pathlib import Path

HERE = Path(__file__).parent


def _load_dotenv(path: Path) -> None:
    """Minimal .env parser (no dependency). Does NOT override real env vars."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        import re as _re
        # strip a trailing " #inline comment" (whitespace + #), then quotes/space.
        val = _re.sub(r"\s+#.*$", "", val).strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), val)


def _load_saved_keys(path: Path) -> None:
    """User-submitted saved keys (JSON). Override .env defaults but not real env vars.
    Written by `cli.py keys ...`; lives under gitignored .state/ — never committed."""
    try:
        import json
        for k, v in (json.loads(path.read_text()) or {}).items():
            if v not in (None, ""):
                os.environ.setdefault(k, str(v))
    except Exception:
        pass


# Precedence: real env vars > saved keys.json > .env file > defaults.
_load_saved_keys(HERE / ".state" / "keys.json")
_load_dotenv(HERE / ".env")


def get(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# Provider presets — pick with LLM_PROVIDER; any field overridable via LLM_* env vars.
# All are OpenAI-compatible except where an Anthropic base is given (DeepSeek offers both).
PROVIDERS = {
    "deepseek":  {"base": "https://api.deepseek.com/v1", "anthropic": "https://api.deepseek.com/anthropic",
                  "model": "deepseek-chat", "format": "auto", "key_env": "DEEPSEEK_API_KEY"},
    "xai":       {"base": "https://api.x.ai/v1", "anthropic": "",
                  "model": "grok-4.3", "format": "openai", "key_env": "XAI_API_KEY"},
    "openai":    {"base": "https://api.openai.com/v1", "anthropic": "",
                  "model": "gpt-4o-mini", "format": "openai", "key_env": "OPENAI_API_KEY"},
    "gemini":    {"base": "https://generativelanguage.googleapis.com/v1beta/openai", "anthropic": "",
                  "model": "gemini-flash-latest", "format": "openai", "key_env": "GEMINI_API_KEY"},
    "anthropic": {"base": "", "anthropic": "https://api.anthropic.com",
                  "model": "claude-opus-4-8", "format": "anthropic", "key_env": "ANTHROPIC_API_KEY"},
}


def _prov() -> dict:
    return PROVIDERS.get(get("LLM_PROVIDER", "deepseek").lower(), PROVIDERS["deepseek"])


def flag(key: str, default: bool = False) -> bool:
    return get(key, str(default)).strip().lower() in ("1", "true", "yes", "on")


def num(key: str, default: float) -> float:
    try:
        return float(get(key, str(default)))
    except ValueError:
        return default


class Config:
    # LLM — supports DeepSeek's two surfaces with auto-switching:
    #   OpenAI format     : LLM_BASE_URL        (POST /chat/completions, Bearer)
    #   Anthropic format  : LLM_ANTHROPIC_BASE_URL (POST /v1/messages, x-api-key)
    # LLM_FORMAT: "openai" | "anthropic" | "auto" (try one, fall back to the other).
    LLM_PROVIDER = property(lambda self: get("LLM_PROVIDER", "deepseek").lower())
    LLM_API_KEY = property(lambda self: get("LLM_API_KEY") or get(_prov()["key_env"]))
    LLM_BASE_URL = property(lambda self: get("LLM_BASE_URL") or _prov()["base"])
    LLM_ANTHROPIC_BASE_URL = property(lambda self: get("LLM_ANTHROPIC_BASE_URL") or _prov()["anthropic"])
    LLM_FORMAT = property(lambda self: (get("LLM_FORMAT") or _prov()["format"]).lower())
    ANTHROPIC_VERSION = property(lambda self: get("ANTHROPIC_VERSION", "2023-06-01"))
    LLM_MODEL = property(lambda self: get("LLM_MODEL") or _prov()["model"])
    # Tavily
    TAVILY_API_KEY = property(lambda self: get("TAVILY_API_KEY"))
    # Email
    IMAP_HOST = property(lambda self: get("IMAP_HOST", "127.0.0.1"))
    IMAP_PORT = property(lambda self: int(num("IMAP_PORT", 1143)))
    IMAP_USER = property(lambda self: get("IMAP_USER"))
    IMAP_PASS = property(lambda self: get("IMAP_PASS"))
    IMAP_SECURITY = property(lambda self: get("IMAP_SECURITY", "STARTTLS").upper())
    SMTP_HOST = property(lambda self: get("SMTP_HOST", "127.0.0.1"))
    SMTP_PORT = property(lambda self: int(num("SMTP_PORT", 1025)))
    SMTP_USER = property(lambda self: get("SMTP_USER"))
    SMTP_PASS = property(lambda self: get("SMTP_PASS"))
    SMTP_SECURITY = property(lambda self: get("SMTP_SECURITY", "STARTTLS").upper())
    FROM_NAME = property(lambda self: get("FROM_NAME", "Founder"))
    FROM_EMAIL = property(lambda self: get("FROM_EMAIL"))
    REPLY_TO = property(lambda self: get("REPLY_TO") or get("FROM_EMAIL"))
    # The human a recipient can contact directly (disclosed in every message).
    HUMAN_NAME = property(lambda self: get("HUMAN_NAME", "Bo Shang"))
    HUMAN_EMAIL = property(lambda self: get("HUMAN_EMAIL", "bo@shang.software"))
    HUMAN_EMAIL_ALT = property(lambda self: get("HUMAN_EMAIL_ALT", "bo@trenchwork.org"))
    HUMAN_PHONE = property(lambda self: get("HUMAN_PHONE", "+1 508-260-0326"))
    # Where operational update/alert emails are sent.
    NOTIFY_EMAIL = property(lambda self: get("NOTIFY_EMAIL") or get("HUMAN_EMAIL", "bo@shang.software"))
    # Agentic auto-reply to inbound replies (in addition to the master SEND_ENABLED).
    AUTO_REPLY_ENABLED = property(lambda self: flag("AUTO_REPLY_ENABLED", False))
    MAX_AUTO_REPLIES_PER_CONTACT = property(lambda self: int(num("MAX_AUTO_REPLIES_PER_CONTACT", 3)))
    # 24/7 monitor: prefer IMAP IDLE, fall back to polling this often.
    MONITOR_POLL_SECONDS = property(lambda self: int(num("MONITOR_POLL_SECONDS", 30)))
    MONITOR_USE_IDLE = property(lambda self: flag("MONITOR_USE_IDLE", True))
    # Store
    STORE_BACKEND = property(lambda self: get("STORE_BACKEND", "local").lower())
    LOCAL_STORE_PATH = property(lambda self: get("LOCAL_STORE_PATH", str(HERE / ".state" / "store.json")))
    GOOGLE_CLOUD_PROJECT = property(lambda self: get("GOOGLE_CLOUD_PROJECT"))
    FIRESTORE_COLLECTION = property(lambda self: get("FIRESTORE_COLLECTION", "outreach"))
    # Safety
    SEND_ENABLED = property(lambda self: flag("SEND_ENABLED", False))
    DAILY_SEND_CAP = property(lambda self: int(num("DAILY_SEND_CAP", 20)))
    MIN_HOURS_BETWEEN_TOUCHES = property(lambda self: num("MIN_HOURS_BETWEEN_TOUCHES", 72))


cfg = Config()
