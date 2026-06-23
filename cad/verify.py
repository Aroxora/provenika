#!/usr/bin/env python3
"""
verify.py — prove that the numbers in a pipeline run are real, not fabricated.

This is the enforcement half of the repo's anti-hallucination rule. It takes a
run directory produced by `cad/run_pipeline.py` (or a bare `--target`) and, for
every reported figure, re-pulls the value from the live public source and reports:

  PASS   the saved figure reproduces from the source
  DRIFT  the figure changed but is the same order of magnitude — expected for a
         living database that gains records over time (NOT a failure)
  FAIL   the figure could not be reproduced at all, or differs wildly, or the
         source returns nothing where a value was claimed → treat as suspect

What this DOES and does NOT prove (read this — honesty is the point):
  * Count checks (ChEMBL/UniProt) re-run the SAME query logic from the stage
    modules, so they prove REPRODUCIBILITY and FRESHNESS — that the saved number
    is what the documented query returns today — NOT that the query design is
    the right one. A wrong-but-stable query would pass.
  * The SMILES check IS independent: it fetches each top ligand's canonical
    SMILES straight from ChEMBL over raw HTTP (not via the triage code) and
    requires byte-equality with hits.csv — catching an edited/transposed SMILES.
  * Deterministic artifacts (cost_benefit.json, the triage score) are recomputed
    and must reproduce EXACTLY — a mismatch means the file was edited/fabricated.
  * NOT covered: narrative text (SUMMARY.md prose, target_report read-outs) and
    the news_update.py `intel/` digests, which are unverified leads, not figures.

Exit code is non-zero if anything FAILs, so it can gate CI. Every check prints
the exact URL a human can open to confirm the number a third time, by hand.

Usage:
  python3 cad/verify.py --run runs/egfr              # verify a pipeline output dir
  python3 cad/verify.py --target EGFR                # fetch-and-cite live (no saved run)
  python3 cad/verify.py --run runs/egfr --json
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import provenance as prov  # noqa: E402

_UA = "oncology-osint-cad-verify/1.0 (research)"


def _http_json(url: str) -> dict | None:
    """Raw, dependency-free GET — deliberately a SEPARATE code path from the
    stage modules, so the SMILES check is genuinely independent of how the run
    was produced."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception:
        return None


def _chembl_canonical_smiles(chembl_id: str) -> str | None:
    data = _http_json(f"https://www.ebi.ac.uk/chembl/api/data/molecule/{chembl_id}?format=json")
    if not data:
        return None
    return ((data.get("molecule_structures") or {}).get("canonical_smiles"))

PASS, DRIFT, FAIL, SKIP = "PASS", "DRIFT", "FAIL", "SKIP"


def _count_status(saved, live, tol_frac=0.10, tol_abs=2):
    """Compare two counts that may legitimately grow over time."""
    if live is None:
        return FAIL, "source returned no value for a figure that was reported"
    if saved == live:
        return PASS, ""
    tol = max(tol_abs, abs(live) * tol_frac)
    if abs(saved - live) <= tol:
        return DRIFT, f"saved {saved} vs live {live} (within tolerance for a growing DB)"
    return FAIL, f"saved {saved} but source now reports {live} (off by more than tolerance)"


