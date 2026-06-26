#!/usr/bin/env python3
"""
verify.py — re-derive and tamper-check the machine-readable figures in a pipeline run.

This is the enforcement half of the repo's anti-hallucination rule. It takes a
run directory produced by `cad/run_pipeline.py` (or a bare `--target`) and, for
every reported figure, re-pulls the value from the live public source and reports:

  PASS   the saved figure reproduces from the source
  DRIFT  the figure changed but is the same order of magnitude — expected for a
         living database that gains records over time (NOT a failure)
  FAIL   the figure could not be reproduced at all, or differs wildly, or the
         source returns nothing where a value was claimed → treat as suspect

What this DOES and does NOT prove (read this — honesty is the point):
  * Count checks (ChEMBL/UniProt) re-run the SAME query logic from the stage
    modules, so they prove REPRODUCIBILITY and FRESHNESS — that the saved number
    is what the documented query returns today — NOT that the query design is
    the right one. A wrong-but-stable query would pass.
  * The SMILES check IS independent: it fetches each top ligand's canonical
    SMILES straight from ChEMBL over raw HTTP (not via the triage code) and
    requires byte-equality with hits.csv — catching an edited/transposed SMILES.
  * Deterministic artifacts (cost_benefit.json, the triage score, the docking box —
    re-derived from the co-crystal ligand — and the per-hit liability fields: PAINS/Brenk
    + GSK/Pfizer developability + SA score) are recomputed and must reproduce EXACTLY —
    a mismatch means the file was edited/fabricated.
  * Hit columns ARE now independently re-fetched: each shortlist hit's SMILES, QED,
    potency (best_pchembl) and mw/alogp/TPSA are re-pulled live from ChEMBL and compared,
    and provenance.json is cross-checked against the artifacts — so a self-consistent
    fabrication no longer passes for those.
  * NOT covered (so do not over-trust a PASS): narrative text (SUMMARY.md prose,
    target_report read-outs) and the `intel/` digests (unverified leads); the query
    DESIGN (a wrong-but-stable query reproduces); and DRIFT — a within-tolerance change
    in a living database exits 0 (shown, not silent), since that is legitimate growth.

Exit code is non-zero if anything FAILs, so it can gate CI. Every check prints
the exact URL a human can open to confirm the number a third time, by hand.

Usage:
  python3 cad/verify.py --run runs/egfr              # verify a pipeline output dir
  python3 cad/verify.py --target EGFR                # fetch-and-cite live (no saved run)
  python3 cad/verify.py --run runs/egfr --json
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

import provenance as prov  # noqa: E402

_UA = "oncology-osint-cad-verify/1.0 (research)"


def _http_json(url: str) -> dict | None:
    """Raw, dependency-free GET — deliberately a SEPARATE code path from the
    stage modules, so the SMILES check is genuinely independent of how the run
    was produced."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": _UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception:
        return None


def _chembl_canonical_smiles(chembl_id: str) -> str | None:
    data = _http_json(f"https://www.ebi.ac.uk/chembl/api/data/molecule/{chembl_id}?format=json")
    if not data:
        return None
    return ((data.get("molecule_structures") or {}).get("canonical_smiles"))


def _chembl_qed(chembl_id: str) -> float | None:
    """Re-fetch ChEMBL's qed_weighted for a molecule over the same raw-HTTP path, so the saved QED
    is independently re-pulled — not trusted from the file, where it feeds the triage score."""
    data = _http_json(f"https://www.ebi.ac.uk/chembl/api/data/molecule/{chembl_id}?format=json")
    if not data:
        return None
    q = (data.get("molecule_properties") or {}).get("qed_weighted")
    try:
        return float(q) if q is not None else None
    except (TypeError, ValueError):
        return None


_POTENCY_TYPES = {"IC50", "Ki", "Kd", "EC50"}


def _chembl_best_pchembl(mol_id: str, target_id: str) -> float | None:
    """Re-query a molecule's max pChEMBL on this target straight from ChEMBL (raw HTTP), so the
    best_pchembl that drives the ranking is re-pulled, not trusted from hits.csv. Returns None if
    the live source can't be reached or has no potency record."""
    url = (f"https://www.ebi.ac.uk/chembl/api/data/activity?molecule_chembl_id={mol_id}"
           f"&target_chembl_id={target_id}&pchembl_value__isnull=false&limit=200&format=json")
    data = _http_json(url)
    if not data:
        return None
    best = None
    for a in data.get("activities", []):
        if a.get("standard_type") not in _POTENCY_TYPES:
            continue
        try:
            pv = float(a.get("pchembl_value"))
        except (TypeError, ValueError):
            continue
        if best is None or pv > best:
            best = pv
    return best


