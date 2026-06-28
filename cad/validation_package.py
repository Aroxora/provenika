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
  python3 cad/validation_package.py --run runs/kras --region cn   # China CROs + Simplified-Chinese pitch
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
try:
    import cn_labs as CN  # China-region bench routes + Simplified-Chinese pitch
except Exception:           # pragma: no cover - module always present, defensive only
    CN = None
try:
    import resistance as RES  # curated, cited clinical resistance landscape
except Exception:           # pragma: no cover
    RES = None

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


def _chembl_name_phase(cid: str) -> tuple[str | None, float | None]:
    """Resolve a ChEMBL molecule id to (preferred name, max_phase). Raw HTTP, best-effort."""
    try:
        url = f"https://www.ebi.ac.uk/chembl/api/data/molecule/{cid}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "provenika-validation/1.0 (research)"})
        with urllib.request.urlopen(req, timeout=20) as r:
            d = json.load(r)
        ph = d.get("max_phase")
        try:
            ph = float(ph) if ph is not None else None
        except (TypeError, ValueError):
            ph = None
        return d.get("pref_name"), ph
    except Exception:
        return None, None


_PHASE_LABEL = {4.0: "approved", 3.0: "phase 3", 2.0: "phase 2", 1.0: "phase 1"}


def standard_of_care(dossier: dict, limit: int = 12) -> list[dict]:
    """The drugs that already hit this target — the bar a new molecule must clear. Reads the dossier's
    known-mechanism drugs (real ChEMBL mechanism data, re-verified by cad/verify.py), resolves each to a
    name + clinical phase, dedupes by name, and returns the most-advanced first. Network best-effort;
    returns [] if there are no known-mechanism drugs or the lookups fail (never raises)."""
    kmd = ((dossier.get("chembl") or {}).get("known_mechanism_drugs")) or []
    seen, out = set(), []
    for m in kmd[:limit]:
        cid = m.get("molecule_chembl_id")
        if not cid:
            continue
        name, phase = _chembl_name_phase(cid)
        if not name or name.upper() in seen:
            continue
        seen.add(name.upper())
        out.append({"name": name, "phase": phase, "chembl_id": cid,
                    "action": m.get("action_type")})
    out.sort(key=lambda d: (d["phase"] if d["phase"] is not None else -1), reverse=True)
    return out


def _phase_label(phase) -> str:
    """A human label for a ChEMBL max_phase float — 'approved' / 'phase 3' / 'preclinical'."""
    if phase in _PHASE_LABEL:
        return _PHASE_LABEL[phase]
    if phase:
        return f"phase {phase:g}"
    return "preclinical"


def soc_snapshot(runs, generated: str | None = None) -> dict:
    """The cross-portfolio standard-of-care snapshot the web surfaces — for each run directory, the drugs
    that already hit its target (the bar a new molecule must beat), resolved name + clinical phase from
    that run's committed, re-verifiable dossier. Network best-effort per drug; a run with no known-
    mechanism drugs (or offline) simply yields an empty list — it never raises and never fabricates."""
    targets = []
    for run in runs:
        run = Path(run)
        dj = run / "dossier.json"
        if not dj.exists():
            continue
        dossier = json.loads(dj.read_text())
        symbol = (dossier.get("query") or run.name).upper()
        drugs = standard_of_care(dossier)
        for d in drugs:
            d["phase_label"] = _phase_label(d.get("phase"))
        targets.append({"symbol": symbol, "n_drugs": len(drugs), "drugs": drugs})
    payload = {
        "source": "ChEMBL known-mechanism drugs per target (re-verifiable via cad/verify.py), resolved to "
                  "name + max clinical phase.",
        "n_targets": len(targets),
        "targets": targets,
        "disclaimer": "The bar a new molecule must beat — on potency, selectivity, resistance coverage, or "
                      "tolerability, not merely binding. Drugs are real ChEMBL mechanism data; phase is "
                      "ChEMBL max_phase. Research only; not medical advice.",
    }
    return {"generated": generated, **payload} if generated else payload


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
            # Clinical status (ChEMBL max_phase, carried as dev_phase) — tells a reader whether a top
            # candidate is novel chemical matter or an already-advanced/approved drug (repurposing).
            "status": (r.get("dev_phase") or "—"),
            "chembl_url": f"https://www.ebi.ac.uk/chembl/compound_report_card/{r.get('chembl_id')}/",
        })
    soc = standard_of_care(dossier)  # best-effort; [] if none or offline
    return {"target": target, "symbol": symbol, "has_docking": "docked" in data, "candidates": candidates,
            "n_candidates": len(candidates), "ot": ot, "standard_of_care": soc}