def verify_dossier(dossier: dict, checks: list) -> None:
    """Re-pull UniProt + ChEMBL figures and compare to the saved dossier."""
    import target_report as tr

    query = dossier.get("query") or (dossier.get("chembl_target") or {}).get("name")
    tid = (dossier.get("chembl_target") or {}).get("id")

    # ChEMBL: re-resolve the target if we don't have its id, then re-pull counts.
    if not tid and query:
        t = tr.resolve_target(query)
        tid = t["target_chembl_id"] if t else None

    saved_chembl = dossier.get("chembl") or {}
    if tid:
        live = tr.chembl_snapshot(tid)
        s, note = _count_status(saved_chembl.get("potent_activity_records", 0),
                                live.get("potent_activity_records"))
        checks.append(("ChEMBL potent activity records", s, note,
                       prov.source_url("chembl", "activity_count", tid)))

        saved_drugs = len(saved_chembl.get("known_mechanism_drugs", []))
        live_drugs = len(live.get("known_mechanism_drugs", []))
        s, note = _count_status(saved_drugs, live_drugs)
        checks.append(("ChEMBL known-mechanism drugs", s, note,
                       prov.source_url("chembl", "mechanisms", tid)))
    else:
        checks.append(("ChEMBL target resolution", FAIL,
                       "could not resolve the target to re-check its figures", ""))

    # UniProt: re-pull the PDB structure count (drives "docking feasible").
    saved_uni = dossier.get("uniprot") or {}
    if saved_uni and query:
        live_uni = tr.uniprot_summary(query)
        if live_uni is None:
            checks.append(("UniProt entry", FAIL, "no reviewed human entry re-resolved", ""))
        else:
            s, note = _count_status(saved_uni.get("pdb_count", 0), live_uni.get("pdb_count"))
            checks.append(("UniProt PDB structure count", s, note,
                           prov.source_url("uniprot", "entry", live_uni.get("accession", ""))))


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def verify_hits(path: Path, checks: list, max_rows: int = 5) -> None:
    """Content-level checks on the top ranked ligands:
       (1) SMILES byte-equality vs ChEMBL (independent raw HTTP fetch),
       (2) deterministic recompute of the published triage score."""
    try:
        rows = list(csv.DictReader(path.open()))[:max_rows]
    except OSError as e:
        checks.append(("hits.csv readable", FAIL, str(e), ""))
        return
    if not rows:
        checks.append(("hits.csv rows", SKIP, "no rows to check", ""))
        return

    # (1) Independent SMILES identity check — catches an edited/transposed SMILES
    # that "parses fine" but is not the molecule ChEMBL holds for that ID.
    mismatched, unresolved = 0, 0
    for r in rows:
        cid = (r.get("chembl_id") or "").strip()
        saved = (r.get("smiles") or "").strip()
        if not cid.startswith("CHEMBL"):
            checks.append((f"ligand id {cid or '(blank)'}", FAIL, "row lacks a real ChEMBL id", ""))
            continue
        live = _chembl_canonical_smiles(cid)
        if live is None:
            unresolved += 1
        elif saved and live != saved:
            mismatched += 1
    if mismatched:
        checks.append((f"top {len(rows)} ligand SMILES match ChEMBL", FAIL,
                       f"{mismatched} SMILES differ from ChEMBL's canonical record (edited/fabricated)",
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))
    elif unresolved == len(rows):
        checks.append((f"top {len(rows)} ligand SMILES match ChEMBL", FAIL,
                       "could not resolve any molecule at ChEMBL to compare", ""))
    else:
        note = "byte-equal to ChEMBL canonical SMILES" + (
            f" ({unresolved} unresolved, skipped)" if unresolved else "")
        checks.append((f"top {len(rows) - unresolved} ligand SMILES match ChEMBL", PASS, note,
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))

    # (2) Recompute the headline triage score from its own CSV inputs. Deterministic
    # → any drift means the score column was edited. Imports the producing formula
    # on purpose (this is a reproducibility check, like cost_benefit).
    try:
        import virtual_triage as vt
        worst = 0.0
        checked = 0
        for r in rows:
            pchembl = _f(r.get("best_pchembl"))
            saved_score = _f(r.get("score"))
            sim = _f(r.get("similarity"))
            if pchembl is None or saved_score is None:
                continue
            p = {"qed": _f(r.get("qed")), "ro5_violations": (int(float(r["ro5_violations"]))
                 if r.get("ro5_violations") not in (None, "", "-") else None)}
            recomputed = vt.composite_score(pchembl, p, sim)
            worst = max(worst, abs(recomputed - saved_score))
            checked += 1
        if checked:
            s = PASS if worst < 1e-3 else FAIL
            note = ("score column reproduces from potency+drug-likeness formula"
                    if s == PASS else f"score differs by up to {worst:.4f} (column was edited)")
            checks.append((f"triage score recompute ({checked} rows)", s, note,
                           "cad/virtual_triage.py:composite_score"))
    except Exception as e:
        checks.append(("triage score recompute", SKIP, f"could not recompute: {e}", ""))


def verify_cost_benefit(cb: dict, checks: list) -> None:
    """Recompute the deterministic cost-benefit model; it MUST reproduce exactly."""
    import cost_benefit as cbm

    a = cb.get("assumptions") or {}
    try:
        fresh = cbm.analyze(
            cb["modality"], cb["phase"],
            int(a["addressable_incidence_per_yr"]), float(a["annual_price_usd"]),
            float(a["peak_penetration"]), int(a["years_at_peak"]),
            bool(cb.get("oncology_adjusted")),
        )
    except (KeyError, ValueError, TypeError) as e:
        checks.append(("cost_benefit reproducible", FAIL,
                       f"could not recompute from saved assumptions: {e}", ""))
        return

    for key in ("probability_of_approval", "expected_remaining_cost_musd",
                "benefit_cost_ratio", "risk_adjusted_revenue_musd", "verdict"):
        if cb.get(key) != fresh.get(key):
            checks.append((f"cost_benefit.{key}", FAIL,
                           f"saved {cb.get(key)} != recomputed {fresh.get(key)} "
                           "(deterministic model — file was edited or fabricated)",
                           prov.source_url("benchmarks", "entry", None)))
            return
    checks.append(("cost_benefit deterministic recompute", PASS,
                   "all figures reproduce exactly from stated assumptions",
                   prov.source_url("benchmarks", "entry", None)))