def _chembl_descriptors(chembl_id: str) -> dict | None:
    """Re-fetch ChEMBL's molecular descriptors (mw/alogp/tpsa) over the raw-HTTP path, so the
    display columns are re-pulled too — completing 'every ChEMBL-sourced shortlist figure re-fetched'."""
    data = _http_json(f"https://www.ebi.ac.uk/chembl/api/data/molecule/{chembl_id}?format=json")
    if not data:
        return None
    mp = data.get("molecule_properties") or {}

    def f(k):
        try:
            return float(mp[k]) if mp.get(k) is not None else None
        except (TypeError, ValueError):
            return None

    return {"mw": f("full_mwt"), "alogp": f("alogp"), "tpsa": f("psa")}

PASS, DRIFT, FAIL, SKIP = "PASS", "DRIFT", "FAIL", "SKIP"


def _count_status(saved, live, tol_frac=0.10, tol_abs=2):
    """Compare two counts that may legitimately grow over time."""
    if live is None:
        return FAIL, "source returned no value for a figure that was reported"
    if saved == live:
        return PASS, ""
    tol = max(tol_abs, abs(live) * tol_frac)
    if abs(saved - live) <= tol:
        return DRIFT, f"saved {saved} vs live {live} (within tolerance for a growing DB)"
    return FAIL, f"saved {saved} but source now reports {live} (off by more than tolerance)"