def _status_summary(candidates: list[dict]) -> str | None:
    """One honest, data-derived line: are these novel chemical matter, or already-advanced drugs?
    Derived from each candidate's ChEMBL clinical status — adapts if a run surfaces clinical/approved
    compounds (then it's a repurposing/fast-follow read, not novel IP)."""
    if not candidates:
        return None
    adv = [c for c in candidates
           if any(k in (c.get("status") or "").lower() for k in ("phase", "approved", "launched", "marketed"))]
    n = len(candidates)
    if not adv:
        return (f"**All {n} prioritized candidates are research/preclinical compounds** — novel "
                f"chemical-matter starting points, not approved drugs (a fresh-scaffold programme, "
                f"not repurposing).")
    return (f"**{len(adv)} of {n} prioritized candidates are already in clinical development or approved** "
            f"— treat those as repurposing / fast-follow context, not novel IP (per-candidate status above).")


def to_markdown(pkg: dict, run_name: str, region: str = "global") -> str:
    t = pkg["target"]
    cn = region == "cn" and CN is not None
    partners = CN.PARTNERS_CN if cn else PARTNERS
    L = [f"# Experimental-validation request — {t}", "",
         "> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity "
         "re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not "
         "validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every "
         "figure is fetched-from-source or deterministically computed and re-checkable with "
         "`cad/verify.py`. Research only; not medical advice.", ""]
    if cn:
        L += [f"> **中国实验路线 (China bench routes).** {CN.REGION_NOTE_CN}", "",
              f"> **就地运行 (run locally).** {CN.REACHABILITY_NOTE_CN}", ""]
    L += [f"## Candidates to test ({pkg['n_candidates']})", ""]
    if pkg["candidates"]:
        L.append("| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | clinical status | record |")
        L.append("|---|---|---|---|---|---|")
        for i, c in enumerate(pkg["candidates"], 1):
            L.append(f"| {i} | {c['chembl_id']} | {c['vina_dG'] or '—'} | {c['pchembl'] or '—'} | "
                     f"{c.get('status') or '—'} | [ChEMBL]({c['chembl_url']}) |")
        L += ["", "_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's "
              "`hits.csv` / `docked_hits.csv`._", ""]
        summary = _status_summary(pkg["candidates"])
        if summary:
            L += [summary, ""]
    else:
        L += ["_Run the pipeline first (`cad/run_pipeline.py --target ... --dock-top-n 10`) to populate "
              "candidates._", ""]
    if pkg.get("ot"):
        try:
            import target_evidence as TE
            L += [TE.to_markdown(pkg["ot"]), ""]
        except Exception:
            pass
    soc = pkg.get("standard_of_care") or []
    if soc:
        approved = [d for d in soc if d.get("phase") == 4.0]
        L += ["## Standard of care for this target (what a new molecule must beat)", "",
              "Drugs that already act on this target, from ChEMBL's known-mechanism data — the existing bar. "
              "A new candidate has to earn its place against these on **potency, selectivity, resistance "
              "coverage, or tolerability**, not just bind.", "",
              "| Drug | Stage | mechanism | record |", "|---|---|---|---|"]
        for d in soc:
            stage = _PHASE_LABEL.get(d.get("phase"), "research/other")
            L.append(f"| {d['name'].title()} | {stage} | {(d.get('action') or '').lower()} | "
                     f"[ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/{d['chembl_id']}/) |")
        if approved:
            names = ", ".join(d["name"].title() for d in approved[:6])
            L += ["", f"**Already approved against this target:** {names}. The honest goal for a new "
                  f"molecule is a differentiated advantage over these, not merely activity."]
        L.append("")
    if RES is not None:
        landscape = RES.landscape_markdown(pkg.get("symbol") or "")
        if landscape:
            L += [landscape, ""]
    if cn:
        L += ["## Where to obtain the compounds (domestic suppliers)", "",
              f"{CN.SUPPLIERS_NOTE_CN}", ""]
        for name, url, what in CN.SUPPLIERS_CN:
            L.append(f"- [{name}]({url}) — {what}")
        L.append("")
    L += ["## The experiments that would validate it (in order)", ""]
    for title, assay, question, key, motiv in CHAIN:
        L.append(f"### {title}")
        L.append(f"- **Question:** {question}")
        L.append(f"- **Assay:** {assay}")
        L.append(f"- **Why now:** {motiv}.")
        L.append("- **Where it can be run:**")
        for name, url, what in partners[key]:
            L.append(f"  - [{name}]({url}) — {what}")
        L.append("")
    L += ["## Translation / collaboration routes", ""]
    for name, url, what in partners["translation"]:
        L.append(f"- [{name}]({url}) — {what}")
    if cn:
        rn, ru, rw = CN.CLINICAL_REGISTRY_CN
        L.append(f"- [{rn}]({ru}) — {rw}")
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
    p.add_argument("--run", help="A pipeline run directory.")
    p.add_argument("--top-n", type=int, default=5)
    p.add_argument("--out", help="Write the markdown request here (default: <run>/VALIDATION-REQUEST.md).")
    p.add_argument("--region", choices=["global", "cn"], default="global",
                   help="cn = mainland-China CROs + a Simplified-Chinese pitch (practical inside China).")
    p.add_argument("--json", action="store_true")
    p.add_argument("--soc-snapshot", metavar="PORTFOLIO_DIR",
                   help="Scan a portfolio dir (subdirs with dossier.json) and emit a cross-target "
                        "standard-of-care JSON snapshot (the bar each new molecule must beat).")
    p.add_argument("--date", help="The 'generated' date stamped into the snapshot (default: today, ISO).")
    args = p.parse_args(argv)

    if args.soc_snapshot:
        base = Path(args.soc_snapshot)
        if not base.exists():
            print(f"No such portfolio dir: {base}", file=sys.stderr)
            return 1
        runs = sorted(d for d in base.iterdir() if (d / "dossier.json").exists())
        payload = soc_snapshot(runs, generated=args.date or date.today().isoformat())
        text = json.dumps(payload, indent=2, ensure_ascii=False)
        if args.out:
            out = Path(args.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(text + "\n")
            print(f"Wrote {out} ({payload['n_targets']} targets).", file=sys.stderr)
        else:
            print(text)
        return 0

    if not args.run:
        print("Provide --run <dir> (or --soc-snapshot <portfolio dir>).", file=sys.stderr)
        return 1
    run = Path(args.run)
    if not run.exists():
        print(f"No such run: {run}", file=sys.stderr)
        return 1
    pkg = build(run, args.top_n)
    if args.json:
        print(json.dumps(pkg, indent=2))
        return 0
    md = to_markdown(pkg, run.name, region=args.region)
    cn = args.region == "cn" and CN is not None
    pitch = CN.pitch_email_cn(pkg) if cn else pitch_email(pkg)
    label = "可直接发送的中文邮件（草稿 — 不会自动发送）" if cn else "Ready-to-send pitch (draft — sends nothing)"
    out = Path(args.out) if args.out else run / "VALIDATION-REQUEST.md"
    out.write_text(md + f"\n\n## {label}\n\n```\n" + pitch + "```\n")
    print(f"Wrote {out}  ({pkg['n_candidates']} candidates, {len(CHAIN)} experiment steps, region={args.region}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
