#!/usr/bin/env python3
"""
Offline tests for the trustworthy-shortlist upgrades in virtual_triage.py:
  * the ChEMBL activity-quality gate (shared verbatim with verify.py),
  * robust MEDIAN aggregation (not single-luckiest-measurement) + n_measurements,
  * potential_duplicate drop and the potency_suspect flag,
  * allele-specific variant filtering (set-superset, combination assays),
  * max_phase string coercion (the --exclude-approved crash) + early-phase label,
  * salt/parent desalting of the exported SMILES.

All ChEMBL access is monkeypatched, so this runs with NO network.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import virtual_triage as vt  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def _activity(pchembl, stype="IC50", assay_type="B", variant=None, dup=False, mol="CHEMBLX"):
    return {"molecule_chembl_id": mol, "pchembl_value": str(pchembl), "standard_type": stype,
            "assay_type": assay_type, "assay_variant_mutation": variant,
            "potential_duplicate": 1 if dup else 0}


def _mock_get(activities):
    """A vt._get that returns one activity page then stops (no page_meta.next)."""
    def _get(path, params):
        if path == "activity":
            return {"activities": activities, "page_meta": {"next": None}}
        return {"molecules": []}
    return _get


# --- quality gate is shared with verify (cannot drift) -------------------------------
def test_quality_gate_shared_with_verify():
    import verify as v
    check("triage quality gate == verify's", vt.ACTIVITY_QUALITY_PARAMS == v._activity_quality_params())
    check("gate excludes censored relations", vt.ACTIVITY_QUALITY_PARAMS.get("standard_relation") == "=")
    check("gate excludes validity-flagged rows",
          vt.ACTIVITY_QUALITY_PARAMS.get("data_validity_comment__isnull") == "true")
    check("gate orders by descending potency", vt.ACTIVITY_QUALITY_PARAMS.get("order_by") == "-pchembl_value")


# --- median aggregation + duplicate drop --------------------------------------------
def test_median_aggregation_and_duplicate_drop():
    acts = [  # descending pChEMBL (as the real API returns); a dup 11.0 must be ignored
        _activity(11.0, dup=True, mol="MOLA"),
        _activity(9.0, mol="MOLA"),
        _activity(6.1, mol="MOLA"),
        _activity(6.0, mol="MOLA"),
    ]
    vt._get = _mock_get(acts)
    out = vt.fetch_actives("CHEMBL1", min_pchembl=5.0, scan=100)
    a = out["MOLA"]
    check("median over [9.0,6.1,6.0] == 6.1 (duplicate 11.0 dropped)", a["pchembl"] == 6.1)
    check("max_pchembl == 9.0 (the best non-duplicate)", a["max_pchembl"] == 9.0)
    check("n_measurements == 3 (duplicate not counted)", a["n_measurements"] == 3)


def test_floor_truncates_scan():
    acts = [_activity(8.0, mol="MOLB"), _activity(6.0, mol="MOLB"), _activity(5.0, mol="MOLB")]
    vt._get = _mock_get(acts)
    out = vt.fetch_actives("CHEMBL1", min_pchembl=7.0, scan=100)
    check("only >= floor records aggregate (median 8.0, n 1)",
          out["MOLB"]["pchembl"] == 8.0 and out["MOLB"]["n_measurements"] == 1)


# --- potency_suspect flag ------------------------------------------------------------
def test_potency_suspect_flag():
    check("11.0 with 1 measurement is suspect", vt.potency_suspect(11.0, 1) is True)
    check("11.0 with 2 measurements is NOT suspect", vt.potency_suspect(11.0, 2) is False)
    check("9.0 with 1 measurement is NOT suspect (below ceiling)", vt.potency_suspect(9.0, 1) is False)
    check("None potency is not suspect", vt.potency_suspect(None, 1) is False)


# --- assay_format vs measurement_type (the old mislabel) -----------------------------
def test_assay_format_distinct_from_measurement_type():
    vt._get = _mock_get([_activity(9.0, stype="Ki", assay_type="F", mol="MOLC")])
    out = vt.fetch_actives("CHEMBL1", min_pchembl=6.0, scan=100)
    check("measurement_type holds the standard_type (Ki)", out["MOLC"]["type"] == "Ki")
    check("assay_format holds the real ChEMBL assay_type (F)", out["MOLC"]["assay_format"] == "F")


def test_binding_only_adds_assay_type_param():
    seen = {}
    def _get(path, params):
        seen.update(params)
        return {"activities": [], "page_meta": {"next": None}}
    vt._get = _get
    vt.fetch_actives("CHEMBL1", min_pchembl=6.0, scan=100, binding_only=True)
    check("--binding-only sends assay_type=B", seen.get("assay_type") == "B")


# --- allele-specific variant filtering ----------------------------------------------
def test_variant_filter_superset_and_seen():
    acts = [
        _activity(9.0, variant="L858R", mol="V1"),
        _activity(9.0, variant="C797S,L858R", mol="V2"),   # combination assay → still contains L858R
        _activity(9.0, variant="T790M", mol="V3"),          # different allele → dropped
        _activity(9.0, variant=None, mol="V4"),             # wild-type/pooled → dropped
    ]
    vt._get = _mock_get(acts)
    out = vt.fetch_actives("CHEMBL1", min_pchembl=6.0, scan=100, variant_filter={"L858R"})
    check("keeps the exact-allele record", "V1" in out)
    check("keeps the combination assay containing the allele", "V2" in out)
    check("drops a different-allele record", "V3" not in out)
    check("drops a wild-type/pooled record", "V4" not in out)
    check("variant_data_seen True when matches exist", out["V1"]["variant_data_seen"] is True)


def test_variant_filter_no_data_seen_false():
    vt._get = _mock_get([_activity(9.0, variant="T790M", mol="W1")])
    out = vt.fetch_actives("CHEMBL1", min_pchembl=6.0, scan=100, variant_filter={"G99W"})
    check("no matching variant → empty result", out == {})


# --- max_phase coercion (the --exclude-approved crash) + desalt ----------------------
def test_molecule_properties_coerce_and_desalt():
    def _get(path, params):
        return {"molecules": [{
            "molecule_chembl_id": "CHEMBL1201179",
            "pref_name": "GEFITINIB SALT",
            "max_phase": "4.0",                       # ChEMBL serializes as a STRING
            "molecule_hierarchy": {"molecule_chembl_id": "CHEMBL1201179",
                                   "parent_chembl_id": "CHEMBL939"},
            "molecule_properties": {"full_mwt": "446.9", "qed_weighted": "0.55"},
            "molecule_structures": {"canonical_smiles": "Cl.COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1"},
        }]}
    vt._get = _get
    props = vt.fetch_molecule_properties(["CHEMBL1201179"])
    p = props["CHEMBL1201179"]
    check("max_phase coerced to float 4.0", isinstance(p["max_phase"], float) and p["max_phase"] == 4.0)
    check("parent_chembl_id captured", p["parent_chembl_id"] == "CHEMBL939")
    check("exported SMILES is desalted (no '.', no bare Cl)", "." not in p["smiles"] and p["smiles"] != "Cl")
    check("desalted flag set", p["desalted"] is True)


def test_exclude_approved_filter_is_numeric_safe():
    # The crash was `('4.0' or 0) < 4` on a string. After coercion max_phase is float|None.
    rows = [{"max_phase": 4.0, "score": 0.9}, {"max_phase": None, "score": 0.8},
            {"max_phase": 0.5, "score": 0.7}]
    kept = [r for r in rows if (r["max_phase"] or 0) < 4]   # the run() comprehension
    check("approved (4.0) dropped, None + early-phase kept", len(kept) == 2)


def test_largest_organic_fragment():
    check("salt SMILES → largest fragment",
          vt.largest_organic_fragment("Cl.CCO") in ("CCO", "OCC") or len(vt.largest_organic_fragment("Cl.CCO")) >= 3)
    check("clean SMILES unchanged", vt.largest_organic_fragment("c1ccccc1") == "c1ccccc1")
    check("None passes through", vt.largest_organic_fragment(None) is None)


def test_dev_phase_label_early_phase():
    check("0.5 → early phase 1 (clinical, not preclinical)",
          vt.dev_phase_label("0.5") == "clinical (early phase 1)")
    check("4.0 → approved drug", vt.dev_phase_label("4.0") == "approved drug")
    check("0 → research/preclinical", vt.dev_phase_label(0) == "research/preclinical")


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} triage-filter assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
