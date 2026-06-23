#!/usr/bin/env python3
"""
Guard the web cheminformatics precompute against silently shrinking the committed /explore set.

cad/precompute_site_data.py runs unattended in the weekly Action; if ChEMBL is flaky it must NOT
wipe or shrink web/public/data/cheminformatics/index.json. A zero-target run (every triage failed)
leaves the committed index untouched and exits non-zero; a partial/subset run MERGES by slug —
updating this run's targets while keeping the rest.

Offline: triage() and the cheminformatics RDKit helpers are monkeypatched. No network, no RDKit.
"""

from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import cheminformatics as ci  # noqa: E402
import precompute_site_data as pre  # noqa: E402

_passed = 0


def ok(name: str) -> None:
    global _passed
    print(f"  ok  {name}")
    _passed += 1


def _fake_analyze(smi, pains, brenk):
    return {
        "pains_alerts": 0, "pains": [], "brenk_alerts": 0, "brenk": [],
        "murcko_scaffold": "c1ccccc1", "egan_ok": True, "fraction_csp3": 0.3, "clean": True,
        "gsk_ok": True, "pfizer_tox_risk": False, "sa_score": 2.5,
        "heavy_atoms": 20, "clogp": 2.0,
    }


def _install_stubs() -> None:
    # main() does `from cheminformatics import ...` at call time, so patching the module namespace
    # is enough — no real RDKit needed.
    ci.analyze = _fake_analyze
    ci._catalogs = lambda: (None, None)
    ci._RDKIT = True
    ci.cluster_indices = lambda smis: [0 for _ in smis]
    ci.ligand_efficiency = lambda p, h: 0.5
    ci.lipophilic_efficiency = lambda p, c: 4.0


def _triage(hits_map):
    def _t(target, limit, min_pchembl):
        hits = hits_map.get(target)
        if hits is None:  # simulate a failed triage (ChEMBL down / no data)
            return None
        return {
            "target": {"id": "CHEMBLX", "name": target},
            "candidates": [{"chembl_id": c, "smiles": "CCO", "best_pchembl": 7.5} for c in hits],
        }
    return _t


def _run(targets, hits_map, tmp: Path) -> int:
    pre.OUT_DIR = tmp
    pre.ROOT = tmp  # keeps the summary print's relative_to() happy under the temp dir
    pre.triage = _triage(hits_map)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        return pre.main(["--targets", *targets, "--stamp", "2026-01-01"])


def main() -> int:
    _install_stubs()
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)

        # 1. Seed: a successful run writes three targets + an index listing them.
        rc = _run(["AAA", "BBB", "CCC"], {"AAA": ["C1"], "BBB": ["C2"], "CCC": ["C3"]}, tmp)
        idx = json.loads((tmp / "index.json").read_text())
        assert rc == 0 and {t["slug"] for t in idx["targets"]} == {"AAA", "BBB", "CCC"}, idx
        ok("seed run writes 3 targets to index.json")

        # 2. Zero-target run (every triage fails) must leave the committed index untouched, exit 1.
        before = (tmp / "index.json").read_text()
        rc = _run(["AAA"], {"AAA": None}, tmp)
        assert rc == 1, f"expected non-zero exit on total failure, got {rc}"
        assert (tmp / "index.json").read_text() == before, "index.json was modified on a zero-target run"
        ok("zero-target run leaves index.json untouched (no wipe)")

        # 3. Subset run updates its own target and KEEPS the others (never shrinks the set).
        rc = _run(["BBB"], {"BBB": ["C2", "C2b"]}, tmp)
        idx = json.loads((tmp / "index.json").read_text())
        slugs = {t["slug"] for t in idx["targets"]}
        assert rc == 0 and slugs == {"AAA", "BBB", "CCC"}, f"subset run shrank the set: {slugs}"
        bbb = next(t for t in idx["targets"] if t["slug"] == "BBB")
        assert bbb["count"] == 2, bbb
        ok("subset run merges by slug (updates BBB, keeps AAA/CCC — no shrink)")

        # 4. The new developability/SA fields land in the per-target payload.
        payload = json.loads((tmp / "BBB.json").read_text())
        entry = next(iter(payload["byChembl"].values()))
        assert entry["gskOk"] is True and entry["pfizerToxRisk"] is False and entry["saScore"] == 2.5, entry
        ok("payload carries gskOk / pfizerToxRisk / saScore")

    print(f"\n{_passed} checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