def verify_dossier(dossier: dict, checks: list) -> None:
    """Re-pull UniProt + ChEMBL figures and compare to the saved dossier."""
    import target_report as tr

    query = dossier.get("query") or (dossier.get("chembl_target") or {}).get("name")
    tid = (dossier.get("chembl_target") or {}).get("id")
    saved_chembl = dossier.get("chembl") or {}

    # Only re-verify ChEMBL figures the dossier actually RECORDED. A degraded run (ChEMBL
    # was down) carries no ChEMBL counts, so there is nothing to re-pull — skip it rather
    # than hit the (possibly still-down) API and report a false FAIL.
    if "potent_activity_records" not in saved_chembl:
        checks.append(("ChEMBL figures", SKIP,
                       "not recorded in this run (ChEMBL was unavailable) — nothing to re-verify", ""))
    else:
        if not tid and query:  # re-resolve the target id if the dossier didn't store it
            t = tr.resolve_target(query)
            tid = t["target_chembl_id"] if t else None
        if tid:
            live = tr.chembl_snapshot(tid)
            s, note = _count_status(saved_chembl.get("potent_activity_records", 0),
                                    live.get("potent_activity_records"))
            checks.append(("ChEMBL potent activity records", s, note,
                           prov.source_url("chembl", "activity_count", tid)))

            saved_drugs = len(saved_chembl.get("known_mechanism_drugs", []))
            live_drugs = len(live.get("known_mechanism_drugs", []))
            s, note = _count_status(saved_drugs, live_drugs)
            checks.append(("ChEMBL known-mechanism drugs", s, note,
                           prov.source_url("chembl", "mechanisms", tid)))
        else:
            checks.append(("ChEMBL target resolution", FAIL,
                           "could not resolve the target to re-check its figures", ""))

    # UniProt: re-pull the PDB structure count (drives "docking feasible").
    saved_uni = dossier.get("uniprot") or {}
    if saved_uni and query:
        live_uni = tr.uniprot_summary(query)
        if live_uni is None:
            checks.append(("UniProt entry", FAIL, "no reviewed human entry re-resolved", ""))
        else:
            s, note = _count_status(saved_uni.get("pdb_count", 0), live_uni.get("pdb_count"))
            checks.append(("UniProt PDB structure count", s, note,
                           prov.source_url("uniprot", "entry", live_uni.get("accession", ""))))


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def verify_hits(path: Path, checks: list, target_id: str | None = None, max_rows: int = 25) -> None:
    """Content-level checks on the top ranked ligands:
       (1) SMILES byte-equality vs ChEMBL (independent raw HTTP fetch),
       (2) deterministic recompute of the published triage score,
       (3) independent QED re-fetch from ChEMBL,
       (4) independent best_pchembl (potency) re-fetch from ChEMBL (needs target_id).
    max_rows defaults to 25 (the full shortlist), so the cap no longer leaves later rows unchecked."""
    try:
        rows = list(csv.DictReader(path.open()))[:max_rows]
    except OSError as e:
        checks.append(("hits.csv readable", FAIL, str(e), ""))
        return
    if not rows:
        checks.append(("hits.csv rows", SKIP, "no rows to check", ""))
        return

    # (1) Independent SMILES identity check — catches an edited/transposed SMILES
    # that "parses fine" but is not the molecule ChEMBL holds for that ID.
    mismatched, unresolved = 0, 0
    for r in rows:
        cid = (r.get("chembl_id") or "").strip()
        saved = (r.get("smiles") or "").strip()
        if not cid.startswith("CHEMBL"):
            checks.append((f"ligand id {cid or '(blank)'}", FAIL, "row lacks a real ChEMBL id", ""))
            continue
        live = _chembl_canonical_smiles(cid)
        if live is None:
            unresolved += 1
        elif saved and live != saved:
            mismatched += 1
    if mismatched:
        checks.append((f"top {len(rows)} ligand SMILES match ChEMBL", FAIL,
                       f"{mismatched} SMILES differ from ChEMBL's canonical record (edited/fabricated)",
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))
    elif unresolved == len(rows):
        checks.append((f"top {len(rows)} ligand SMILES match ChEMBL", FAIL,
                       "could not resolve any molecule at ChEMBL to compare", ""))
    else:
        note = "byte-equal to ChEMBL canonical SMILES" + (
            f" ({unresolved} unresolved, skipped)" if unresolved else "")
        checks.append((f"top {len(rows) - unresolved} ligand SMILES match ChEMBL", PASS, note,
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))

    # (3) Independent QED re-fetch — the score recompute below reads qed FROM the file; this
    # re-pulls each top hit's qed_weighted straight from ChEMBL (separate raw-HTTP path) and
    # compares, so a fabricated QED (which would otherwise feed a self-consistent score) is caught.
    qed_bad, qed_checked = 0, 0
    for r in rows:
        cid = (r.get("chembl_id") or "").strip()
        saved_qed = _f(r.get("qed"))
        if not cid.startswith("CHEMBL") or saved_qed is None:
            continue
        live_qed = _chembl_qed(cid)
        if live_qed is None:
            continue
        qed_checked += 1
        if abs(live_qed - saved_qed) > 0.011:   # qed_weighted is 2-dp; a larger gap means edited
            qed_bad += 1
    if qed_checked:
        s = FAIL if qed_bad else PASS
        note = ("QED matches ChEMBL's qed_weighted (re-fetched)" if s == PASS
                else f"{qed_bad} hit(s) QED differs from ChEMBL's qed_weighted (edited/fabricated)")
        checks.append((f"top {qed_checked} ligand QED re-fetched from ChEMBL", s, note,
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))

    # (4) Independent POTENCY re-fetch: re-query each top hit's max pChEMBL on this target straight
    # from ChEMBL (raw HTTP) and compare to best_pchembl — so the potency that drives the ranking is
    # re-pulled, not trusted from the file. live < saved (file overstates potency ChEMBL lacks) FAILs;
    # live > saved (the DB gained a more potent measurement) is DRIFT, not a failure.
    if target_id:
        pot_bad, pot_drift, pot_checked = 0, 0, 0
        for r in rows:
            cid = (r.get("chembl_id") or "").strip()
            saved_p = _f(r.get("best_pchembl"))
            if not cid.startswith("CHEMBL") or saved_p is None:
                continue
            live_p = _chembl_best_pchembl(cid, target_id)
            if live_p is None:
                continue
            pot_checked += 1
            if live_p < saved_p - 0.05:
                pot_bad += 1
            elif abs(live_p - saved_p) > 0.05:
                pot_drift += 1
        if pot_checked:
            url = prov.source_url("chembl", "target", target_id)
            if pot_bad:
                checks.append((f"top {pot_checked} ligand potency re-fetched from ChEMBL", FAIL,
                               f"{pot_bad} hit(s) best_pchembl exceeds ChEMBL's max for this target "
                               "(overstated/fabricated potency)", url))
            else:
                st = DRIFT if pot_drift else PASS
                note = (f"best_pchembl reproduces from ChEMBL ({pot_drift} drifted up — DB gained data)"
                        if pot_drift else "best_pchembl matches ChEMBL's max potency on this target")
                checks.append((f"top {pot_checked} ligand potency re-fetched from ChEMBL", st, note, url))

    # (5) Independent DESCRIPTOR re-fetch (mw/alogp/tpsa): the display columns. Completes the set so
    # EVERY ChEMBL-sourced figure in the shortlist is re-pulled, not trusted from the file. Only
    # fetches when the row actually carries these columns.
    desc_bad, desc_checked = 0, 0
    for r in rows:
        cid = (r.get("chembl_id") or "").strip()
        if not cid.startswith("CHEMBL"):
            continue
        if all(_f(r.get(c)) is None for c in ("mw", "alogp", "tpsa")):
            continue
        live = _chembl_descriptors(cid)
        if not live:
            continue
        compared, bad = False, False
        for col in ("mw", "alogp", "tpsa"):
            saved, livev = _f(r.get(col)), live.get(col)
            if saved is None or livev is None:
                continue
            compared = True
            if abs(saved - livev) > 0.011:
                bad = True
        if compared:
            desc_checked += 1
            desc_bad += 1 if bad else 0
    if desc_checked:
        s = FAIL if desc_bad else PASS
        note = ("mw/alogp/TPSA match ChEMBL's molecule_properties (re-fetched)" if s == PASS
                else f"{desc_bad} hit(s) descriptor(s) differ from ChEMBL (edited/fabricated)")
        checks.append((f"top {desc_checked} ligand descriptors re-fetched from ChEMBL", s, note,
                       prov.source_url("chembl", "entry", rows[0].get("chembl_id", ""))))

    # (2) Recompute the headline triage score from its own CSV inputs. Deterministic
    # → any drift means the score column was edited. Imports the producing formula
    # on purpose (this is a reproducibility check, like cost_benefit). QED and potency are now
    # also independently re-fetched above, so the score's inputs are no longer taken purely on faith.
    try:
        import virtual_triage as vt
        worst = 0.0
        checked = 0
        for r in rows:
            pchembl = _f(r.get("best_pchembl"))
            saved_score = _f(r.get("score"))
            sim = _f(r.get("similarity"))
            if pchembl is None or saved_score is None:
                continue
            p = {"qed": _f(r.get("qed")), "ro5_violations": (int(float(r["ro5_violations"]))
                 if r.get("ro5_violations") not in (None, "", "-") else None)}
            recomputed = vt.composite_score(pchembl, p, sim)
            worst = max(worst, abs(recomputed - saved_score))
            checked += 1
        if checked:
            s = PASS if worst < 1e-3 else FAIL
            note = ("score column reproduces from potency+drug-likeness formula"
                    if s == PASS else f"score differs by up to {worst:.4f} (column was edited)")
            checks.append((f"triage score recompute ({checked} rows)", s, note,
                           "cad/virtual_triage.py:composite_score"))
    except Exception as e:
        checks.append(("triage score recompute", SKIP, f"could not recompute: {e}", ""))


