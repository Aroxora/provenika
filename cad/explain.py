#!/usr/bin/env python3
"""
Explanation layer — the LLM explains, and is STRUCTURALLY barred from being a source of figures.

The repo's one rule is "no number shown to a human originates from a language model." This module
lets an LLM (DeepSeek by default, any OpenAI-compatible endpoint) write a plain-language explanation
of an ALREADY-COMPUTED result (a pipeline run, a verify report, a docked shortlist) — and then
enforces the rule with a deterministic guard: every number in the explanation MUST already appear in
the input data (or be a count of the items in it). If the model introduces ANY foreign figure — an
invented potency, percentage, year, affinity — the explanation is REJECTED. The model can phrase and
contextualise; it cannot fabricate a fact.

Honesty / safety:
  * Prose only. It never adds, alters, or asserts a figure; the number-guard makes that provable.
  * It is told to give NO medical advice, dose, prognosis, or claim that a therapy works.
  * The API key is read ONLY from DEEPSEEK_API_KEY (or OPENAI_API_KEY) in the environment — never
    from or to the repo. No key → it prints how to set one and exits 0 (nothing fabricated).
  * Standard-library only (urllib); no SDK, no new dependency.

Env:  DEEPSEEK_API_KEY   (required)        e.g.  export DEEPSEEK_API_KEY=sk-...
      DEEPSEEK_MODEL     (default deepseek-v4-flash)
      DEEPSEEK_BASE_URL  (default https://api.deepseek.com)

Usage:
  DEEPSEEK_API_KEY=... python3 cad/explain.py --run runs/egfr
  DEEPSEEK_API_KEY=... python3 cad/explain.py --json-file runs/egfr/dossier.json --kind dossier
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-v4-flash"

_NUM_RE = re.compile(r"-?\d+(?:\.\d+)?")

SYSTEM_PROMPT = (
    "You explain computational oncology-research results in plain language for a scientist. "
    "ABSOLUTE RULES: (1) Use ONLY numbers that appear LITERALLY in the JSON you are given. Do NOT "
    "introduce, infer, compute, round, or estimate ANY number — no molecular weights, counts, "
    "potencies, percentages, affinities, prices, or years that are not copied verbatim from the "
    "input. When you would otherwise cite a descriptor, prefer a QUALITATIVE phrase instead "
    "('sub-nanomolar', 'drug-like', 'most potent', 'a handful of hits') rather than a number. It is "
    "better to omit a number than to risk one that isn't in the data. (2) Give NO medical advice, "
    "dose, diagnosis, prognosis, or claim that a therapy works — these are research hypotheses only. "
    "(3) Be concise (4-8 sentences), faithful, and state the data's own caveats."
)


# --------------------------------------------------------------------------- number guard
def collect_numbers(data) -> set[float]:
    """Every number that appears anywhere in the input (values + numbers inside strings)."""
    nums: set[float] = set()

    def walk(x):
        if isinstance(x, bool):
            return
        if isinstance(x, (int, float)):
            nums.add(round(float(x), 4))
        elif isinstance(x, str):
            for m in _NUM_RE.findall(x):
                try:
                    nums.add(round(float(m), 4))
                except ValueError:
                    pass
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, (list, tuple)):
            for v in x:
                walk(v)

    walk(data)
    return nums


def _list_lengths(data) -> set[int]:
    out: set[int] = set()

    def walk(x):
        if isinstance(x, (list, tuple)):
            out.add(len(x))
            for v in x:
                walk(v)
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)

    walk(data)
    return out


def foreign_numbers(text: str, data) -> list[str]:
    """Numbers in `text` that are NOT justified by `data`. Allowed: any number present in the input
    (±0.01), the LENGTH of any list in the input (counts), and small ordinals up to the largest list
    (1..N, for 'the 3rd hit'). Anything else is a figure the model introduced → flagged."""
    allowed = collect_numbers(data)
    lengths = _list_lengths(data)
    max_ord = max(lengths) if lengths else 0
    bad: list[str] = []
    for tok in _NUM_RE.findall(text):
        try:
            v = round(float(tok), 4)
        except ValueError:
            continue
        # Match by magnitude: a value (or its sign-stripped magnitude, e.g. a -9.5 kcal/mol ΔG
        # written as "9.5") that is present in the data is a faithful restatement, not a new figure.
        if any(abs(v - a) < 0.01 or abs(abs(v) - abs(a)) < 0.01 for a in allowed):
            continue
        if v == int(v) and (int(v) in lengths or 1 <= int(v) <= max_ord):
            continue
        bad.append(tok)
    return sorted(set(bad), key=lambda s: (len(s), s))


def guard(text: str, data) -> dict:
    bad = foreign_numbers(text, data)
    return {"ok": not bad, "foreign_numbers": bad}


# --------------------------------------------------------------------------- LLM call
def _chat(messages: list[dict], *, api_key: str, model: str, base_url: str,
          max_tokens: int = 1200) -> str | None:
    body = json.dumps({"model": model, "messages": messages, "temperature": 0,
                       "max_tokens": max_tokens}).encode()
    req = urllib.request.Request(
        base_url.rstrip("/") + "/chat/completions", data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
                 "User-Agent": "provenika-explain/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.load(resp)
    msg = (data.get("choices") or [{}])[0].get("message") or {}
    return (msg.get("content") or "").strip() or None


def explain(data, kind: str = "result", *, api_key: str | None = None, model: str | None = None,
            base_url: str | None = None) -> dict:
    """Return {explanation, guard, model} — or {error/skipped}. The explanation is only returned when
    the number-guard PASSES; a guard failure returns the offending figures, never the prose, so a
    fabricated number can't reach a human."""
    api_key = api_key or os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"skipped": "no DEEPSEEK_API_KEY/OPENAI_API_KEY set — set one to enable explanations "
                           "(prose only; figures are never model-generated)."}
    model = model or os.environ.get("DEEPSEEK_MODEL", DEFAULT_MODEL)
    base_url = base_url or os.environ.get("DEEPSEEK_BASE_URL", DEFAULT_BASE)
    payload = json.dumps(data, indent=2, default=str)[:24000]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Explain this {kind} (JSON below) in 4-8 sentences for a "
                                    f"scientist, using only its own numbers and stating its caveats:\n\n{payload}"},
    ]
    try:
        text = _chat(messages, api_key=api_key, model=model, base_url=base_url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
        return {"error": f"LLM call failed: {type(e).__name__}: {e}"}
    if not text:
        return {"error": "LLM returned no content (model may be reasoning-only or rate-limited)."}
    g = guard(text, data)
    if not g["ok"]:
        return {"rejected": "explanation introduced number(s) absent from the data — withheld to "
                            "preserve the no-model-figures rule", "foreign_numbers": g["foreign_numbers"],
                "model": model}
    return {"explanation": text, "guard": g, "model": model,
            "disclaimer": "LLM-written plain-language explanation of computed/fetched figures. Adds no "
                          "figure (enforced). Not medical advice; research hypothesis only."}


def _load_run(run_dir: Path) -> dict:
    """Gather the already-computed artifacts of a pipeline run into one payload to explain."""
    out: dict = {}
    for name in ("dossier.json", "binding_site.json", "cost_benefit.json"):
        p = run_dir / name
        if p.exists():
            try:
                out[name.replace(".json", "")] = json.loads(p.read_text())
            except json.JSONDecodeError:
                pass
    hits = run_dir / "hits.csv"
    if hits.exists():
        import csv
        with hits.open() as fh:
            out["top_hits"] = list(csv.DictReader(fh))[:10]
    docked = run_dir / "docked_hits.csv"
    if docked.exists():
        import csv
        with docked.open() as fh:
            out["docked_hits"] = list(csv.DictReader(fh))
    return out


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="LLM plain-language explanation of a computed result "
                                            "(prose only; a number-guard forbids new figures).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--run", help="A pipeline run directory (dossier/hits/box/cost-benefit/docked).")
    g.add_argument("--json-file", help="A single JSON artifact to explain.")
    p.add_argument("--kind", default="pipeline run", help="Short label for the input.")
    p.add_argument("--json", action="store_true", help="Emit the full JSON result.")
    args = p.parse_args(argv)

    if args.run:
        data = _load_run(Path(args.run))
        if not data:
            print(f"No artifacts found in {args.run}.", file=sys.stderr)
            return 1
    else:
        data = json.loads(Path(args.json_file).read_text())

    res = explain(data, kind=args.kind)
    if args.json:
        print(json.dumps(res, indent=2))
        return 0
    if "explanation" in res:
        print(res["explanation"])
        print(f"\n[{res['model']} · no foreign numbers · {res['disclaimer']}]")
        return 0
    print(json.dumps(res, indent=2), file=sys.stderr)
    return 0 if ("skipped" in res) else 1


if __name__ == "__main__":
    raise SystemExit(main())
