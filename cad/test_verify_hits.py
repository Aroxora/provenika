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


def test_desalted_parent_smiles_passes():
    # ChEMBL holds a salt/co-crystal ('.'-joined); the pipeline docks (and stores) the parent fragment.
    # The SMILES check must NOT flag the pipeline's own deterministic desalting as fabrication.
    v._chembl_canonical_smiles = lambda cid: "CCO.Cl"           # ethanol·HCl — parent is the largest fragment
    v._chembl_qed = lambda cid: 0.50
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)        # saved smiles is "CCO" (the parent)
        assert _status(checks, "SMILES match ChEMBL") == v.PASS, checks


def test_edited_smiles_still_fails():
    # An edited/transposed SMILES that is NOT ChEMBL's molecule (nor its parent) must still FAIL.
    v._chembl_canonical_smiles = lambda cid: "CCN"               # different molecule from saved "CCO"
    v._chembl_qed = lambda cid: 0.50
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)
        assert _status(checks, "SMILES match ChEMBL") == v.FAIL, checks


def test_potency_match_passes():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    v._chembl_best_pchembl = lambda mol, tid: 8.0    # == saved best_pchembl
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks, target_id="CHEMBL203")
        assert _status(checks, "potency re-fetched") == v.PASS, checks


def test_overstated_potency_fails():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    v._chembl_best_pchembl = lambda mol, tid: 6.0    # live < saved 8.0 -> file overstates potency
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks, target_id="CHEMBL203")
        assert _status(checks, "potency re-fetched") == v.FAIL, checks


def test_more_potent_db_growth_is_drift_not_fail():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    v._chembl_best_pchembl = lambda mol, tid: 9.5    # live > saved 8.0 -> DB gained a more potent value
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks, target_id="CHEMBL203")
        assert _status(checks, "potency re-fetched") == v.DRIFT, checks


def test_potency_skipped_without_target_id():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv(Path(d), "0.50"), checks)   # no target_id -> potency check not emitted
        assert _status(checks, "potency re-fetched") is None, checks


def _hits_csv_desc(tmp: Path, mw="360.21", alogp="4.15", tpsa="56.27") -> Path:
    p = tmp / "hits.csv"
    with p.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["chembl_id", "smiles", "qed", "best_pchembl", "ro5_violations",
                                           "score", "similarity", "mw", "alogp", "tpsa"])
        w.writeheader()
        w.writerow({"chembl_id": "CHEMBL29197", "smiles": "CCO", "qed": "0.50", "best_pchembl": "8.0",
                    "ro5_violations": "0", "score": "0.5", "similarity": "", "mw": mw, "alogp": alogp, "tpsa": tpsa})
    return p


def test_descriptors_match_passes():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    v._chembl_descriptors = lambda cid: {"mw": 360.21, "alogp": 4.15, "tpsa": 56.27}
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv_desc(Path(d)), checks)
        assert _status(checks, "descriptors re-fetched") == v.PASS, checks


def test_fabricated_descriptor_fails():
    v._chembl_canonical_smiles = lambda cid: "CCO"
    v._chembl_qed = lambda cid: 0.50
    v._chembl_descriptors = lambda cid: {"mw": 999.0, "alogp": 4.15, "tpsa": 56.27}   # mw fabricated
    with tempfile.TemporaryDirectory() as d:
        checks = []
        v.verify_hits(_hits_csv_desc(Path(d)), checks)
        assert _status(checks, "descriptors re-fetched") == v.FAIL, checks


def main():
    tests = [val for k, val in sorted(globals().items()) if k.startswith("test_") and callable(val)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"verify_hits QED: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
