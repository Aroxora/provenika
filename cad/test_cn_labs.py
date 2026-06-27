#!/usr/bin/env python3
"""
Offline tests for the China-region bench routes (cad/cn_labs.py) and the `--region cn` path in
cad/validation_package.py. No network: target_evidence is stubbed out.

Guards what makes this useful AND honest for a researcher in China: (1) the China lab set covers every
experiment step the chain references (no step left without a domestic route), (2) the Simplified-Chinese
pitch is honest (predicted candidates, NOT validated hits), invents no contact/price, and leaves the
human to send, (3) `--region cn` actually swaps in the China CROs and the Chinese pitch (and `global`
does not), (4) no efficacy/medical claim sneaks in.
"""

from __future__ import annotations

import csv
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import cn_labs as CN  # noqa: E402
import validation_package as V  # noqa: E402
import target_evidence as _TE  # noqa: E402

# Keep offline: validation_package best-effort-fetches Open Targets; stub it.
_TE.resolve_ensembl = lambda s: None

_passed = 0


def check(name: str, cond: bool) -> None:
    global _passed
    if not cond:
        print(f"  FAIL  {name}", file=sys.stderr)
        raise SystemExit(1)
    print(f"  ok  {name}")
    _passed += 1


def _run(d: Path) -> Path:
    (d / "dossier.json").write_text(json.dumps({"chembl_target": {"name": "KRAS"}, "query": "KRAS"}))
    with (d / "docked_hits.csv").open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["chembl_id", "smiles", "vina_best_dG_kcal_per_mol", "pchembl_median"])
        w.writeheader()
        w.writerow({"chembl_id": "CHEMBL5573020", "smiles": "CCO", "vina_best_dG_kcal_per_mol": "-9.8", "pchembl_median": "9.8"})
    return d


def test_china_routes_cover_every_step():
    # Every experiment-chain step must have at least one domestic route, plus the translation route.
    chain_keys = {key for _, _, _, key, _ in V.CHAIN}
    for k in chain_keys | {"translation"}:
        routes = CN.PARTNERS_CN.get(k) or []
        check(f"China route exists for '{k}'", len(routes) >= 1)
        for name, url, what in routes:
            check(f"  '{k}' entry well-formed ({name[:18]})",
                  bool(name) and url.startswith("https://") and bool(what))


def test_partner_key_parity_with_global():
    check("China partner keys == global partner keys", set(CN.PARTNERS_CN) == set(V.PARTNERS))


def test_chinese_pitch_is_honest_and_unsent():
    pkg = {"target": "KRAS", "candidates": [{"chembl_id": "CHEMBL5573020"}]}
    email = CN.pitch_email_cn(pkg)
    check("pitch names the target", "KRAS" in email)
    check("pitch names the top candidate", "CHEMBL5573020" in email)
    check("pitch is honest: not experimentally validated", "尚未经过任何实验验证" in email)
    check("pitch asks for the first step (biochemical IC50)", "IC50" in email)
    check("pitch leaves the human to sign", "[您的姓名]" in email)
    check("pitch invents no contact email", "@" not in email)
    check("pitch makes no efficacy/cure claim", not any(w in email for w in ("治愈", "疗效", "有效治疗")))


def test_region_cn_swaps_labs_and_pitch():
    with tempfile.TemporaryDirectory() as t:
        d = _run(Path(t))
        pkg = V.build(d)
        cn_md = V.to_markdown(pkg, "kras", region="cn")
        gl_md = V.to_markdown(pkg, "kras", region="global")
        check("cn markdown lists a China CRO (Viva Biotech)", "Viva Biotech" in cn_md and "维亚生物" in cn_md)
        check("cn markdown lists Crown Bioscience PDX route", "Crown Bioscience" in cn_md)
        check("cn markdown adds the China clinical registry (ChiCTR)", "ChiCTR" in cn_md)
        check("cn markdown carries the run-locally note (Firewall reality)", "blocked" in cn_md.lower())
        check("global markdown keeps US/EU routes (Reaction Biology)", "Reaction Biology" in gl_md)
        check("global markdown does NOT inject China CROs", "Viva Biotech" not in gl_md)
        check("both still say 'not medical advice'", "not medical advice" in cn_md and "not medical advice" in gl_md)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print(f"\n{_passed} China-bench assertions passed across {len(tests)} tests.")


if __name__ == "__main__":
    main()
