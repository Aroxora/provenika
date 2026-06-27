#!/usr/bin/env python3
"""
target_panel.py — rank a panel of oncology targets by HUMAN GENETIC support for cancer (Open Targets).

Picking the target is the single most consequential decision in a cancer program, and the most
predictive prior we have is human genetic evidence: drug mechanisms with human genetic support are
about twice as likely to win approval (Nelson et al., Nat Genet 2015; reinforced by Minikel et al.,
Nature 2024). This runs the per-target Open Targets read-out (cad/target_evidence.py) across a curated
panel of well-established oncogenes/drug targets and ranks them by the strongest CANCER genetic-evidence
score — so a researcher sees, at a glance, which targets carry the strongest population-level prior.

Honesty (this is the whole point):
  * Every number is fetched LIVE from Open Targets — none is computed, blended, or model-produced.
    The ranking key IS Open Targets' own cancer genetic-evidence score; we invent no composite that
    would imply a prediction the data doesn't make.
  * Open Targets aggregates evidence; scores are heuristic weighted sums, NOT outcome forecasts.
    Genetic support raises a population-level PRIOR, not a per-program probability. Absence of genetic
    evidence is NOT evidence against a target (many bona-fide oncogenes are somatic-driven — the
    read-out says so explicitly). Germline genetics also translates imperfectly to somatic oncology.
  * The panel is a curated convenience list of established targets, not "the best targets" — it is a
    starting set to compare, and is fully overridable with --symbols. Research only; not medical advice.

Usage:
  python3 cad/target_panel.py                      # rank the default oncogene panel (live)
  python3 cad/target_panel.py --symbols KRAS,BRAF,EGFR,PIK3CA --json
  python3 cad/target_panel.py --out examples/target-panel    # write ranking.json + ranking.md
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import target_evidence as TE  # noqa: E402

# A curated panel of established oncology drivers / drug targets. NOT a claim about which are "best" —
# it's a comparison starting set (override with --symbols). Kept to well-known, genuinely-pursued genes.
DEFAULT_PANEL = [
    "KRAS", "NRAS", "HRAS", "BRAF", "EGFR", "ERBB2", "PIK3CA", "AKT1", "MTOR", "PTEN",
    "MET", "ALK", "ROS1", "RET", "KIT", "FLT3", "ABL1", "BTK", "JAK2",
    "FGFR1", "FGFR2", "FGFR3", "MAP2K1", "CDK4", "CDK6", "BCL2", "MDM2",
    "IDH1", "IDH2", "PARP1", "AR", "ESR1",
]


def _best_cancer_genetic(assoc: list[dict]) -> tuple[float, str] | None:
    """Strongest CANCER disease association that carries a genetic-evidence score. None if none do."""
    onco = [(a["genetic_score"], a["disease"]) for a in assoc
            if TE.is_cancer(a.get("disease")) and a.get("genetic_score") is not None]
    return max(onco, key=lambda x: x[0]) if onco else None


def _top_cancer_overall(assoc: list[dict]) -> dict | None:
    """Highest-overall-score CANCER association — names the target's lead cancer indication."""
    onco = [a for a in assoc if TE.is_cancer(a.get("disease"))]
    return max(onco, key=lambda a: a.get("overall_score", 0)) if onco else None


def _max_cancer(assoc: list[dict], field: str) -> float | None:
    """Strongest value of `field` across ALL of the target's cancer associations — answers 'does this
    target carry somatic / approved-drug evidence in ANY cancer?', which a single disease row misses.
    Still 100% fetched (a max over Open Targets values, not a computed blend)."""
    vals = [a[field] for a in assoc if TE.is_cancer(a.get("disease")) and a.get(field) is not None]
    return max(vals) if vals else None


