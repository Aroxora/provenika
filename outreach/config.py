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
        key, val = key.strip(), val.strip().strip('"').strip("'")
        # strip trailing inline comments only when value is unquoted+simple
        if " #" in val and not val.startswith(("http", "/")):
            val = val.split(" #", 1)[0].strip()
        os.environ.setdefault(key, val)


_load_dotenv(HERE / ".env")


def get(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


def flag(key: str, default: bool = False) -> bool:
    return get(key, str(default)).strip().lower() in ("1", "true", "yes", "on")


def num(key: str, default: float) -> float:
    try:
        return float(get(key, str(default)))
    except ValueError:
        return default


class Config:
    # LLM (OpenAI-compatible)
    LLM_API_KEY = property(lambda self: get("LLM_API_KEY"))
    LLM_BASE_URL = property(lambda self: get("LLM_BASE_URL", "https://api.deepseek.com/v1"))
    LLM_MODEL = property(lambda self: get("LLM_MODEL", "deepseek-chat"))
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
