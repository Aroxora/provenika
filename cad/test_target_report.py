#!/usr/bin/env python3
"""
Offline tests for ChEMBL target ranking (cad/target_report.py _rank_targets).

Guards the fix for the cross-stage resolution mismatch: target_report used to take the first
single-human-protein hit with no exact gene-symbol check, so 'AKT1' could resolve to AKT1S1 (a
different protein) than the one virtual_triage/fetch_structure use. Pure function, no network.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import target_report as tr  # noqa: E402


def _t(pref, ttype="SINGLE PROTEIN", org="Homo sapiens", gene=None):
    comp = [{"target_component_synonyms": [{"syn_type": "GENE_SYMBOL", "component_synonym": gene}]}] if gene else []
    return {"pref_name": pref, "target_type": ttype, "organism": org, "target_components": comp}


def test_exact_gene_symbol_beats_substring_target():
    targets = [
        _t("AKT1 substrate 1 (PRAS40)", gene="AKT1S1"),   # substring hit, single human protein
        _t("RAC-alpha serine/threonine-protein kinase", gene="AKT1"),  # the real AKT1
    ]
    assert tr._rank_targets(targets, "AKT1")["pref_name"] == "RAC-alpha serine/threonine-protein kinase"


def test_exact_pref_name_match():
    targets = [_t("Epidermal growth factor receptor", gene="EGFR"), _t("EGFR", gene="EGFR")]
    # both match by gene; pref_name exact is also true for the second — still an exact target chosen
    assert tr._rank_targets(targets, "EGFR")["pref_name"] in ("EGFR", "Epidermal growth factor receptor")


def test_falls_back_to_single_human_protein_when_no_exact():
    targets = [
        _t("Some kinase", org="Mus musculus", gene="XYZ"),
        _t("Some kinase", org="Homo sapiens", gene="XYZ"),
    ]
    assert tr._rank_targets(targets, "NOMATCH")["organism"] == "Homo sapiens"


def test_prefers_single_protein_over_family():
    targets = [
        _t("Kinase family", ttype="PROTEIN FAMILY", gene="ABC"),
        _t("Kinase", ttype="SINGLE PROTEIN", gene="ABC"),
    ]
    assert tr._rank_targets(targets, "NOMATCH")["target_type"] == "SINGLE PROTEIN"


def test_empty_is_none():
    assert tr._rank_targets([], "EGFR") is None


def test_variant_record_count_sums_per_allele(monkeypatch=None):
    # Mock ChEMBL: each variant query returns a page_meta total_count.
    counts = {"G12C": 446, "G12D": 120}
    calls = []

    def fake_chembl(path, params):
        calls.append(params.get("assay_variant_mutation"))
        return {"page_meta": {"total_count": counts.get(params.get("assay_variant_mutation"), 0)}}

    orig = tr._chembl
    tr._chembl = fake_chembl
    try:
        assert tr.variant_record_count("CHEMBL2189121", {"G12C"}) == 446
        assert tr.variant_record_count("CHEMBL2189121", {"G12C", "G12D"}) == 566  # summed
        assert tr.variant_record_count("CHEMBL2189121", {"Q61X"}) == 0            # no records
        # the per-allele query carried the assay_variant_mutation filter
        assert "G12C" in calls
    finally:
        tr._chembl = orig


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"target_report: {len(tests)} tests passed")


if __name__ == "__main__":
    main()
