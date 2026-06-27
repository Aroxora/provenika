#!/usr/bin/env python3
"""Offline tests for the validation-package / bench-bridge generator (cad/validation_package.py)."""

from __future__ import annotations

import csv
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import validation_package as V  # noqa: E402
import target_evidence as _TE  # noqa: E402

# Keep these tests OFFLINE: validation_package now best-effort-fetches Open Targets; stub it out.
_TE.resolve_ensembl = lambda s: None

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def _run(d: Path):
    (d / "dossier.json").write_text(json.dumps({"chembl_target": {"name": "EGFR"}, "query": "EGFR"}))
    with (d / "docked_hits.csv").open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["chembl_id", "smiles", "vina_best_dG_kcal_per_mol", "pchembl_median", "dev_phase"])
        w.writeheader()
        w.writerow({"chembl_id": "CHEMBL5746224", "smiles": "CCO", "vina_best_dG_kcal_per_mol": "-9.5", "pchembl_median": "9.5", "dev_phase": "research/preclinical"})
        w.writerow({"chembl_id": "CHEMBL176582", "smiles": "CCN", "vina_best_dG_kcal_per_mol": "-8.2", "pchembl_median": "11.0", "dev_phase": "research/preclinical"})
    return d


def test_build_and_markdown():
    with tempfile.TemporaryDirectory() as t:
        d = _run(Path(t))
        pkg = V.build(d, top_n=5)
        check("target resolved", pkg["target"] == "EGFR")
        check("candidates loaded from docked_hits", pkg["n_candidates"] == 2)
        check("uses docking when present", pkg["has_docking"] is True)
        md = V.to_markdown(pkg, "egfr")
        check("markdown lists the candidate", "CHEMBL5746224" in md)
        check("markdown has all 4 experiment steps", all(s in md for s in
              ("Confirm it binds", "Prove selectivity", "Engage the target", "ADMET")))
        check("markdown names a real free route (NCI-60)", "NCI-60" in md and "dtp.cancer.gov" in md)
        check("markdown is honest: hypotheses not validated hits", "not validated hits" in md.lower())
        check("ΔG labeled not a measured affinity", "NOT a measured affinity" in md)


def test_clinical_status_column_and_summary():
    with tempfile.TemporaryDirectory() as t:
        d = _run(Path(t))
        pkg = V.build(d, top_n=5)
        check("candidate carries clinical status from dev_phase", pkg["candidates"][0]["status"] == "research/preclinical")
        md = V.to_markdown(pkg, "egfr")
        check("markdown table has a clinical-status column", "clinical status" in md)
        check("markdown summarises all-preclinical as novel matter, not repurposing",
              "not repurposing" in md)


def test_status_summary_flips_on_clinical_compounds():
    # If a run surfaces a Phase/approved compound, the read-out must flip to repurposing/fast-follow.
    novel = [{"status": "research/preclinical"}, {"status": "research/preclinical"}]
    check("all-preclinical → novel-matter read", "not repurposing" in V._status_summary(novel))
    mixed = [{"status": "research/preclinical"}, {"status": "Phase 2"}, {"status": "Approved"}]
    s = V._status_summary(mixed)
    check("clinical/approved present → repurposing read", "repurposing" in s.lower() and "2 of 3" in s)
    check("no candidates → no summary line", V._status_summary([]) is None)


def test_pitch_is_a_draft_only():
    with tempfile.TemporaryDirectory() as t:
        pkg = V.build(_run(Path(t)))
        email = V.pitch_email(pkg)
        check("pitch is honest about hypotheses", "not validated hits" in email)
        check("pitch references a real route", "NCI DTP" in email)
        check("pitch leaves the human to send", "[your name]" in email)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} validation-package assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
