#!/usr/bin/env python3
"""
Store + RAG memory.

Two backends behind one interface:
  * LocalStore    — a JSON file (default; zero setup, great for dev / dry-run).
  * FirestoreStore — Google Cloud Firestore (set STORE_BACKEND=firestore).

Holds three kinds of document:
  * contact     — an investor/prospect: identity, status, profile, last-touch time.
  * interaction — an append-only event on a contact (sent, reply, classification).
  * memory      — a RAG chunk (a pitch fact or a past interaction) with an embedding.

RAG retrieval is cosine similarity over stored embeddings, computed in-memory
(fine for hundreds–low-thousands of docs). Embeddings come from outreach/llm.py
(local hashing by default, so memory works with no embeddings API).
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path
from typing import Optional

from config import cfg


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


class LocalStore:
    """JSON-file store. Structure: {contacts:{email:doc}, interactions:[...], memory:[...]}."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._db = {"contacts": {}, "interactions": [], "memory": []}
        if self.path.exists():
            try:
                self._db = json.loads(self.path.read_text())
            except json.JSONDecodeError:
                pass

    def _save(self):
        self.path.write_text(json.dumps(self._db, indent=2))

    # --- contacts ---
    def upsert_contact(self, email: str, **fields):
        c = self._db["contacts"].get(email, {"email": email, "status": "new", "created": time.time()})
        c.update(fields)
        self._db["contacts"][email] = c
        self._save()
        return c

    def get_contact(self, email: str) -> Optional[dict]:
        return self._db["contacts"].get(email)

    def all_contacts(self) -> list[dict]:
        return list(self._db["contacts"].values())

    def set_status(self, email: str, status: str):
        if email in self._db["contacts"]:
            self._db["contacts"][email]["status"] = status
            self._save()

    # --- interactions ---
    def add_interaction(self, email: str, kind: str, **fields):
        rec = {"email": email, "kind": kind, "ts": time.time(), **fields}
        self._db["interactions"].append(rec)
        self._save()
        return rec

    def interactions_for(self, email: str) -> list[dict]:
        return [i for i in self._db["interactions"] if i["email"] == email]

    def record_touch(self, email: str):
        self.upsert_contact(email, last_touch=time.time())

    def touches_today(self) -> int:
        cutoff = time.time() - 86400
        return sum(1 for i in self._db["interactions"] if i["kind"] == "sent" and i["ts"] >= cutoff)

    # --- memory (RAG) ---
    def add_memory(self, text: str, embedding: list[float], source: str = "", kind: str = "fact"):
        self._db["memory"].append({"text": text, "embedding": embedding, "source": source,
                                   "kind": kind, "ts": time.time()})
        self._save()

    def search_memory(self, query_embedding: list[float], k: int = 5, kind: str | None = None) -> list[dict]:
        items = [m for m in self._db["memory"] if (kind is None or m.get("kind") == kind)]
        scored = sorted(items, key=lambda m: cosine(query_embedding, m.get("embedding", [])), reverse=True)
        return scored[:k]

    def memory_count(self) -> int:
        return len(self._db["memory"])


class FirestoreStore:
    """Google Cloud Firestore backend (same interface as LocalStore)."""

    def __init__(self, project: str, collection: str):
        from google.cloud import firestore  # imported lazily; optional dep
        self.col = firestore.Client(project=project or None).collection(collection)

    def _doc(self, kind, key):
        return self.col.document(f"{kind}__{key}")

    def upsert_contact(self, email, **fields):
        ref = self._doc("contact", email)
        snap = ref.get()
        c = snap.to_dict() if snap.exists else {"email": email, "status": "new", "created": time.time()}
        c.update(fields)
        ref.set(c)
        return c

    def get_contact(self, email):
        snap = self._doc("contact", email).get()
        return snap.to_dict() if snap.exists else None

    def all_contacts(self):
        return [d.to_dict() for d in self.col.where("email", "!=", "").stream()
                if d.id.startswith("contact__")]

    def set_status(self, email, status):
        self._doc("contact", email).set({"status": status}, merge=True)

    def add_interaction(self, email, kind, **fields):
        rec = {"email": email, "kind": kind, "ts": time.time(), **fields}
        self.col.add(rec)
        return rec

    def interactions_for(self, email):
        return [d.to_dict() for d in self.col.where("email", "==", email).stream()
                if d.to_dict().get("kind") in ("sent", "reply", "classified", "draft")]

    def record_touch(self, email):
        self._doc("contact", email).set({"last_touch": time.time()}, merge=True)

    def touches_today(self):
        cutoff = time.time() - 86400
        return sum(1 for d in self.col.where("kind", "==", "sent").where("ts", ">=", cutoff).stream())

    def add_memory(self, text, embedding, source="", kind="fact"):
        self.col.add({"_type": "memory", "text": text, "embedding": embedding,
                      "source": source, "kind": kind, "ts": time.time()})

    def search_memory(self, query_embedding, k=5, kind=None):
        items = [d.to_dict() for d in self.col.where("_type", "==", "memory").stream()]
        if kind:
            items = [m for m in items if m.get("kind") == kind]
        return sorted(items, key=lambda m: cosine(query_embedding, m.get("embedding", [])), reverse=True)[:k]

    def memory_count(self):
        return sum(1 for _ in self.col.where("_type", "==", "memory").stream())


def get_store():
    if cfg.STORE_BACKEND == "firestore":
        return FirestoreStore(cfg.GOOGLE_CLOUD_PROJECT, cfg.FIRESTORE_COLLECTION)
    return LocalStore(cfg.LOCAL_STORE_PATH)
