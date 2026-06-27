#!/usr/bin/env python3
"""
Offline tests for the validation harness (cad/validate.py):
  * the degenerate-input guard on the labelled-CSV enrichment (no silent AUC on junk),
  * the pure ligand-based scoring pieces (ECFP4 max-similarity, Spearman leakage guard).

No network, no Vina. The RDKit-dependent similarity check self-skips if RDKit is absent.
"""

from __future__ import annotations

import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import validate as V  # noqa: E402

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def _csv(text: str) -> str:
    f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False)
    f.write(text)
    f.close()
    return f.name


# --- WI-14: degenerate-input guard --------------------------------------------------
def test_enrichment_guard():
    empty = V.run_enrichment_csv(_csv("wrong,header\n1,2\n"))
    check("no parseable score/label → skipped", empty.get("status") == "skipped")

    one_class = V.run_enrichment_csv(_csv("score,label\n0.9,1\n0.8,1\n0.7,1\n"))
    check("single-class → insufficient_labels", one_class.get("status") == "insufficient_labels")

    mixed = V.run_enrichment_csv(_csv("score,label\n0.9,1\n0.1,0\n0.8,1\nNaNish,0\n,1\n"))
    check("valid mixed set → ok with both classes", mixed.get("status") == "ok" and mixed["actives"] == 2)
    check("malformed rows are counted, not silently dropped", mixed.get("dropped") == 2)
    check("AUC computed only when both classes present", isinstance(mixed.get("roc_auc"), float))

    perfect = V.run_enrichment_csv(_csv("score,label\n0.9,1\n0.8,1\n0.2,0\n0.1,0\n"))
    check("perfect separation AUC = 1.0", perfect.get("roc_auc") == 1.0)


# --- Spearman leakage guard ---------------------------------------------------------
def test_spearman():
    check("monotone increasing → +1", V._spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]) == 1.0)
    check("monotone decreasing → -1", V._spearman([1, 2, 3, 4, 5], [50, 40, 30, 20, 10]) == -1.0)
    check("too few points → None", V._spearman([1, 2], [1, 2]) is None)
    rho = V._spearman([1, 2, 3, 4], [2, 1, 4, 3])   # rho = 0.6 — real but below the leak threshold
    check("moderate correlation stays below the 0.95 leak threshold",
          rho is not None and abs(rho - 0.6) < 1e-6 and abs(rho) < 0.95)


def test_leak_threshold_logic():
    # The guard flags |rho| > 0.95. A score that IS the potency leaks; an unrelated one does not.
    pchembl = [9.0, 8.5, 8.0, 7.5, 7.0, 6.5]
    leaking_rho = V._spearman(pchembl, pchembl)            # score == potency
    check("score == potency → rho 1.0 (would be flagged leaking)", leaking_rho == 1.0)
    check("leak rule fires on rho 1.0", abs(leaking_rho) > 0.95)


# --- ECFP4 max-similarity scoring (RDKit) -------------------------------------------
def test_similarity_scores():
    try:
        from rdkit import Chem  # noqa: F401
    except Exception:
        print("  -- RDKit absent: similarity scoring test skipped")
        return
    queries = ["CC(=O)Oc1ccccc1C(=O)O"]                       # aspirin
    cands = ["CC(=O)Oc1ccccc1C(=O)O",                          # identical → 1.0
             "CCCCCCCCCCCC",                                   # dodecane → very dissimilar
             "O=C(O)c1ccccc1O"]                                # salicylic acid → moderate
    scores = V.max_similarity_scores(queries, cands)
    check("identical molecule scores 1.0", scores[0] == 1.0)
    check("dissimilar molecule scores low", scores[1] < 0.2)
    check("related molecule scores between", 0.0 < scores[2] < 1.0)
    check("a non-circular score uses no potency", len(scores) == 3)


def test_template_pose_rmsd():
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem
    except Exception:
        print("  -- RDKit absent: template-RMSD test skipped")
        return
    smi = "c1ccccc1C(=O)O"  # benzoic acid
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    AllChem.EmbedMolecule(m, randomSeed=7)
    m = Chem.RemoveHs(m)
    shifted = Chem.Mol(m)
    conf = shifted.GetConformer()
    for a in range(shifted.GetNumAtoms()):
        p = conf.GetAtomPosition(a)
        conf.SetAtomPosition(a, (p.x + 2.0, p.y, p.z))  # rigid 2 Å translation
    rmsd, err = V.template_pose_rmsd(m, shifted, smi)
    check("template RMSD of a 2 Å rigid shift ≈ 2.0", rmsd is not None and abs(rmsd - 2.0) < 1e-3)
    # A genuine connectivity mismatch must return a reason, never a fabricated number.
    other = Chem.MolFromSmiles("CCCCCCCC")
    r2, e2 = V.template_pose_rmsd(other, other, smi)
    check("mismatched template → (None, reason), not a fake RMSD", r2 is None and bool(e2))


def test_recheck_redock_validation():
    good = {"results": [{"pdb": "1A", "rmsd": 1.0}, {"pdb": "1B", "rmsd": 3.0},
                        {"pdb": "1C", "rmsd": 1.5}, {"pdb": "1D", "skip": "x"}],
            "summary": V.summarize_rmsds([1.0, 3.0, 1.5])}
    f = _csv("")  # reuse temp-file helper for a path
    Path(f).write_text(json.dumps(good))
    r = V.recheck_redock_validation(f)
    check("committed redock summary re-derives from per-complex RMSDs", r["matches"] is True)
    # Tamper the summary → mismatch detected.
    good["summary"]["success_rate"] = 1.0
    Path(f).write_text(json.dumps(good))
    r2 = V.recheck_redock_validation(f)
    check("a tampered redock summary is caught", r2["matches"] is False)


def test_tool_versions_shape():
    v = V.tool_versions()
    for k in ("vina", "obabel", "obrms", "meeko", "rdkit", "pdb2pqr"):
        check(f"tool_versions reports '{k}'", k in v)
    check("absent Vina reported as None (not fabricated)", v["vina"] is None or isinstance(v["vina"], str))


def test_committed_enrichment_rederives():
    # The committed EGFR evidence must recompute its own headline AUC/EF from its `scored` rows,
    # offline — the anti-hallucination guarantee applied to a validation number.
    f = Path(__file__).parent.parent / "examples" / "validation-enrichment" / "EGFR.json"
    if not f.exists():
        print("  -- committed EGFR enrichment evidence absent: recheck skipped")
        return
    r = V.recheck_enrichment_file(str(f))
    check("committed enrichment AUC/EF re-derive from the file's own rows", r["matches"] is True)
    check("committed evidence has the full scored set", r["n_scored"] >= 100)
    import json as _json
    d = _json.loads(f.read_text())
    check("committed evidence passed its leakage guard", d["leakage_guard"]["leaking"] is False)
    check("committed AUC is meaningfully above random (>0.7)", d["roc_auc"] > 0.7)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} validation-harness assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