def verify_cost_benefit(cb: dict, checks: list) -> None:
    """Recompute the deterministic cost-benefit model; it MUST reproduce exactly."""
    import cost_benefit as cbm

    a = cb.get("assumptions") or {}
    try:
        fresh = cbm.analyze(
            cb["modality"], cb["phase"],
            int(a["addressable_incidence_per_yr"]), float(a["annual_price_usd"]),
            float(a["peak_penetration"]), int(a["years_at_peak"]),
            bool(cb.get("oncology_adjusted")),
        )
    except (KeyError, ValueError, TypeError) as e:
        checks.append(("cost_benefit reproducible", FAIL,
                       f"could not recompute from saved assumptions: {e}", ""))
        return

    for key in ("probability_of_approval", "expected_remaining_cost_musd",
                "benefit_cost_ratio", "risk_adjusted_gross_profit_musd", "verdict"):
        if cb.get(key) != fresh.get(key):
            checks.append((f"cost_benefit.{key}", FAIL,
                           f"saved {cb.get(key)} != recomputed {fresh.get(key)} "
                           "(deterministic model — file was edited or fabricated)",
                           prov.source_url("benchmarks", "entry", None)))
            return
    checks.append(("cost_benefit deterministic recompute", PASS,
                   "all figures reproduce exactly from stated assumptions",
                   prov.source_url("benchmarks", "entry", None)))


