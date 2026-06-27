#!/usr/bin/env python3
"""
Validation package — the bridge from a computational hypothesis to the bench.

Provenika stops at a ranked, cited hypothesis; only the wet lab can prove it. This turns a pipeline
run into a concrete, honest **experimental-validation request**: the computational prioritization (with
provenance), the ordered chain of experiments that would actually test it, and the real labs/CROs (and
free programs) that run each assay — plus a ready-to-send pitch a researcher can fire off. It SENDS
nothing; it produces the artifact and the draft, leaving the human to decide who to contact.

Honesty: it states plainly that the candidates are public-data-prioritized hypotheses (known ChEMBL
actives re-ranked by structure-aware docking), not validated hits, and that every figure cited is
fetched-or-computed (re-checkable with cad/verify.py). No efficacy or safety claim; not medical advice.

Usage:
  python3 cad/validation_package.py --run examples/sample-run-egfr-docked
  python3 cad/validation_package.py --run runs/egfr --out runs/egfr/VALIDATION-REQUEST.md
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

# Real, public validation partners (verified). Free academic/government routes listed first where they
# exist. URLs are root domains; a researcher confirms current service scope/eligibility directly.
PARTNERS = {
    "binding": [
        ("Reaction Biology", "https://www.reactionbiology.com", "biochemical enzyme IC50/Ki + binding profiling"),
        ("Eurofins Discovery", "https://www.eurofinsdiscovery.com", "enzyme & biophysical binding assays, custom IC50"),
    ],
    "selectivity": [
        ("Eurofins DiscoverX KINOMEscan", "https://www.eurofinsdiscovery.com", "kinome-wide selectivity (competitive binding)"),
        ("Reaction Biology kinase panels", "https://www.reactionbiology.com", "large biochemical kinase selectivity panels"),
    ],
    "cell": [
        ("NCI Developmental Therapeutics Program (NCI-60)", "https://dtp.cancer.gov", "FREE 60-human-tumour-cell-line screening for qualifying compounds"),
        ("Charles River / WuXi AppTec", "https://www.criver.com", "cellular potency, viability, and target-engagement assays"),
    ],
    "admet": [
        ("Charles River Laboratories", "https://www.criver.com", "in-vitro ADME (microsomes, hERG, Caco-2) and PK"),
        ("Eurofins / WuXi ADME", "https://www.eurofinsdiscovery.com", "ADMET liability panels"),
    ],
    "translation": [
        ("NCI Experimental Therapeutics (NExT)", "https://dtp.cancer.gov/organization/dscb/index.htm", "NIH program supporting oncology agents through development"),
        ("Structural Genomics Consortium (SGC)", "https://www.thesgc.org", "open chemical-probe & target-validation collaborations"),
    ],
}

# The ordered experimental chain (mirrors the cure narrative): each step is the question, the assay,
# and which computational signal from the run motivates it.
CHAIN = [
    ("1. Confirm it binds", "Biochemical potency (enzyme IC50/Ki) and a biophysical binding readout (SPR/ITC) on the prioritized compounds against the purified target.",
     "Does the prioritized compound actually bind the target, and how tightly?", "binding",
     "motivated by the ChEMBL consensus potency + the structure-aware docking re-rank (a predicted ΔG, not a measured Kd)"),
    ("2. Prove selectivity", "An off-target / kinome selectivity panel on the top candidates.",
     "Is it selective, or a promiscuous binder (a primary oncology liability)?", "selectivity",
     "motivated by the run's n_potent_targets / selectivity flag (a ChEMBL proxy, not a measured panel)"),
    ("3. Engage the target in a cell", "Cellular target-engagement (CETSA/NanoBRET) + viability/apoptosis in relevant tumour lines; NCI-60 for breadth.",
     "Does it cross into cells, hit the target in situ, and kill the cancer cell?", "cell",
     "motivated by the computed developability flags (PAINS/Brenk, permeability liabilities)"),
    ("4. Establish ADMET / PK", "In-vitro ADME (microsomes, hERG, Caco-2) and, if it advances, animal PK/tox.",
     "Is it developable and safe enough to advance?", "admet",
     "motivated by the computed physicochemical / Pfizer-3-75 / GSK-4-400 flags"),
]


def _load(run: Path) -> dict:
    out: dict = {}
    dj = run / "dossier.json"
    if dj.exists():
        out["dossier"] = json.loads(dj.read_text())
    for name, key in (("docked_hits.csv", "docked"), ("hits.csv", "hits")):
        p = run / name
        if p.exists():
            with p.open() as fh:
                out[key] = list(csv.DictReader(fh))
    return out


def build(run: Path, top_n: int = 5) -> dict:
    data = _load(run)
    dossier = data.get("dossier") or {}
    target = (dossier.get("chembl_target") or {}).get("name") or dossier.get("query") or run.name
    symbol = dossier.get("query") or run.name
    # Independent target validation (Open Targets genetic evidence) — best-effort, fetched data; the
    # single most useful signal of whether the target is worth taking to the bench. Skips on any error.
    ot = None
    try:
        import target_evidence as TE
        ev = TE.evidence(symbol)
        if "error" not in ev:
            ot = ev
    except Exception:
        ot = None
    candidates = []
    rows = data.get("docked") or data.get("hits") or []
    for r in rows[:top_n]:
        candidates.append({
            "chembl_id": r.get("chembl_id"),
            "smiles": r.get("smiles"),
            "vina_dG": r.get("vina_best_dG_kcal_per_mol"),
            "pchembl": r.get("pchembl_median") or r.get("best_pchembl"),
            "chembl_url": f"https://www.ebi.ac.uk/chembl/compound_report_card/{r.get('chembl_id')}/",
        })
    return {"target": target, "has_docking": "docked" in data, "candidates": candidates,
            "n_candidates": len(candidates), "ot": ot}


def to_markdown(pkg: dict, run_name: str) -> str:
    t = pkg["target"]
    L = [f"# Experimental-validation request — {t}", "",
         "> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity "
         "re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not "
         "validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every "
         "figure is fetched-from-source or deterministically computed and re-checkable with "
         "`cad/verify.py`. Research only; not medical advice.", "",
         f"## Candidates to test ({pkg['n_candidates']})", ""]
    if pkg["candidates"]:
        L.append("| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | record |")
        L.append("|---|---|---|---|---|")
        for i, c in enumerate(pkg["candidates"], 1):
            L.append(f"| {i} | {c['chembl_id']} | {c['vina_dG'] or '—'} | {c['pchembl'] or '—'} | "
                     f"[ChEMBL]({c['chembl_url']}) |")
        L += ["", "_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's "
              "`hits.csv` / `docked_hits.csv`._", ""]
    else:
        L += ["_Run the pipeline first (`cad/run_pipeline.py --target ... --dock-top-n 10`) to populate "
              "candidates._", ""]
    if pkg.get("ot"):
        try:
            import target_evidence as TE
            L += [TE.to_markdown(pkg["ot"]), ""]
        except Exception:
            pass
    L += ["## The experiments that would validate it (in order)", ""]
    for title, assay, question, key, motiv in CHAIN:
        L.append(f"### {title}")
        L.append(f"- **Question:** {question}")
        L.append(f"- **Assay:** {assay}")
        L.append(f"- **Why now:** {motiv}.")
        L.append("- **Where it can be run:**")
        for name, url, what in PARTNERS[key]:
            L.append(f"  - [{name}]({url}) — {what}")
        L.append("")
    L += ["## Translation / collaboration routes", ""]
    for name, url, what in PARTNERS["translation"]:
        L.append(f"- [{name}]({url}) — {what}")
    L += ["", "---",
          "_Generated by `cad/validation_package.py` from a re-verifiable run. Provenika hands off a "
          "hypothesis; the wet lab decides what to test. Developed by ErosolarAI._"]
    return "\n".join(L)


def pitch_email(pkg: dict) -> str:
    t = pkg["target"]
    top = pkg["candidates"][0]["chembl_id"] if pkg["candidates"] else "the prioritized compounds"
    return (f"Subject: Collaboration — experimental validation of {t} candidate(s)\n\n"
            f"Hello,\n\n"
            f"I'm sharing a small, fully-cited computational prioritization for {t}: public ChEMBL "
            f"bioactivity re-ranked by structure-aware docking, with {top} among the top candidates. "
            f"These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to "
            f"run the first experimental step: a biochemical IC50/Ki to confirm binding, then a "
            f"selectivity panel.\n\n"
            f"Every figure is traceable to a public source and re-checkable in one command; I can send "
            f"the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your "
            f"group/services, or is there a better route (e.g. an NCI DTP screening submission)?\n\n"
            f"Thank you,\n[your name]\n")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Generate an experimental-validation request + lab pitch from a run.")
    p.add_argument("--run", required=True, help="A pipeline run directory.")
    p.add_argument("--top-n", type=int, default=5)
    p.add_argument("--out", help="Write the markdown request here (default: <run>/VALIDATION-REQUEST.md).")
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    run = Path(args.run)
    if not run.exists():
        print(f"No such run: {run}", file=sys.stderr)
        return 1
    pkg = build(run, args.top_n)
    if args.json:
        print(json.dumps(pkg, indent=2))
        return 0
    md = to_markdown(pkg, run.name)
    out = Path(args.out) if args.out else run / "VALIDATION-REQUEST.md"
    out.write_text(md + "\n\n## Ready-to-send pitch (draft — sends nothing)\n\n```\n" + pitch_email(pkg) + "```\n")
    print(f"Wrote {out}  ({pkg['n_candidates']} candidates, {len(CHAIN)} experiment steps).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
