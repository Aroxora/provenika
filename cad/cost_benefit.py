#!/usr/bin/env python3
"""
Cost-benefit / feasibility analysis for a proposed therapeutic system.

A transparent planning model that turns a proposal (modality + current phase +
addressable population + price) into:
  * probability of regulatory approval from the current phase (LOA),
  * expected remaining development cost and time,
  * a risk-adjusted revenue estimate,
  * a benefit/cost ratio and a plain-language verdict.

EVERY assumption is a published, editable benchmark printed alongside the result.
This is a rough go/no-go triage aid for prioritising programs — NOT financial
advice, a valuation, or a clinical claim.

Sources for the default benchmarks (override with flags):
  * Phase success / LOA: BIO, Informa Pharma Intelligence & QLS, "Clinical
    Development Success Rates 2011-2020" (overall, all therapeutic areas).
  * Per-phase out-of-pocket cost & duration: Wong, Siah & Lo (2019, Biostatistics)
    and DiMasi et al. (2016, J Health Econ). Oncology runs above these averages.
Numbers are order-of-magnitude planning figures, not guarantees.

Usage:
  python3 cad/cost_benefit.py --modality small_molecule --phase phase1 \
      --incidence 60000 --price 150000
  python3 cad/cost_benefit.py --modality car_t --phase preclinical --json
"""

from __future__ import annotations

import argparse
import json
import sys

# Likelihood of approval FROM the start of each phase (overall, BIO 2011-2020).
LOA_FROM_PHASE = {
    "preclinical": 0.060,  # rough: ~6% of programs entering IND-enabling work approve
    "phase1": 0.079,
    "phase2": 0.151,
    "phase3": 0.460,
    "filed": 0.906,
}

# Phases still ahead, with out-of-pocket cost ($M) and duration (years).
PHASE_PLAN = [
    ("preclinical", 10.0, 1.5),
    ("phase1", 25.0, 1.5),
    ("phase2", 60.0, 2.5),
    ("phase3", 255.0, 3.0),
    ("filed", 20.0, 1.0),
]

# Modality multipliers (development cost & complexity vs. a small molecule).
MODALITY_MULT = {
    "small_molecule": 1.0,
    "mab": 1.2,
    "adc": 1.4,
    "mrna_vaccine": 1.3,
    "car_t": 1.8,
    "gene_therapy": 2.0,
}

# Oncology programs historically carry lower success than the all-areas average.
ONCOLOGY_LOA_FACTOR = 0.65

PHASE_ORDER = ["preclinical", "phase1", "phase2", "phase3", "filed"]


def analyze(modality: str, phase: str, incidence: int, price: float,
            penetration: float, years_at_peak: int, oncology: bool) -> dict:
    mult = MODALITY_MULT[modality]
    loa = LOA_FROM_PHASE[phase] * (ONCOLOGY_LOA_FACTOR if oncology else 1.0)

    # Remaining cost & time from current phase onward.
    start = PHASE_ORDER.index(phase)
    remaining = [p for p in PHASE_PLAN if PHASE_ORDER.index(p[0]) >= start]
    exp_cost = round(sum(c for _, c, _ in remaining) * mult, 1)
    exp_time = round(sum(t for _, _, t in remaining), 1)

    # Benefit side: risk-adjusted revenue over the peak-sales window.
    peak_annual_rev = incidence * price * penetration            # $/yr at peak
    gross_margin = 0.80
    risk_adj_rev = loa * peak_annual_rev * years_at_peak * gross_margin

    cost_dollars = exp_cost * 1e6
    bcr = (risk_adj_rev / cost_dollars) if cost_dollars else 0.0

    if bcr >= 5:
        verdict = "Strongly favorable — high risk-adjusted return vs. cost"
    elif bcr >= 1.5:
        verdict = "Favorable — proceed, refine assumptions"
    elif bcr >= 0.8:
        verdict = "Marginal — sensitive to price/penetration/PoS; de-risk first"
    else:
        verdict = "Unfavorable — risk-adjusted return below remaining cost"

    return {
        "modality": modality,
        "phase": phase,
        "oncology_adjusted": oncology,
        "probability_of_approval": round(loa, 4),
        "expected_remaining_cost_musd": exp_cost,
        "expected_time_to_market_years": exp_time,
        "peak_annual_revenue_musd": round(peak_annual_rev / 1e6, 1),
        "risk_adjusted_revenue_musd": round(risk_adj_rev / 1e6, 1),
        "benefit_cost_ratio": round(bcr, 2),
        "verdict": verdict,
        "assumptions": {
            "modality_cost_multiplier": mult,
            "loa_from_phase": LOA_FROM_PHASE[phase],
            "oncology_loa_factor": ONCOLOGY_LOA_FACTOR if oncology else 1.0,
            "addressable_incidence_per_yr": incidence,
            "annual_price_usd": price,
            "peak_penetration": penetration,
            "years_at_peak": years_at_peak,
            "gross_margin": gross_margin,
            "sources": "BIO/Informa CDSR 2011-2020; Wong et al. 2019; DiMasi et al. 2016",
        },
    }


def run(args) -> int:
    res = analyze(args.modality, args.phase, args.incidence, args.price,
                  args.penetration, args.years_at_peak, not args.no_oncology)
    if args.json:
        print(json.dumps(res, indent=2))
        return 0

    print(f"\n=== Cost-benefit / feasibility: {args.modality} @ {args.phase} ===\n")
    print(f"  Probability of approval (from {args.phase}): {res['probability_of_approval']*100:.1f}%")
    print(f"  Expected remaining cost:   ${res['expected_remaining_cost_musd']:,.0f}M")
    print(f"  Expected time to market:   {res['expected_time_to_market_years']} years")
    print(f"  Peak annual revenue:       ${res['peak_annual_revenue_musd']:,.0f}M  "
          f"({args.incidence:,} pts × ${args.price:,.0f} × {args.penetration:.0%})")
    print(f"  Risk-adjusted revenue:     ${res['risk_adjusted_revenue_musd']:,.0f}M  "
          f"(over {args.years_at_peak} yr at peak)")
    print(f"  Benefit/cost ratio:        {res['benefit_cost_ratio']:.2f}")
    print(f"\n  ➤ {res['verdict']}\n")
    print("  Assumptions (edit via flags):")
    for k, v in res["assumptions"].items():
        print(f"    - {k}: {v}")
    print("\n⚠️  Rough planning heuristic from public benchmarks. Not financial advice, "
          "not a valuation, not a clinical claim.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Cost-benefit / feasibility triage for a proposed therapeutic program.")
    p.add_argument("--modality", required=True, choices=sorted(MODALITY_MULT))
    p.add_argument("--phase", required=True, choices=PHASE_ORDER)
    p.add_argument("--incidence", type=int, default=50000,
                   help="Addressable patients/yr (default 50000).")
    p.add_argument("--price", type=float, default=150000,
                   help="Annual/therapy price in USD (default 150000).")
    p.add_argument("--penetration", type=float, default=0.20,
                   help="Peak market penetration fraction (default 0.20).")
    p.add_argument("--years-at-peak", type=int, default=5,
                   help="Years of peak sales counted (default 5).")
    p.add_argument("--no-oncology", action="store_true",
                   help="Do not apply the lower oncology success factor.")
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    if not 0 < args.penetration <= 1:
        print("--penetration must be in (0,1].", file=sys.stderr)
        return 1
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
