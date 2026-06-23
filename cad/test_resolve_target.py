#!/usr/bin/env python3
"""
Guard ChEMBL target resolution against substring / interactor mis-matches.

target/search ranks by text relevance, so a bare gene symbol can match a SUBSTRATE or INTERACTOR
before the real protein — "AKT1" → "Proline-rich AKT1 substrate 1" (gene AKT1S1), "AURKA" →
"AURKAIP1" — silently triaging the wrong target. resolve_target must prefer an EXACT gene-symbol
match (single protein, human); when no candidate's gene matches the query (e.g. the mutation-
qualified "KRAS G12C") it falls back to the original single-protein / human / relevance order.

Offline: virtual_triage._get is monkeypatched. No network.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import virtual_triage as vt  # noqa: E402

_passed = 0


def ok(name: str) -> None:
    global _passed
    print(f"  ok  {name}")
    _passed += 1


def _t(cid, name, gene, ttype="SINGLE PROTEIN", org="Homo sapiens"):
    return {
        "target_chembl_id": cid, "pref_name": name, "target_type": ttype, "organism": org,
        "target_components": [
            {"target_component_synonyms": [{"syn_type": "GENE_SYMBOL", "component_synonym": gene}]}
        ],
    }


def _patch(targets):
    vt._get = lambda path, params=None: {"targets": targets}


def main() -> int:
    # AKT1: the substrate (AKT1S1) ranks first by relevance; the real kinase (gene AKT1) is last.
    _patch([
        _t("CHEMBL1255161", "Proline-rich AKT1 substrate 1", "AKT1S1"),
        _t("CHEMBL4523748", "AKT1/PPP1CA", "AKT1", ttype="PROTEIN-PROTEIN INTERACTION"),
        _t("CHEMBL4282", "RAC-alpha serine/threonine-protein kinase", "AKT1"),
    ])
    r = vt.resolve_target("AKT1")
    assert r["target_chembl_id"] == "CHEMBL4282", r
    ok("AKT1 resolves to the kinase (exact gene), not the substrate or the PPI")

    # AURKA: an interactor (AURKAIP1) ranks first; Aurora kinase A (gene AURKA) is last.
    _patch([
        _t("CHEMBL5910", "Small ribosomal subunit protein mS38", "AURKAIP1"),
        _t("CHEMBL4722", "Aurora kinase A", "AURKA"),
    ])
    r = vt.resolve_target("AURKA")
    assert r["target_chembl_id"] == "CHEMBL4722", r
    ok("AURKA resolves to Aurora kinase A, not AURKAIP1")

    # No gene match (mutation-qualified query): falls back to single-protein + human ordering.
    _patch([
        _t("CHEMBLX1", "GTPase KRAS (mouse)", "KRAS", org="Mus musculus"),
        _t("CHEMBLX2", "GTPase KRAS (human)", "KRAS"),
    ])
    r = vt.resolve_target("KRAS G12C")
    assert r["target_chembl_id"] == "CHEMBLX2", r
    ok("no gene match falls back to single-protein + human ordering")

    # A human single-protein exact-gene match beats a non-human exact-gene match.
    _patch([
        _t("CHEMBLM", "RAC-alpha s/t kinase (mouse)", "Akt1", org="Mus musculus"),
        _t("CHEMBLH", "RAC-alpha s/t kinase", "AKT1"),
    ])
    r = vt.resolve_target("AKT1")
    assert r["target_chembl_id"] == "CHEMBLH", r
    ok("human exact-gene match beats a non-human exact-gene match")

    print(f"\n{_passed} checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
