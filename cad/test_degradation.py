#!/usr/bin/env python3
"""
Guard graceful degradation: a single public-source outage must not sink the whole dossier.
When ChEMBL is down but UniProt is up, target_report must still resolve the target (via
UniProt) and emit a PARTIAL dossier marking ChEMBL unavailable — never fabricate, never
hard-fail. When BOTH are down it must exit non-zero ("retry"), not claim "not found".

Offline: the HTTP layer (target_report._json) is monkeypatched. No network.
"""

from __future__ import annotations

import contextlib
import io
import json
import sys
import urllib.error
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).parent))
import target_report as tr  # noqa: E402

_passed = 0


def ok(name: str) -> None:
    global _passed
    print(f"  ok  {name}")
    _passed += 1


FAKE_UNIPROT = {
    "results": [{
        "primaryAccession": "P00533",
        "proteinDescription": {"recommendedName": {"fullName": {"value": "Epidermal growth factor receptor"}}},
        "sequence": {"length": 1210},
        "comments": [],
        "uniProtKBCrossReferences": [{"database": "PDB", "id": "1M17"}],
    }]
}
_orig_json = tr._json


def run_json(target: str):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        rc = tr.run(SimpleNamespace(target=target, json=True))
    text = out.getvalue().strip()
    return rc, (json.loads(text) if text else None)


try:
    # Scenario 1: ChEMBL 500, UniProt up → partial dossier, exit 0.
    def chembl_down(url: str):
        if "ebi.ac.uk/chembl" in url:
            raise urllib.error.HTTPError(url, 500, "Server Error", {}, None)
        if "rest.uniprot.org" in url:
            return FAKE_UNIPROT
        raise AssertionError(f"unexpected url: {url}")

    tr._json = chembl_down
    rc, d = run_json("EGFR")
    assert rc == 0, f"ChEMBL-down should still succeed via UniProt, got rc={rc}"
    assert d and d["chembl"].get("available") is False, f"chembl should be marked unavailable: {d['chembl']}"
    assert d["uniprot"]["accession"] == "P00533", "UniProt data should be present"
    assert "degraded" in d, "degraded marker expected"
    ok("ChEMBL down + UniProt up → exit 0, partial dossier (chembl unavailable, uniprot present)")

    # Scenario 2: both sources down → exit 2 (retry), not a fabricated 'not found'.
    def both_down(url: str):
        raise urllib.error.HTTPError(url, 500, "Server Error", {}, None)

    tr._json = both_down
    rc, _ = run_json("EGFR")
    assert rc == 2, f"both-down should exit 2 (retry), got rc={rc}"
    ok("both sources down → exit 2 (retry), never a false 'not found'")
finally:
    tr._json = _orig_json

# Scenario 3: virtual_triage's pagination respects a wall-clock budget so a slow ChEMBL
# can't make it run for minutes — it stops early with partial results.
import virtual_triage as vt  # noqa: E402

_vt_get, _vt_mono = vt._get, vt.time.monotonic
try:
    calls = {"n": 0}

    def fake_page(path, params):
        calls["n"] += 1
        base = calls["n"] * 1000
        return {"activities": [
            {"molecule_chembl_id": f"CHEMBL{base + i}", "pchembl_value": "8.0", "standard_type": "IC50"}
            for i in range(1000)
        ]}

    clock = [0.0]

    def fake_monotonic():  # advance 25s per read → exceeds a 40s budget after one page
        v = clock[0]
        clock[0] += 25.0
        return v

    vt._get = fake_page
    vt.time.monotonic = fake_monotonic
    best = vt.fetch_actives("CHEMBL203", 6.0, scan=4000, budget_s=40.0)
    assert calls["n"] < 4, f"budget should stop pagination early, made {calls['n']} requests"
    assert len(best) > 0, "partial results should still be returned"
    ok(f"virtual_triage stops at the time budget ({calls['n']} of 4 pages) with partial results")
finally:
    vt._get, vt.time.monotonic = _vt_get, _vt_mono

print(f"\n{_passed} degradation tests passed.")
