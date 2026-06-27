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

# Curated, well-covered oncology targets refreshed by the weekly precompute Action.
# Keep in sync with web/public/data/cheminformatics/ so the scheduled run maintains
# (rather than shrinks) the cheminformatics-ready set.
DEFAULT_TARGETS = [
    "EGFR", "ERBB2", "BTK", "ALK", "ROS1", "RET", "ABL1", "BRAF", "MAP2K1",
    "CDK4", "CDK6", "MTOR", "JAK2", "FLT3", "PARP1", "BCL2", "FGFR1", "KRAS G12C",
    # Expanded coverage — clinically validated oncology drug targets, each verified to resolve to
    # the correct ChEMBL single human protein (see resolve_target's exact-gene-symbol preference).
    "KIT", "MET", "AKT1", "AURKA", "CDK2", "FGFR2", "FGFR3", "NTRK1", "IDH1", "EZH2",
    "PIK3CA", "IDH2", "SMO", "PDGFRA", "SRC", "CHEK1", "ATR", "PLK1", "WEE1", "CDK9",
]


def slug(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").upper()


def triage(target: str, limit: int, min_pchembl: float) -> dict | None:
    res = subprocess.run(
        [sys.executable, str(HERE / "virtual_triage.py"), "--target", target,
         "--limit", str(limit), "--min-pchembl", str(min_pchembl),
         # The web precompute only needs SMILES + potency; skip the per-hit selectivity probe so the
         # 38-target weekly batch doesn't fan out to thousands of extra ChEMBL calls.
         "--no-selectivity", "--json"],
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
        ordered: list[tuple[str, str]] = []  # (chembl_id, smiles) for clustering
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
                # Developability / tox-risk heuristics (descriptor-only, cited in cheminformatics.py).
                "gskOk": a["gsk_ok"], "pfizerToxRisk": a["pfizer_tox_risk"],
            }
            # Synthetic-accessibility (Ertl & Schuffenhauer 2009) — only when the SA scorer
            # Contrib is installed; omitted (not null) otherwise so the field stays optional.
            if a.get("sa_score") is not None:
                entry["saScore"] = a["sa_score"]
            if isinstance(pchembl, (int, float)):
                from cheminformatics import ligand_efficiency, lipophilic_efficiency
                entry["le"] = ligand_efficiency(pchembl, a["heavy_atoms"])
                entry["lle"] = lipophilic_efficiency(pchembl, a["clogp"])
            by_chembl[cid] = entry
            ordered.append((cid, smi))
        if not by_chembl:
            continue
        # Chemotype clustering (Butina/ECFP4) across this target's hits.
        from cheminformatics import cluster_indices
        cluster_ids = cluster_indices([s for _, s in ordered])
        for (cid, _), clu in zip(ordered, cluster_ids):
            by_chembl[cid]["cluster"] = clu
        n_clusters = len({c for c in cluster_ids if c is not None})
        payload = {
            "target": target, "targetId": data.get("target", {}).get("id"),
            "targetName": data.get("target", {}).get("name"),
            "generated": args.stamp, "count": len(by_chembl),
            "clusterCount": n_clusters, "byChembl": by_chembl,
        }
        fname = f"{slug(target)}.json"
        (OUT_DIR / fname).write_text(json.dumps(payload, indent=2))
        # Stamp each entry with its OWN refresh date. On a partial/subset merge below, a target
        # that wasn't refreshed keeps its older date, so a stale per-target file is visible
        # (entry.generated < index.generated) instead of being masked by the advancing index date.
        index.append({"target": target, "slug": slug(target), "file": fname,
                      "count": len(by_chembl), "generated": args.stamp})
        print(f"  {target}: {len(by_chembl)} compounds -> {fname}")

    idx_path = OUT_DIR / "index.json"
    if not index:
        # All triage attempts failed (e.g. a ChEMBL outage during the weekly Action). Leave the
        # committed index.json untouched — wiping it would silently break /explore for every target.
        print("No targets produced output (all triage failed — ChEMBL down?); "
              "leaving existing index.json untouched.", file=sys.stderr)
        return 1
    # Merge into the existing index by slug so a partial or subset run UPDATES rather than SHRINKS
    # the committed cheminformatics-ready set — a flaky data source must never silently shrink it.
    merged: dict[str, dict] = {}
    if idx_path.exists():
        try:
            for t in json.loads(idx_path.read_text()).get("targets", []):
                if t.get("slug"):
                    merged[t["slug"]] = t
        except (json.JSONDecodeError, OSError):
            pass
    for t in index:
        merged[t["slug"]] = t
    out = sorted(merged.values(), key=lambda t: t["slug"])
    idx_path.write_text(json.dumps({"generated": args.stamp, "targets": out}, indent=2))
    print(f"Wrote {len(index)} target file(s); index.json now lists {len(out)} target(s) "
          f"in {OUT_DIR.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
