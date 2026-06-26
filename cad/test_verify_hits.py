#!/usr/bin/env python3
"""
Offline tests for verify.py's independent QED re-fetch (verify_hits check #3).

Guards the fix for "most ligand-shortlist numbers are never re-pulled": QED used to be read from
hits.csv and trusted (it feeds the triage score). verify now re-fetches qed_weighted from ChEMBL
and compares. The ChEMBL fetch is monkeypatched here, so NO network is used.
"""

import csv
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import verify as v  # noqa: E402


def _hits_csv(tmp: Path, qed: str = "0.50") -> Path:
    p = tmp / "hits.csv"
    with p.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["chembl_id", "smiles", "qed", "best_pchembl",
                                           "ro5_violations", "score", "similarity"])
        w.writeheader()
        w.writerow({"chembl_id": "CHEMBL29197", "smiles": "CCO", "qed": qed, "best_pchembl": "8.0",
                    "ro5_violations": "0", "score": "0.5", "similarity": ""})
    return p


def _status(checks, needle):
    for fig, status, *_ in checks:
        if needle in fig:
            return status
    return None


def test_qed_matches_passes():
    v._chembl_canonical_smiles = lambda cid: "CCO"   # SMILES check passes
    v._chembl_qed = lambda cid: 0.50                 # live == saved
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)
        assert _status(checks, "QED re-fetched") == v.PASS, checks


def test_fabricated_qed_fails():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.90                 # live != saved 0.50 -> fabrication caught
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)
        assert _status(checks, "QED re-fetched") == v.FAIL, checks


def test_unresolvable_qed_is_skipped_not_failed():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: None                 # ChEMBL didn't return qed -> no QED check emitted
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)
        assert _status(checks, "QED re-fetched") is None, checks  # never fabricates a pass/fail


def main():
    tests = [val for k, val in sorted(globals().items()) if k.startswith("test_") and callable(val)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"verify_hits QED: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
