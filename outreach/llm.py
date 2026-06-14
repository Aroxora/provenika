#!/usr/bin/env python3
"""
LLM client — dual-format with seamless auto-switching, stdlib only (urllib).

DeepSeek (and others) expose the same model two ways; this client speaks both and
can fall back from one to the other automatically:

  * OpenAI format     LLM_BASE_URL=https://api.deepseek.com[/v1]   POST /chat/completions
                      Authorization: Bearer <key>
  * Anthropic format  LLM_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
                      POST /v1/messages   x-api-key: <key>   anthropic-version: 2023-06-01

LLM_FORMAT picks the primary: "openai" | "anthropic" | "auto" (default — try the
primary, fall back to the other and remember which worked). The same API key works
for both surfaces. Keys may come from env, the gitignored .env, or user-submitted
saved keys (outreach/.state/keys.json). This is a provider-neutral wrapper, not an
SDK integration — hence raw HTTP.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.request

from config import cfg, get

_TOKEN = re.compile(r"[a-z0-9']+")
_WORKING_FORMAT: str | None = None  # cache the format that succeeded under "auto"


def _post(url: str, headers: dict, body: dict, timeout: int = 60) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={**headers, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _chat_openai(messages, temperature, max_tokens) -> str:
    data = _post(
        f"{cfg.LLM_BASE_URL.rstrip('/')}/chat/completions",
        {"Authorization": f"Bearer {cfg.LLM_API_KEY}"},
        {"model": cfg.LLM_MODEL, "messages": messages,
         "temperature": temperature, "max_tokens": max_tokens},
    )
    return data["choices"][0]["message"]["content"].strip()


def _chat_anthropic(messages, temperature, max_tokens) -> str:
    # Anthropic Messages API: system is top-level; messages are user/assistant only.
    system = " ".join(m["content"] for m in messages if m.get("role") == "system").strip()
    convo = [{"role": m["role"], "content": m["content"]}
             for m in messages if m.get("role") in ("user", "assistant")]
    body = {"model": cfg.LLM_MODEL, "max_tokens": max_tokens, "messages": convo,
            "temperature": temperature}
    if system:
        body["system"] = system
    data = _post(
        f"{cfg.LLM_ANTHROPIC_BASE_URL.rstrip('/')}/v1/messages",
        {"x-api-key": cfg.LLM_API_KEY, "anthropic-version": cfg.ANTHROPIC_VERSION},
        body,
    )
    # response: {"content": [{"type": "text", "text": "..."}], ...}
    return "".join(b.get("text", "") for b in data.get("content", [])
                   if b.get("type") == "text").strip()


_DISPATCH = {"openai": _chat_openai, "anthropic": _chat_anthropic}


def chat(messages: list[dict], temperature: float = 0.4, max_tokens: int = 900) -> str:
    """One chat completion. Honors LLM_FORMAT; under 'auto' tries the primary and
    transparently falls back to the other format, caching whichever worked."""
    if not cfg.LLM_API_KEY:
        raise RuntimeError("LLM_API_KEY is not set (see outreach/.env or `cli.py keys`).")
    global _WORKING_FORMAT
    fmt = cfg.LLM_FORMAT
    if fmt in _DISPATCH:
        return _DISPATCH[fmt](messages, temperature, max_tokens)
    # auto: prefer the last-known-good, else openai; fall back to the other.
    order = ([_WORKING_FORMAT] if _WORKING_FORMAT else []) + ["openai", "anthropic"]
    seen, errors = [], []
    for f in order:
        if f in seen:
            continue
        seen.append(f)
        try:
            out = _DISPATCH[f](messages, temperature, max_tokens)
            _WORKING_FORMAT = f
            return out
        except Exception as e:  # try the other format
            errors.append(f"{f}: {str(e)[:120]}")
    raise RuntimeError("all LLM formats failed -> " + " | ".join(errors))


def active_format() -> str:
    return cfg.LLM_FORMAT if cfg.LLM_FORMAT in _DISPATCH else (_WORKING_FORMAT or "auto")


def _local_embed(text: str, dim: int = 256) -> list[float]:
    """Deterministic, dependency-free hashing embedding (token-hash bag, L2-norm).
    Good enough for dedup + nearest-neighbour over short investor profiles."""
    vec = [0.0] * dim
    for tok in _TOKEN.findall(text.lower()):
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm else vec


def embed(text: str) -> list[float]:
    """Embed text. Uses a real embeddings endpoint if LLM_EMBED_MODEL is set
    (OpenAI-format only); otherwise the local hashing embedding (no network)."""
    model = get("LLM_EMBED_MODEL")
    if not model:
        return _local_embed(text)
    try:
        data = _post(f"{cfg.LLM_BASE_URL.rstrip('/')}/embeddings",
                     {"Authorization": f"Bearer {cfg.LLM_API_KEY}"},
                     {"model": model, "input": text})
        return data["data"][0]["embedding"]
    except Exception:
        return _local_embed(text)  # never fail RAG over an embeddings outage
