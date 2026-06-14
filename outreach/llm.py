#!/usr/bin/env python3
"""
LLM client — OpenAI-compatible chat + embeddings, stdlib only (urllib).

Works with DeepSeek / OpenAI / Together / a local server — anything exposing the
OpenAI chat-completions schema at LLM_BASE_URL. Embeddings default to a local,
dependency-free hashing embedding so RAG memory works even when the provider has
no embeddings endpoint; set LLM_EMBED_MODEL to use a real one.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.request

from config import cfg, get

_TOKEN = re.compile(r"[a-z0-9']+")


def chat(messages: list[dict], temperature: float = 0.4, max_tokens: int = 900) -> str:
    """One chat completion. Raises on transport error (caller decides fallback)."""
    if not cfg.LLM_API_KEY:
        raise RuntimeError("LLM_API_KEY is not set (see outreach/.env).")
    body = json.dumps({"model": cfg.LLM_MODEL, "messages": messages,
                       "temperature": temperature, "max_tokens": max_tokens}).encode()
    req = urllib.request.Request(
        f"{cfg.LLM_BASE_URL.rstrip('/')}/chat/completions",
        data=body,
        headers={"Authorization": f"Bearer {cfg.LLM_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    return data["choices"][0]["message"]["content"].strip()


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
    """Embed text. Uses a real embeddings endpoint if LLM_EMBED_MODEL is set;
    otherwise the local hashing embedding (no network, always works)."""
    model = get("LLM_EMBED_MODEL")
    if not model:
        return _local_embed(text)
    try:
        body = json.dumps({"model": model, "input": text}).encode()
        req = urllib.request.Request(
            f"{cfg.LLM_BASE_URL.rstrip('/')}/embeddings",
            data=body,
            headers={"Authorization": f"Bearer {cfg.LLM_API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)["data"][0]["embedding"]
    except Exception:
        return _local_embed(text)  # never fail RAG over an embeddings outage
