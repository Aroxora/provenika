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

print(f"\n{_passed} degradation tests passed.")
