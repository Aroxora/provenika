#!/usr/bin/env python3
"""
Offline tests for structure selection (cad/fetch_structure.py).

Guards the fix for two limitations: pick_best_pdb used to rank by resolution ONLY, so a tiny
high-resolution domain fragment could beat a structure that actually spans the binding site;
and the AlphaFold fallback never read pLDDT confidence. Pure functions, no network.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import fetch_structure as fs  # noqa: E402


def test_coverage_residues():
    assert fs._coverage_residues("A/B=19-768") == 750
    assert fs._coverage_residues("A=1-100, B=1-50") == 100   # largest contiguous span
    assert fs._coverage_residues("A=10-20") == 11
    assert fs._coverage_residues("") == 0
    assert fs._coverage_residues(None) == 0


def test_pick_prefers_substantial_coverage_over_better_resolution_fragment():
    pdbs = [
        {"id": "FRAG", "method": "X-ray", "_res_num": 1.2, "coverage_frac": 0.18},   # crisp fragment
        {"id": "FULL", "method": "X-ray", "_res_num": 2.1, "coverage_frac": 0.92},   # near-complete
    ]
    assert fs.pick_best_pdb(pdbs)["id"] == "FULL"


def test_pick_resolution_only_when_coverage_unknown():
    # No coverage info -> graceful fallback to the old resolution-first behaviour (no regression).
    pdbs = [
        {"id": "HI", "method": "X-ray", "_res_num": 1.5, "coverage_frac": None},
        {"id": "LO", "method": "X-ray", "_res_num": 2.8, "coverage_frac": None},
    ]
    assert fs.pick_best_pdb(pdbs)["id"] == "HI"


def test_pick_prefers_xray_over_nmr():
    pdbs = [
        {"id": "NMR", "method": "NMR", "_res_num": 9999.0, "coverage_frac": 0.99},
        {"id": "XRAY", "method": "X-ray", "_res_num": 2.5, "coverage_frac": 0.30},
    ]
    assert fs.pick_best_pdb(pdbs)["id"] == "XRAY"


def test_pick_among_substantial_takes_best_resolution():
    pdbs = [
        {"id": "A", "method": "X-ray", "_res_num": 2.4, "coverage_frac": 0.8},
        {"id": "B", "method": "X-ray", "_res_num": 1.6, "coverage_frac": 0.7},  # both substantial -> best res
    ]
    assert fs.pick_best_pdb(pdbs)["id"] == "B"


def test_primary_gene_extracts_geneName_value():
    assert fs._primary_gene({"genes": [{"geneName": {"value": "EGFR"}}]}) == "EGFR"
    assert fs._primary_gene({"genes": [{}]}) is None        # gene present but no name
    assert fs._primary_gene({"genes": []}) is None
    assert fs._primary_gene({}) is None


def test_pick_exact_gene_prefers_primary_symbol_match():
    # 'AKT1' must resolve to AKT1 (P31749), not the substring hit AKT1S1 (Q96B36) that the
    # UniProt search also returns; mirrors target_report._rank_targets.
    results = [
        {"primaryAccession": "Q96B36", "genes": [{"geneName": {"value": "AKT1S1"}}]},
        {"primaryAccession": "P31749", "genes": [{"geneName": {"value": "AKT1"}}]},
    ]
    assert fs._pick_exact_gene(results, "AKT1")["primaryAccession"] == "P31749"
    assert fs._pick_exact_gene(results, "akt1")["primaryAccession"] == "P31749"   # case-insensitive
    assert fs._pick_exact_gene(results, " AKT1 ")["primaryAccession"] == "P31749"  # trimmed


def test_pick_exact_gene_falls_back_to_first_when_no_exact_match():
    results = [
        {"primaryAccession": "AAA", "genes": [{"geneName": {"value": "FOO1"}}]},
        {"primaryAccession": "BBB", "genes": [{"geneName": {"value": "FOO2"}}]},
    ]
    assert fs._pick_exact_gene(results, "FOO")["primaryAccession"] == "AAA"
    assert fs._pick_exact_gene([], "FOO") is None


def test_pick_structure_without_holo_matches_pick_best_pdb():
    # prefer_holo=False is a pure, no-network shortcut: same top entry as pick_best_pdb, plus a
    # holo=None marker. (The holo-preferring path is network-bound and not exercised offline.)
    pdbs = [
        {"id": "FRAG", "method": "X-ray", "_res_num": 1.2, "coverage_frac": 0.18},
        {"id": "FULL", "method": "X-ray", "_res_num": 2.1, "coverage_frac": 0.92},
    ]
    chosen = fs.pick_structure(pdbs, prefer_holo=False)
    assert chosen["id"] == "FULL" == fs.pick_best_pdb(pdbs)["id"]
    assert chosen["holo"] is None
    assert fs.pick_structure([], prefer_holo=False) is None


def _ca(serial, plddt):
    return (f"{'ATOM':<6}{serial:>5} {'CA':<4}{'':1}{'ALA':>3} {'A':1}{serial:>4}"
            f"{'':4}{0.0:8.3f}{0.0:8.3f}{0.0:8.3f}{1.0:6.2f}{plddt:6.2f}{'':10}{'C':>2}")


def test_mean_plddt(tmp="/tmp/provenika-af-test.pdb"):
    Path(tmp).write_text("\n".join(_ca(i + 1, p) for i, p in enumerate([90.0, 80.0, 60.0, 50.0])) + "\n")
    r = fs._mean_plddt(tmp)
    assert r["mean_plddt"] == 70.0
    assert r["residues"] == 4
    assert r["pct_confident"] == 50.0  # two of four >= 70
    assert fs._mean_plddt("/no/such/file") is None


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"fetch_structure: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