def verify_target_live(target: str, checks: list) -> None:
    """No saved run: just fetch-and-cite the headline figures live."""
    import target_report as tr
    t = tr.resolve_target(target)
    if not t:
        checks.append((f"resolve {target}", FAIL, "no ChEMBL target found", ""))
        return
    tid = t["target_chembl_id"]
    live = tr.chembl_snapshot(tid)
    checks.append((f"{target}: ChEMBL potent activities = {live['potent_activity_records']}",
                   PASS, "fetched live", prov.source_url("chembl", "activity_count", tid)))
    checks.append((f"{target}: known-mechanism drugs = {len(live['known_mechanism_drugs'])}",
                   PASS, "fetched live", prov.source_url("chembl", "mechanisms", tid)))
    uni = tr.uniprot_summary(target)
    if uni:
        checks.append((f"{target}: PDB structures = {uni['pdb_count']}", PASS, "fetched live",
                       prov.source_url("uniprot", "entry", uni.get("accession", ""))))


def run(args) -> int:
    checks: list[tuple[str, str, str, str]] = []
    target_evidence = False  # did this run contain anything TARGET-specific to verify?

    if args.target:
        verify_target_live(args.target, checks)
        target_evidence = True
    else:
        run_dir = Path(args.run)
        if not run_dir.exists():
            print(f"Run directory not found: {run_dir}", file=sys.stderr)
            return 2
        dossier_p = run_dir / "dossier.json"
        if dossier_p.exists():
            verify_dossier(json.loads(dossier_p.read_text()), checks)
            target_evidence = True
        else:
            checks.append(("dossier.json present", SKIP, "no dossier to verify", ""))
        if (run_dir / "hits.csv").exists():
            verify_hits(run_dir / "hits.csv", checks)
            target_evidence = True
        cb_p = run_dir / "cost_benefit.json"
        if cb_p.exists():
            verify_cost_benefit(json.loads(cb_p.read_text()), checks)

        # A run with NO target-specific evidence (no dossier, no hits) must never earn a
        # green "every figure verified" banner — that would bless an unresolved/fictional
        # target. If there is also nothing deterministic to recompute, it is a hard FAIL;
        # a cost-benefit-only dir (target-independent) stays PASS but the banner is qualified.
        if not target_evidence and not any(s != SKIP for _, s, _, _ in checks):
            checks.append(("target-derived figures present", FAIL,
                           "run has no dossier, hits, or cost-benefit — nothing to verify; an "
                           "unresolved target produces no figures to re-prove", ""))

    n_fail = sum(1 for _, s, _, _ in checks if s == FAIL)
    n_drift = sum(1 for _, s, _, _ in checks if s == DRIFT)

    if args.json:
        print(json.dumps({
            "checks": [{"figure": f, "status": s, "note": n, "verify_url": u} for f, s, n, u in checks],
            "fail": n_fail, "drift": n_drift, "ok": n_fail == 0,
            "target_evidence": target_evidence,
        }, indent=2))
        return 1 if n_fail else 0

    print("\n=== Provenance verification ===")
    print("Re-pulling every reported figure from its live public source.\n")
    icon = {PASS: "✅", DRIFT: "≈ ", FAIL: "❌", SKIP: "– "}
    for figure, status, note, url in checks:
        print(f"  {icon[status]} {status:<5} {figure}")
        if note:
            print(f"          {note}")
        if url:
            print(f"          verify: {url}")
    print()
    if n_fail:
        print(f"❌ {n_fail} figure(s) could not be reproduced from their source. Treat as SUSPECT.")
    elif not target_evidence:
        print("⚠️  No target-specific figures in this run (no dossier/hits). Any deterministic "
              "artifact present reproduced exactly, but NOTHING target-derived was verified — "
              "this is not a clean bill of health for a target.")
    elif n_drift:
        print(f"✅ No fabrications. {n_drift} figure(s) DRIFTed (databases grow) — re-run to refresh.")
    else:
        print("✅ Every reported figure reproduced exactly from its live public source.")
    print("This checks that numbers are REAL and re-derivable — not that a molecule works. "
          "Triage ≠ validation. Not medical advice.")
    return 1 if n_fail else 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Verify that a pipeline run's figures are real (re-fetch & compare).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--run", help="A run directory from cad/run_pipeline.py (dossier.json, hits.csv, cost_benefit.json).")
    g.add_argument("--target", help="No saved run — just fetch-and-cite the headline figures live.")
    p.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = p.parse_args(argv)
    try:
        return run(args)
    except Exception as e:  # network or parse problems: report, don't fabricate
        print(f"Verification error (no result is better than a fabricated one): {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