def evaluate(symbol: str, size: int = 20) -> dict:
    """Per-target row: best cancer genetic score + the cancer it refers to, plus fetched context.
    Never raises for a missing/odd target — records an honest error field instead."""
    res = TE.resolve_ensembl(symbol)
    if not res:
        return {"symbol": symbol, "error": "not found in Open Targets"}
    ens, name = res
    assoc = TE.associations(ens, size)
    best = _best_cancer_genetic(assoc)
    ctx = _top_cancer_overall(assoc) or {}
    return {
        "symbol": symbol,
        "approved_symbol": name,
        "ensembl_id": ens,
        "genetic_score": (best[0] if best else None),
        "genetic_cancer": (best[1] if best else None),
        "top_cancer": ctx.get("disease"),
        "top_cancer_overall": ctx.get("overall_score"),
        # somatic / known-drug as the MAX across this target's cancer associations (any-cancer signal).
        "somatic_score": _max_cancer(assoc, "somatic_score"),
        "known_drug_score": _max_cancer(assoc, "known_drug_score"),
        "readout": TE.oncology_genetic_readout(assoc),
        "url": f"https://platform.opentargets.org/target/{ens}",
    }


def _rank_key(r: dict):
    # genetic-supported first (real score desc), then no-genetic-evidence targets, errors last.
    if "error" in r:
        return (0, 0.0)
    return (1, r.get("genetic_score") or 0.0)


def rank(symbols: list[str], size: int = 20) -> list[dict]:
    rows = [evaluate(s, size) for s in symbols]
    rows.sort(key=_rank_key, reverse=True)
    return rows


DISCLAIMER = (
    "Source: Open Targets Platform (platform.opentargets.org), fetched live. Scores are heuristic "
    "evidence aggregations, NOT outcome predictions; human genetic support raises a population-level "
    "prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast. Absence of "
    "genetic evidence is not evidence against a target (many drivers are somatic). Germline signal "
    "translates imperfectly to somatic oncology. Research only — not medical advice."
)


def to_markdown(rows: list[dict]) -> str:
    L = ["# Oncology target panel — ranked by human genetic support for cancer", "",
         "Drug mechanisms with human genetic support are ~2x more likely to be approved "
         "(Nelson, _Nat Genet_ 2015). Ranked by the strongest **cancer** genetic-evidence score in "
         "Open Targets. Every value is fetched live; none is computed or model-produced.", "",
         "Somatic and Clinical/drug are the strongest score across the target's cancer associations "
         "(any-cancer signal: is it somatically driven? does it have clinical/known-drug precedent?).", "",
         "| # | Target | Cancer genetic score | Cancer (genetic) | Somatic (max) | Clinical/drug (max) | Read-out |",
         "|---|---|---|---|---|---|---|"]
    i = 0
    for r in rows:
        if "error" in r:
            L.append(f"| — | **{r['symbol']}** | — | — | — | — | _{r['error']}_ |")
            continue
        i += 1
        gs = f"**{r['genetic_score']:.2f}**" if r.get("genetic_score") is not None else "—"
        L.append(
            f"| {i} | [{r['symbol']}]({r['url']}) | {gs} | {r.get('genetic_cancer') or '—'} | "
            f"{r.get('somatic_score') if r.get('somatic_score') is not None else '—'} | "
            f"{r.get('known_drug_score') if r.get('known_drug_score') is not None else '—'} | "
            f"{r.get('readout','')} |")
    L += ["", f"_{DISCLAIMER}_"]
    return "\n".join(L)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Rank an oncology target panel by Open Targets cancer genetic support.")
    p.add_argument("--symbols", help="Comma-separated gene symbols (default: a curated oncogene panel).")
    p.add_argument("--size", type=int, default=20, help="How many disease associations to scan per target.")
    p.add_argument("--json", action="store_true", help="Emit JSON instead of the markdown table.")
    p.add_argument("--out", help="Directory to write ranking.json + ranking.md (created if needed).")
    args = p.parse_args(argv)

    symbols = ([s.strip() for s in args.symbols.split(",") if s.strip()]
               if args.symbols else list(DEFAULT_PANEL))
    try:
        rows = rank(symbols, args.size)
    except urllib.error.URLError as e:
        print(f"Network error reaching Open Targets: {e}", file=sys.stderr)
        return 2

    payload = {"panel_size": len(symbols), "ranked": rows, "disclaimer": DISCLAIMER,
               "source": "Open Targets Platform (platform.opentargets.org)"}
    if args.out:
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        (out / "ranking.json").write_text(json.dumps(payload, indent=2))
        (out / "ranking.md").write_text(to_markdown(rows))
        print(f"Wrote {out/'ranking.json'} and {out/'ranking.md'} ({len(symbols)} targets).")
    elif args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(to_markdown(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
