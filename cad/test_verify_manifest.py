#!/usr/bin/env python3
"""
Offline tests for verify.py's provenance-manifest cross-check (verify_manifest).

Guards the fix for "the manifest is never verified against the artifacts": a provenance.json
edited in isolation used to go uncaught because verify.py never read it back. No network.
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import provenance as prov  # noqa: E402
import verify as v  # noqa: E402

PASS, FAIL, SKIP = v.PASS, v.FAIL, v.SKIP


def _build(tmp: Path, pdb_count=354, prob=0.051):
    """Write a self-consistent run dir (dossier + cost_benefit + matching provenance.json)."""
    (tmp / "dossier.json").write_text(json.dumps({
        "uniprot": {"accession": "P00533", "pdb_count": pdb_count},
        "chembl": {"potent_activity_records": 21342,
                   "known_mechanism_drugs": [{"molecule_chembl_id": f"C{i}"} for i in range(49)]},
    }))
    (tmp / "cost_benefit.json").write_text(json.dumps({
        "probability_of_approval": prob, "benefit_cost_ratio": 1.03,
    }))
    u = "https://example.org/verify"   # every figure must carry a re-verification reference
    m = prov.Manifest("EGFR", stamp="2026-06-26")
    m.fetched("uniprot_accession", "P00533", "uniprot", u)
    m.fetched("pdb_structure_count", pdb_count, "uniprot", u)
    m.fetched("chembl_potent_activity_records", 21342, "chembl", u)
    m.fetched("chembl_known_mechanism_drugs", 49, "chembl", u)
    m.computed("probability_of_approval", prob, "ref")
    m.computed("benefit_cost_ratio", 1.03, "ref")
    m.write(tmp)


def _status(checks, needle):
    for fig, status, *_ in checks:
        if needle in fig:
            return status
    return None


def test_consistent_manifest_passes():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _build(tmp)
        checks = []
        v.verify_manifest(tmp, checks)
        assert _status(checks, "provenance.json cross-check") == PASS, checks


def test_manifest_edited_in_isolation_fails():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _build(tmp)
        # Tamper ONLY the manifest's pdb count — the artifact still says 354.
        man = json.loads((tmp / "provenance.json").read_text())
        for f in man["figures"]:
            if f["name"] == "pdb_structure_count":
                f["value"] = 999
        (tmp / "provenance.json").write_text(json.dumps(man))
        checks = []
        v.verify_manifest(tmp, checks)
        assert _status(checks, "matches artifacts") == FAIL, checks


def test_illegal_origin_fails():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        _build(tmp)
        man = json.loads((tmp / "provenance.json").read_text())
        man["figures"][0]["origin"] = "model"   # the one thing that must never appear
        (tmp / "provenance.json").write_text(json.dumps(man))
        checks = []
        v.verify_manifest(tmp, checks)
        assert _status(checks, "figure provenance") == FAIL, checks


def test_missing_manifest_skips():
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_manifest(Path(d), checks)
        assert _status(checks, "provenance.json present") == SKIP, checks


def main():
    tests = [val for k, val in sorted(globals().items()) if k.startswith("test_") and callable(val)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"verify_manifest: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
