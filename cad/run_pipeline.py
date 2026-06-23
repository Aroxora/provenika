#!/usr/bin/env python3
"""
End-to-end CADD triage pipeline — one command, real public data, real artifacts.

Chains the stage tools for a target into an output directory:
  1. target_report.py   -> dossier.json        (druggability / structures / known drugs)
  2. virtual_triage.py  -> hits.csv            (ranked ligands + SMILES + ChEMBL links)
  2b. cheminformatics.py -> liabilities.json    (PAINS/Brenk alerts on the hits; RDKit, optional)
  3. fetch_structure.py -> structures/          (best PDB or AlphaFold model)
  4. binding_site.py    -> binding_site.json    (docking box from the co-crystal ligand)
  5. cost_benefit.py    -> cost_benefit.json    (go/no-go feasibility for a modality)
and writes SUMMARY.md tying them together — including a ready-to-run dock command.

Docking (stage 6, cad/dock.py) is the explicit next step because it needs the
AutoDock Vina binary; the box from stage 4 is fed straight into it.

Usage:
  python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 \
      --incidence 60000 --price 150000 --out runs/egfr
"""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
import provenance as prov  # noqa: E402


def _run_json(script: str, extra: list[str]) -> dict | None:
    res = subprocess.run([sys.executable, str(HERE / script), *extra, "--json"],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  ! {script} failed: {res.stderr.strip()[:200]}", file=sys.stderr)
        return None
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError:
        return None


def _run(script: str, extra: list[str]) -> bool:
    res = subprocess.run([sys.executable, str(HERE / script), *extra],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  ! {script} failed: {res.stderr.strip()[:200]}", file=sys.stderr)
        return False
    return True


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Run the end-to-end CADD triage pipeline for a target.")
    p.add_argument("--target", required=True)
    p.add_argument("--modality", default="small_molecule")
    p.add_argument("--phase", default="phase1")
    p.add_argument("--incidence", type=int, default=50000)
    p.add_argument("--price", type=float, default=150000)
    p.add_argument("--min-pchembl", type=float, default=7.0)
    p.add_argument("--limit", type=int, default=25)
    p.add_argument("--out", default="runs/out")
    args = p.parse_args(argv)

    out = Path(args.out)

    print(f"[1/5] Target dossier for {args.target}…")
    dossier = _run_json("target_report.py", ["--target", args.target])
    if not dossier:
        print(
            f"\n✗ Could not resolve '{args.target}' to a ChEMBL/UniProt target "
            "(unknown gene/protein, or the lookup failed).",
            file=sys.stderr,
        )
        print(
            "  Refusing to write a feasibility verdict for an unresolved target: a go/no-go\n"
            "  number with no target evidence behind it is exactly the fabrication this tool\n"
            "  exists to prevent. The cost-benefit model is target-independent, so emitting it\n"
            f"  here would falsely imply '{args.target}' was assessed.",
            file=sys.stderr,
        )
        print(
            f"  Nothing written to {out}/. If '{args.target}' is a known target, the public APIs\n"
            "  (ChEMBL/UniProt) may be temporarily unavailable or rate-limited — wait and retry.\n"
            "  Otherwise check the target name (gene symbol or protein name).",
            file=sys.stderr,
        )
        return 2
    out.mkdir(parents=True, exist_ok=True)
    (out / "dossier.json").write_text(json.dumps(dossier, indent=2))

    print(f"[2/5] Ligand triage…")
    _run("virtual_triage.py", ["--target", args.target, "--min-pchembl", str(args.min_pchembl),
                               "--limit", str(args.limit), "--out", str(out / "hits.csv")])

    # Structural-liability flags (PAINS / Brenk) on the hits — RDKit, optional. Skipped
    # cleanly (note in SUMMARY) when RDKit is absent, so the core stays stdlib-only.
    liabilities = None
    if (out / "hits.csv").exists():
        # Also emit a 3-D SDF of the hits (with property tags) for docking/visualization tools.
        liabilities = _run_json("cheminformatics.py",
                                ["--csv", str(out / "hits.csv"), "--sdf", str(out / "hits.sdf")])
        if liabilities and liabilities.get("results"):
            (out / "liabilities.json").write_text(json.dumps(liabilities, indent=2))

    print(f"[3/5] Structure acquisition…")
    struct = _run_json("fetch_structure.py", ["--target", args.target, "--out", str(out / "structures")])

    print(f"[4/5] Binding-site / docking box…")
    box = None
    pdb_id = (struct or {}).get("pdb_id")
    if pdb_id:
        box = _run_json("binding_site.py", ["--pdb", pdb_id])
        if box:
            (out / "binding_site.json").write_text(json.dumps(box, indent=2))
    else:
        print("  (no experimental PDB — skipping box; AlphaFold model only)")

    print(f"[5/5] Cost-benefit / feasibility ({args.modality} @ {args.phase})…")
    cb = _run_json("cost_benefit.py", ["--modality", args.modality, "--phase", args.phase,
                                       "--incidence", str(args.incidence), "--price", str(args.price)])
    if cb:
        (out / "cost_benefit.json").write_text(json.dumps(cb, indent=2))

    # provenance.json — where every reported figure came from (anti-hallucination
    # spine). Re-check it with `python3 cad/verify.py --run <out>`.
    manifest = prov.Manifest(target=args.target, stamp=date.today().isoformat())
    if dossier:
        u = dossier.get("uniprot") or {}
        c = dossier.get("chembl") or {}
        tid = (dossier.get("chembl_target") or {}).get("id")
        if u.get("accession") is not None:
            manifest.fetched("uniprot_accession", u.get("accession"), "uniprot",
                             prov.source_url("uniprot", "entry", u.get("accession")))
            manifest.fetched("pdb_structure_count", u.get("pdb_count"), "uniprot",
                             prov.source_url("uniprot", "entry", u.get("accession")))
        if tid:
            manifest.fetched("chembl_potent_activity_records", c.get("potent_activity_records"),
                             "chembl", prov.source_url("chembl", "activity_count", tid))
            manifest.fetched("chembl_known_mechanism_drugs", len(c.get("known_mechanism_drugs", [])),
                             "chembl", prov.source_url("chembl", "mechanisms", tid))
    if (out / "hits.csv").exists():
        n = max(0, sum(1 for _ in (out / "hits.csv").open()) - 1)
        manifest.fetched("ranked_ligand_candidates", n, "chembl",
                         "https://www.ebi.ac.uk/chembl/api/data/docs",
                         note="ChEMBL bioactivities ranked by a transparent potency+drug-likeness score")
    if pdb_id:
        manifest.fetched("receptor_pdb_id", pdb_id, "rcsb", prov.source_url("rcsb", "entry", pdb_id))
    if box:
        manifest.computed("docking_box", {"center": box.get("center"), "size": box.get("size")},
                          "geometric envelope of the co-crystal ligand in the receptor PDB",
                          note=f"derived from {box.get('pdb')} via cad/binding_site.py")
    if cb:
        manifest.computed("probability_of_approval", cb.get("probability_of_approval"),
                          prov.source_url("benchmarks", "entry", None),
                          note="BIO/Informa CDSR 2011-2020 × oncology factor (cad/cost_benefit.py)")
        manifest.computed("benefit_cost_ratio", cb.get("benefit_cost_ratio"),
                          prov.source_url("benchmarks", "entry", None),
                          note="risk-adjusted revenue / expected remaining cost (cad/cost_benefit.py)")
    manifest.write(out)

    # SUMMARY.md
    lines = [f"# CADD pipeline summary — {args.target}", ""]
    if dossier:
        u = dossier.get("uniprot") or {}
        c = dossier.get("chembl") or {}
        lines += [
            "## Target dossier",
            f"- UniProt: {u.get('accession')} ({u.get('length')} aa)",
            f"- PDB structures: {u.get('pdb_count')} (docking feasible: {'yes' if u.get('pdb_count') else 'no'})",
        ]
        if "potent_activity_records" in c:
            lines += [
                f"- Potent ChEMBL activities: {c.get('potent_activity_records')}",
                f"- Known mechanism drugs: {len(c.get('known_mechanism_drugs', []))}",
            ]
        else:
            lines.append(f"- ChEMBL tractability: {c.get('status', 'unavailable')} — "
                         "ligand triage skipped; re-run when ChEMBL is back.")
        lines.append("")
    if (out / "hits.csv").exists():
        with (out / "hits.csv").open() as fh:
            hit_rows = list(csv.DictReader(fh))
        lines += ["## Ligand triage",
                  f"- {len(hit_rows)} ranked candidates → `hits.csv` (SMILES + ChEMBL links)"]
        if (out / "hits.sdf").exists():
            lines.append("- 3-D structures → `hits.sdf` (load directly into docking/visualization tools)")
        top = hit_rows[:10]
        no_props = sum(1 for r in top if not (r.get("qed") or "").strip())
        if no_props:
            lines.append(f"- ⚠️ {no_props}/{len(top)} top hits lack computed drug-likeness "
                         "(e.g. macrocycles/peptides) — those rows are ranked on potency alone; treat with care.")
        lines.append("")
        # Structural-liability flags (RDKit). Surfaces PAINS / Brenk alerts a chemist should see.
        if liabilities and liabilities.get("results"):
            rs = liabilities["results"]
            n_pains = sum(1 for r in rs if r.get("pains_alerts"))
            n_brenk = sum(1 for r in rs if r.get("brenk_alerts"))
            n_tox = sum(1 for r in rs if r.get("pfizer_tox_risk"))
            flagged = [r.get("id") for r in rs if r.get("pains_alerts") or r.get("brenk_alerts")]
            lines += [
                "## Structural liabilities (RDKit — PAINS / Brenk / developability)",
                f"- {n_pains}/{len(rs)} hits carry a PAINS (assay-interference) alert; "
                f"{n_brenk}/{len(rs)} carry a Brenk (reactive/unstable-group) alert → `liabilities.json`.",
                f"- {n_tox}/{len(rs)} fall in the Pfizer 3/75 zone (cLogP>3 & TPSA<75 — elevated in-vivo tox risk; Hughes 2008).",
            ]
            if flagged:
                lines.append(f"- Scrutinize before pursuing: {', '.join(str(f) for f in flagged[:6])}"
                             + (" …" if len(flagged) > 6 else ""))
            lines += ["_Structural alerts are heuristic medicinal-chemistry filters, not disqualifiers "
                      "— review each in context._", ""]
        else:
            lines += ["## Structural liabilities",
                      "- (install RDKit — `pip install rdkit` — to flag PAINS/Brenk structural alerts on the hits)", ""]
    structs = sorted((out / "structures").glob("*")) if (out / "structures").exists() else []
    if structs:
        lines += ["## Structure", f"- {structs[0].name} → `structures/`", ""]
    if box:
        lig = box.get("ligand", {})
        lines += [
            "## Binding-site / docking box",
            f"- Reference ligand: {lig.get('resName')} (chain {lig.get('chain')}, {box.get('ligandAtoms')} atoms) in {box.get('pdb')}",
            f"- Box center (Å): {box.get('center')} · size (Å): {box.get('size')}",
            "",
        ]
    if cb:
        lines += [
            "## Cost-benefit / feasibility",
            f"_Modality/phase-level benchmark ({args.modality} @ {args.phase}) from public priors —"
            " **not** a target-specific prediction. Identical inputs give identical figures for any"
            " target; it does not 'know' this target. Treat as a transparent planning heuristic._",
            f"- P(approval) from {cb['phase']}: {cb['probability_of_approval']*100:.1f}%",
            f"- Expected remaining cost: ${cb['expected_remaining_cost_musd']:,.0f}M over {cb['expected_time_to_market_years']} yr",
            f"- Risk-adjusted revenue: ${cb['risk_adjusted_revenue_musd']:,.0f}M; benefit/cost {cb['benefit_cost_ratio']:.2f}",
            f"- **{cb['verdict']}**",
            "",
        ]
    lines.append("## Next step: dock (stage 6)")
    if box and structs:
        lines.append("- Confirm AutoDock Vina + Open Babel are installed: `python3 cad/dock.py --check`")
        lines.append(f"- `python3 cad/dock.py --receptor {out}/structures/{structs[0].name} "
                     f"--smiles \"<hit SMILES from hits.csv>\" --box-json {out}/binding_site.json`")
    else:
        lines.append("- No experimental box available; pick a pocket (fpocket/P2Rank) or an AlphaFold model first.")
    lines += [
        "## Provenance",
        "- Every figure above is fetched-and-cited or deterministically computed — see `provenance.json`.",
        f"- Re-prove it: `python3 cad/verify.py --run {out}`  (re-pulls each number from its live source).",
        "",
        "_Research only. Every figure points to a public source — verify before relying on it._",
    ]
    (out / "SUMMARY.md").write_text("\n".join(lines))

    # Report only what actually got written — never list files that don't exist.
    expected = ["SUMMARY.md", "dossier.json", "hits.csv", "hits.sdf", "liabilities.json", "structures",
                "binding_site.json", "cost_benefit.json", "provenance.json"]
    written = [name for name in expected if (out / name).exists()]
    print(f"\nDone → {out}/  ({', '.join(written)})")
    print(f"Verify every figure is real:  python3 cad/verify.py --run {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
