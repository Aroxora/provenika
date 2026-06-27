#!/usr/bin/env python3
"""
Target validation evidence — human genetic support from the Open Targets Platform.

The single most useful signal for whether a target is worth pursuing toward an actual therapy is
HUMAN GENETIC evidence for the disease: drug mechanisms with human genetic support are about twice as
likely to win approval (Nelson et al., Nat Genet 2015; reinforced by Minikel et al., Nature 2024). This
fetches, for a gene, its top oncology disease associations from Open Targets — the overall association
score AND the genetic-evidence component — so a researcher can judge target quality before investing.

Honesty: Open Targets is an evidence AGGREGATOR, not an outcome predictor; the scores are heuristic
weighted sums, genetic support raises a population-level PRIOR (it is not a per-program forecast),
and absence of genetic evidence is not evidence against a target. The germline-genetics signal also
translates imperfectly to oncology's somatic biology. Every value is fetched live from a public API
(no key) and points to its source — fits the no-model-figures rule. Research only; not medical advice.

Usage:
  python3 cad/target_evidence.py --target EGFR
  python3 cad/target_evidence.py --target BRAF --json
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

API = "https://api.platform.opentargets.org/api/v4/graphql"
UA = "provenika-target-evidence/1.0 (research)"


def _gql(query: str, variables: dict) -> dict:
    body = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request(API, data=body,
                                 headers={"Content-Type": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def resolve_ensembl(symbol: str) -> tuple[str, str] | None:
    """Gene symbol -> (ensemblId, approvedSymbol). None if not found."""
    q = 'query($q:String!){search(queryString:$q,entityNames:["target"]){hits{id name entity}}}'
    hits = (_gql(q, {"q": symbol}).get("data", {}).get("search", {}) or {}).get("hits", [])
    for h in hits:
        if h.get("entity") == "target":
            return h["id"], h.get("name") or symbol
    return None


def associations(ensembl_id: str, size: int = 6) -> list[dict]:
    """Top disease associations: overall score + per-datatype (genetic_association, somatic_mutation,
    known_drug, literature) scores. Fetched live from Open Targets."""
    q = ('query($id:String!,$n:Int!){target(ensemblId:$id){associatedDiseases(page:{index:0,size:$n})'
         '{rows{score disease{id name} datatypeScores{id score}}}}}')
    rows = (((_gql(q, {"id": ensembl_id, "n": size}).get("data", {}) or {}).get("target", {}) or {})
            .get("associatedDiseases", {}) or {}).get("rows", [])
    out = []
    for r in rows:
        dts = {x["id"]: round(x["score"], 3) for x in (r.get("datatypeScores") or [])}
        out.append({
            "disease": (r.get("disease") or {}).get("name"),
            "disease_id": (r.get("disease") or {}).get("id"),
            "overall_score": round(r.get("score", 0), 3),
            "genetic_score": dts.get("genetic_association"),
            "somatic_score": dts.get("somatic_mutation"),
            # Clinical/known-drug precedent. Open Targets v4 reports this datatype as `clinical`
            # (it folded the older `known_drug`); fall back so this column is actually populated.
            "known_drug_score": dts.get("known_drug") if dts.get("known_drug") is not None
            else dts.get("clinical"),
            "url": f"https://platform.opentargets.org/evidence/{ensembl_id}/{(r.get('disease') or {}).get('id')}",
        })
    return out


CANCER_TERMS = ("cancer", "carcinoma", "tumor", "tumour", "neoplasm", "lymphoma", "leukemia",
                "leukaemia", "melanoma", "sarcoma", "glioma", "glioblastoma", "myeloma", "blastoma",
                "adenocarcinoma", "malignant", "oncocytoma", "mesothelioma")


def is_cancer(name: str | None) -> bool:
    n = (name or "").lower()
    return any(t in n for t in CANCER_TERMS)


def genetic_support_label(rows: list[dict]) -> str:
    """Conservative read of the strongest genetic-association score across the given diseases."""
    g = [r["genetic_score"] for r in rows if r.get("genetic_score") is not None]
    best = max(g) if g else None
    if best is None:
        return "no genetic-association evidence in the top associations (not evidence against the target)"
    band = "strong" if best >= 0.5 else "moderate" if best >= 0.2 else "weak"
    tail = " — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015)" if best >= 0.5 else ""
    return f"{band} human genetic support (best genetic-evidence score {best:.2f}){tail}"


def oncology_genetic_readout(rows: list[dict]) -> str:
    """Genetic support scoped to the CANCER associations (this is an oncology tool — a high genetic
    score for a non-cancer Mendelian disease is not the relevant signal). Names the cancer it refers
    to; falls back honestly when no cancer association carries genetic evidence."""
    onco = [(r["genetic_score"], r["disease"]) for r in rows
            if is_cancer(r.get("disease")) and r.get("genetic_score") is not None]
    if not onco:
        if any(is_cancer(r.get("disease")) for r in rows):
            return ("the target's top cancer associations carry no GENETIC-association evidence here "
                    "(often somatic-driven) — not evidence against the target")
        return "no cancer association in the top results (verify the target–disease link directly)"
    best, disease = max(onco, key=lambda x: x[0])
    band = "strong" if best >= 0.5 else "moderate" if best >= 0.2 else "weak"
    tail = " — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015)" if best >= 0.5 else ""
    return f"{band} human genetic support for {disease} (genetic-evidence score {best:.2f}){tail}"


def evidence(symbol: str, size: int = 15) -> dict:
    res = resolve_ensembl(symbol)
    if not res:
        return {"target": symbol, "error": "not found in Open Targets"}
    ens, name = res
    rows = associations(ens, size)
    onco = [r for r in rows if is_cancer(r.get("disease"))]
    return {
        "target": symbol, "ensembl_id": ens, "approved_symbol": name,
        "top_associations": (onco or rows)[:6],     # show the cancer associations (an oncology tool)
        "genetic_support": oncology_genetic_readout(rows),
        "source": "Open Targets Platform (platform.opentargets.org)",
        "url": f"https://platform.opentargets.org/target/{ens}",
        "disclaimer": "Open Targets aggregates evidence; scores are heuristic, not outcome predictions. "
                      "Human genetic support raises a population-level prior of clinical success "
                      "(Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence "
                      "against. Germline signal translates imperfectly to somatic oncology. Research only.",
    }


def to_markdown(ev: dict) -> str:
    if "error" in ev:
        return f"_Target validation (Open Targets): {ev['target']} — {ev['error']}._"
    L = [f"## Independent target validation (Open Targets) — {ev['approved_symbol']}", "",
         f"**Read-out:** {ev['genetic_support']}.", "",
         "| Disease | Overall | Genetic | Somatic | Known-drug | evidence |",
         "|---|---|---|---|---|---|"]
    for r in ev["top_associations"]:
        L.append(f"| {r['disease']} | {r['overall_score']} | {r.get('genetic_score') or '—'} | "
                 f"{r.get('somatic_score') or '—'} | {r.get('known_drug_score') or '—'} | "
                 f"[OT]({r['url']}) |")
    L += ["", f"_Source: [{ev['source']}]({ev['url']}). {ev['disclaimer']}_"]
    return "\n".join(L)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Human genetic / association evidence for a target (Open Targets).")
    p.add_argument("--target", required=True, help="Gene symbol, e.g. EGFR.")
    p.add_argument("--size", type=int, default=6)
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    try:
        ev = evidence(args.target, args.size)
    except urllib.error.URLError as e:
        print(f"Network error reaching Open Targets: {e}", file=sys.stderr)
        return 2
    print(json.dumps(ev, indent=2) if args.json else to_markdown(ev))
    return 0 if "error" not in ev else 1


if __name__ == "__main__":
    raise SystemExit(main())
