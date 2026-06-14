#!/usr/bin/env python3
"""
Offline, deterministic enforcement tests for the anti-hallucination spine.

No network: exercises the provenance invariants and the deterministic half of the
verifier (the cost-benefit recompute), so it can gate CI. Run:

    python3 cad/test_provenance.py
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import provenance as prov
import verify
import cost_benefit as cbm


def test_model_origin_is_rejected():
    """A figure may NEVER claim to originate from a language model."""
    try:
        prov.Figure("x", 1, "model", "chembl")
    except ValueError:
        return
    raise AssertionError("Figure accepted origin='model' — the core rule is unenforced!")


def test_manifest_records_origins_and_urls():
    m = prov.Manifest(target="EGFR", stamp="2026-06-13")
    m.fetched("pdb_count", 354, "uniprot", "https://www.uniprot.org/uniprotkb/P00533/entry")
    m.computed("benefit_cost_ratio", 1.23, "cad/cost_benefit.py")
    d = m.to_dict()
    assert len(d["figures"]) == 2, d
    origins = {f["origin"] for f in d["figures"]}
    assert origins == {prov.FETCHED, prov.COMPUTED}, origins
    assert all(f["verify_url"] for f in d["figures"]), "every figure needs a verify_url"
    assert "language model" in d["rule"], "manifest must state the no-LLM rule"


def test_count_status_semantics():
    assert verify._count_status(100, 100)[0] == verify.PASS
    assert verify._count_status(100, 103)[0] == verify.DRIFT      # within tolerance (growing DB)
    assert verify._count_status(100, 400)[0] == verify.FAIL       # way off
    assert verify._count_status(5, None)[0] == verify.FAIL        # source returned nothing


def test_cost_benefit_recompute_passes_then_catches_tampering():
    cb = cbm.analyze("small_molecule", "phase1", 60000, 150000.0, 0.20, 5, True)
    checks: list = []
    verify.verify_cost_benefit(cb, checks)
    assert checks and checks[-1][1] == verify.PASS, checks

    tampered = dict(cb)
    tampered["benefit_cost_ratio"] = (cb["benefit_cost_ratio"] or 0) + 99.0
    checks = []
    verify.verify_cost_benefit(tampered, checks)
    assert any(s == verify.FAIL for _, s, _, _ in checks), (
        "tampered deterministic figure must FAIL")


def main() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"\n{len(tests)} provenance/verify enforcement tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
