#!/usr/bin/env python3
"""
Precompute RDKit cheminformatics for the web app.

The browser can't run RDKit, so the genuinely RDKit-only signals (PAINS/Brenk
structural alerts, Bemis-Murcko scaffold, Egan rule, fraction-Csp3) are computed
here for a curated set of targets and written as static JSON the site loads. Run
locally or in CI (see .github/workflows/cheminformatics-precompute.yml).

For each target: virtual_triage.py (top hits with SMILES) -> cheminformatics.analyze
-> web/public/data/cheminformatics/<TARGET>.json keyed by ChEMBL ID, plus index.json.

Usage:
  python3 cad/precompute_site_data.py                       # default curated targets
  python3 cad/precompute_site_data.py --targets EGFR BTK --limit 25
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
OUT_DIR = ROOT / "web" / "public" / "data" / "cheminformatics"
sys.path.insert(0, str(HERE))

DEFAULT_TARGETS = ["EGFR", "BTK", "ALK", "BRAF", "KRAS G12C", "PARP1"]


def slug(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").upper()


def triage(target: str, limit: int, min_pchembl: float) -> dict | None:
    res = subprocess.run(
        [sys.executable, str(HERE / "virtual_triage.py"), "--target", target,
         "--limit", str(limit), "--min-pchembl", str(min_pchembl), "--json"],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        print(f"  ! triage failed for {target}: {res.stderr.strip()[:160]}", file=sys.stderr)
        return None
    try:
        return json.loads(res.stdout)
    except json.JSONDecodeError:
        return None


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Precompute cheminformatics JSON for the web app.")
    p.add_argument("--targets", nargs="*", default=DEFAULT_TARGETS)
    p.add_argument("--limit", type=int, default=25)
    p.add_argument("--min-pchembl", type=float, default=7.0)
    p.add_argument("--stamp", default="", help="ISO date to record (avoids nondeterministic clocks).")
    args = p.parse_args(argv)

    try:
        from cheminformatics import analyze, _catalogs, _RDKIT
    except Exception as e:
        print(f"Cannot import cheminformatics: {e}", file=sys.stderr)
        return 3
    if not _RDKIT:
        print("RDKit required: pip install rdkit", file=sys.stderr)
        return 3

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pains, brenk = _catalogs()
    index = []

    for target in args.targets:
        data = triage(target, args.limit, args.min_pchembl)
        if not data:
            continue
        by_chembl = {}
        for hit in data.get("candidates", []):
            smi = hit.get("smiles")
            cid = hit.get("chembl_id")
            if not smi or not cid:
                continue
            a = analyze(smi, pains, brenk)
            if not a:
                continue
            pchembl = hit.get("best_pchembl")
            entry = {
                "painsAlerts": a["pains_alerts"], "pains": a["pains"],
                "brenkAlerts": a["brenk_alerts"], "brenk": a["brenk"],
                "scaffold": a["murcko_scaffold"], "eganOk": a["egan_ok"],
                "fractionCsp3": a["fraction_csp3"], "clean": a["clean"],
            }
            if isinstance(pchembl, (int, float)):
                from cheminformatics import ligand_efficiency, lipophilic_efficiency
                entry["le"] = ligand_efficiency(pchembl, a["heavy_atoms"])
                entry["lle"] = lipophilic_efficiency(pchembl, a["clogp"])
            by_chembl[cid] = entry
        if not by_chembl:
            continue
        payload = {
            "target": target, "targetId": data.get("target", {}).get("id"),
            "targetName": data.get("target", {}).get("name"),
            "generated": args.stamp, "count": len(by_chembl), "byChembl": by_chembl,
        }
        fname = f"{slug(target)}.json"
        (OUT_DIR / fname).write_text(json.dumps(payload, indent=2))
        index.append({"target": target, "slug": slug(target), "file": fname, "count": len(by_chembl)})
        print(f"  {target}: {len(by_chembl)} compounds -> {fname}")

    (OUT_DIR / "index.json").write_text(json.dumps({"generated": args.stamp, "targets": index}, indent=2))
    print(f"Wrote {len(index)} target file(s) + index.json to {OUT_DIR.relative_to(ROOT)}")
    return 0 if index else 1


if __name__ == "__main__":
    raise SystemExit(main())