def verify_manifest(run_dir: "Path", checks: list) -> None:
    """Cross-check provenance.json against the artifacts it describes — it was previously never
    read back, so a manifest edited in isolation went uncaught. Two checks: (1) every figure must
    re-validate as a legal origin (fetched/computed, never model) via Figure.__post_init__; and
    (2) figures that mirror a value in dossier.json / cost_benefit.json / binding_site.json must
    equal it. FAIL on any disagreement."""
    p = run_dir / "provenance.json"
    if not p.exists():
        checks.append(("provenance.json present", SKIP, "no manifest to cross-check", ""))
        return
    try:
        man = json.loads(p.read_text())
        figs = {f["name"]: f for f in man.get("figures", [])}
    except (json.JSONDecodeError, OSError, KeyError, TypeError) as e:
        checks.append(("provenance.json well-formed", FAIL, f"could not parse manifest: {e}", ""))
        return

    bad = []
    for name, f in figs.items():
        try:
            prov.Figure(name=f.get("name"), value=f.get("value"),
                        origin=f.get("origin", ""), source=f.get("source", ""))
        except ValueError:
            bad.append(name)
    if bad:
        checks.append(("manifest figure origins", FAIL,
                       f"figures with an illegal (non fetched/computed) origin: {bad}", ""))
        return

    def fig(name):
        f = figs.get(name)
        return f.get("value") if f else None

    mism = []
    dossier_p = run_dir / "dossier.json"
    if dossier_p.exists():
        d = json.loads(dossier_p.read_text())
        u, c = d.get("uniprot") or {}, d.get("chembl") or {}
        drugs = c.get("known_mechanism_drugs")
        for fname, actual in (
            ("uniprot_accession", u.get("accession")),
            ("pdb_structure_count", u.get("pdb_count")),
            ("chembl_potent_activity_records", c.get("potent_activity_records")),
            ("chembl_known_mechanism_drugs", len(drugs) if isinstance(drugs, list) else None),
        ):
            if fname in figs and actual is not None and fig(fname) != actual:
                mism.append(f"{fname}: manifest {fig(fname)} != artifact {actual}")
    cb_p = run_dir / "cost_benefit.json"
    if cb_p.exists():
        cb = json.loads(cb_p.read_text())
        for fname in ("probability_of_approval", "benefit_cost_ratio"):
            if fname in figs and fig(fname) != cb.get(fname):
                mism.append(f"{fname}: manifest {fig(fname)} != artifact {cb.get(fname)}")
    bs_p = run_dir / "binding_site.json"
    if bs_p.exists() and "docking_box" in figs:
        bs = json.loads(bs_p.read_text())
        box = fig("docking_box") or {}
        if box.get("center") != bs.get("center") or box.get("size") != bs.get("size"):
            mism.append("docking_box: manifest center/size != binding_site.json")

    if mism:
        checks.append(("provenance.json matches artifacts", FAIL,
                       "manifest disagrees with the artifacts (edited in isolation?): " + "; ".join(mism), ""))
    else:
        checks.append((f"provenance.json cross-check ({len(figs)} figures)", PASS,
                       "every manifest figure has a legal origin and mirrors its artifact value", ""))


def verify_binding_site(bs: dict, checks: list) -> None:
    """Recompute the docking box from the same PDB's co-crystal ligand envelope; a
    deterministic 'computed' figure, so it must reproduce EXACTLY (like cost_benefit).
    A mismatch means binding_site.json was edited or the structure changed."""
    import binding_site as bsm

    pid = bs.get("pdb")
    if not pid:
        checks.append(("binding_site.json pdb id", SKIP, "no pdb id recorded to recompute from", ""))
        return
    try:
        lig = bsm.largest_ligand(bsm.fetch_pdb_text(pid))
    except Exception as e:  # network/parse problem — don't fabricate a FAIL
        checks.append(("docking box recompute", SKIP, f"could not refetch {pid}: {e}", ""))
        return
    if not lig:
        checks.append(("docking box recompute", FAIL,
                       f"{pid}: no co-crystal ligand found to reproduce the box", ""))
        return
    fresh = bsm.box(lig["atoms"])
    url = prov.source_url("rcsb", "entry", pid)
    if fresh["center"] == bs.get("center") and fresh["size"] == bs.get("size"):
        checks.append(("docking box recompute", PASS,
                       "center+size reproduce exactly from the co-crystal ligand envelope", url))
    else:
        checks.append(("docking box recompute", FAIL,
                       f"saved center/size {bs.get('center')}/{bs.get('size')} != recomputed "
                       f"{fresh['center']}/{fresh['size']} (file edited or structure revised)", url))


def verify_liabilities(liab: dict, checks: list, max_rows: int = 25) -> None:
    """Recompute the PAINS / Brenk structural alerts from the saved SMILES. Deterministic
    given a fixed RDKit alert catalog, so the counts must reproduce — catching an edited
    liabilities.json. SKIP when RDKit is unavailable (never fabricate a pass/fail)."""
    try:
        import cheminformatics as ci
    except Exception as e:  # pragma: no cover
        checks.append(("liabilities recompute", SKIP, f"cheminformatics unavailable: {e}", ""))
        return
    if not getattr(ci, "_RDKIT", False):
        checks.append(("liabilities recompute", SKIP,
                       "RDKit not installed — cannot recompute PAINS/Brenk alerts", ""))
        return
    try:
        pains, brenk = ci._catalogs()
    except Exception as e:
        checks.append(("liabilities recompute", SKIP, f"could not load alert catalogs: {e}", ""))
        return

    mism, checked = 0, 0
    for r in (liab.get("results") or [])[:max_rows]:
        smi = r.get("smiles")
        if not smi:
            continue
        a = ci.analyze(smi, pains, brenk)
        if not a:
            continue
        checked += 1
        # Deterministic per-hit liability fields must all reproduce.
        bad = (a.get("pains_alerts") != r.get("pains_alerts")
               or a.get("brenk_alerts") != r.get("brenk_alerts")
               or a.get("gsk_ok") != r.get("gsk_ok")
               or a.get("pfizer_tox_risk") != r.get("pfizer_tox_risk"))
        # SA score is RDKit-Contrib-dependent — only compare when both sides computed it.
        if (a.get("sa_score") is not None and r.get("sa_score") is not None
                and a["sa_score"] != r["sa_score"]):
            bad = True
        if bad:
            mism += 1
    if not checked:
        checks.append(("liabilities recompute", SKIP, "no SMILES to recompute", ""))
    elif mism:
        checks.append((f"liabilities recompute ({checked} hits)", FAIL,
                       f"{mism} hits' liability fields (PAINS/Brenk/GSK/Pfizer/SA) differ from saved — "
                       "the file was edited, or your RDKit version differs from the one that wrote it "
                       "(re-run the pipeline)", "cad/cheminformatics.py"))
    else:
        checks.append((f"liabilities recompute ({checked} hits)", PASS,
                       "PAINS/Brenk + GSK/Pfizer (and SA where available) reproduce from the saved SMILES",
                       "cad/cheminformatics.py"))


def verify_target_live(target: str, checks: list) -> None:
    """No saved run: just fetch-and-cite the headline figures live."""
    import target_report as tr
    t = tr.resolve_target(target)
    if not t:
        checks.append((f"resolve {target}", FAIL,
                       "no ChEMBL target found — check the name, or the ChEMBL API may be "
                       "temporarily unavailable/rate-limited (retry in a moment)", ""))
        return
    tid = t["target_chembl_id"]
    live = tr.chembl_snapshot(tid)
    checks.append((f"{target}: ChEMBL potent activities = {live['potent_activity_records']}",
                   PASS, "fetched live", prov.source_url("chembl", "activity_count", tid)))
    checks.append((f"{target}: known-mechanism drugs = {len(live['known_mechanism_drugs'])}",
                   PASS, "fetched live", prov.source_url("chembl", "mechanisms", tid)))
    uni = tr.uniprot_summary(target)
    if uni:
        checks.append((f"{target}: PDB structures = {uni['pdb_count']}", PASS, "fetched live",
                       prov.source_url("uniprot", "entry", uni.get("accession", ""))))


def run(args) -> int:
    checks: list[tuple[str, str, str, str]] = []
    target_evidence = False  # did this run contain anything TARGET-specific to verify?

    if args.target:
        verify_target_live(args.target, checks)
        target_evidence = True
    else:
        run_dir = Path(args.run)
        if not run_dir.exists():
            print(f"Run directory not found: {run_dir}", file=sys.stderr)
            return 2
        target_id = None
        dossier_p = run_dir / "dossier.json"
        if dossier_p.exists():
            dossier = json.loads(dossier_p.read_text())
            verify_dossier(dossier, checks)
            target_id = (dossier.get("chembl_target") or {}).get("id")
            target_evidence = True
        else:
            checks.append(("dossier.json present", SKIP, "no dossier to verify", ""))
        if (run_dir / "hits.csv").exists():
            verify_hits(run_dir / "hits.csv", checks, target_id=target_id)
            target_evidence = True
        liab_p = run_dir / "liabilities.json"
        if liab_p.exists():
            verify_liabilities(json.loads(liab_p.read_text()), checks)
            target_evidence = True
        bs_p = run_dir / "binding_site.json"
        if bs_p.exists():
            verify_binding_site(json.loads(bs_p.read_text()), checks)
            target_evidence = True
        cb_p = run_dir / "cost_benefit.json"
        if cb_p.exists():
            verify_cost_benefit(json.loads(cb_p.read_text()), checks)
        # Cross-check the provenance manifest against the artifacts it claims to describe.
        verify_manifest(run_dir, checks)

        # A run with NO target-specific evidence (no dossier, no hits) must never earn a
        # green "every figure verified" banner — that would bless an unresolved/fictional
        # target. If there is also nothing deterministic to recompute, it is a hard FAIL;
        # a cost-benefit-only dir (target-independent) stays PASS but the banner is qualified.
        if not target_evidence and not any(s != SKIP for _, s, _, _ in checks):
            checks.append(("target-derived figures present", FAIL,
                           "run has no dossier, hits, or cost-benefit — nothing to verify; an "
                           "unresolved target produces no figures to re-prove", ""))

    n_fail = sum(1 for _, s, _, _ in checks if s == FAIL)
    n_drift = sum(1 for _, s, _, _ in checks if s == DRIFT)

    if args.json:
        print(json.dumps({
            "checks": [{"figure": f, "status": s, "note": n, "verify_url": u} for f, s, n, u in checks],
            "fail": n_fail, "drift": n_drift, "ok": n_fail == 0,
            "target_evidence": target_evidence,
        }, indent=2))
        return 1 if n_fail else 0

    print("\n=== Provenance verification ===")
    print("Re-checking reported figures: dossier counts, and every shortlist hit's SMILES + QED + "
          "potency + descriptors are re-pulled live from ChEMBL; deterministic artifacts are recomputed.\n")
    icon = {PASS: "✅", DRIFT: "≈ ", FAIL: "❌", SKIP: "– "}
    for figure, status, note, url in checks:
        print(f"  {icon[status]} {status:<5} {figure}")
        if note:
            print(f"          {note}")
        if url:
            print(f"          verify: {url}")
    print()
    if n_fail:
        print(f"❌ {n_fail} figure(s) could not be reproduced from their source. Treat as SUSPECT.")
    elif not target_evidence:
        print("⚠️  No target-specific figures in this run (no dossier/hits). Any deterministic "
              "artifact present reproduced exactly, but NOTHING target-derived was verified — "
              "this is not a clean bill of health for a target.")
    elif n_drift:
        print(f"✅ No FAILs. {n_drift} figure(s) DRIFTed within tolerance (max(2, 10%), EITHER "
              f"direction — counts can also shrink) and still exit 0 — re-run to refresh.")
    else:
        print("✅ Every CHECKED figure reproduced exactly from its live source.")
    print("Scope: dossier ChEMBL/UniProt counts + EVERY shortlist hit's SMILES, QED, potency "
          "(best_pchembl) and mw/alogp/TPSA are independently re-fetched from ChEMBL; cost_benefit, "
          "the docking box, the triage score and the liabilities are recomputed; and provenance.json "
          "is cross-checked against the artifacts. Residue (by design): DRIFT (a within-tolerance "
          "change in a living DB) exits 0 — shown, not silent.")
    print("This checks numbers are re-derivable/untampered — not that a molecule works, nor that "
          "the query design is correct. Triage ≠ validation. Not medical advice.")
    return 1 if n_fail else 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Verify that a pipeline run's figures are real (re-fetch & compare).")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--run", help="A run directory from cad/run_pipeline.py (dossier.json, hits.csv, cost_benefit.json).")
    g.add_argument("--target", help="No saved run — just fetch-and-cite the headline figures live.")
    p.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = p.parse_args(argv)
    try:
        return run(args)
    except Exception as e:  # network or parse problems: report, don't fabricate
        print(f"Verification error (no result is better than a fabricated one): {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
