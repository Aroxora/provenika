import { Injectable } from '@angular/core';
import { CostBenefit } from './models';

// Port of cad/cost_benefit.py. Public benchmarks (BIO/Informa CDSR 2011-2020;
// Wong et al. 2019; DiMasi et al. 2016). Rough planning heuristic — not a valuation.

const LOA_FROM_PHASE: Record<string, number> = {
  preclinical: 0.06, phase1: 0.079, phase2: 0.151, phase3: 0.46, filed: 0.906,
};
const PHASE_PLAN: [string, number, number][] = [
  ['preclinical', 10, 1.5], ['phase1', 25, 1.5], ['phase2', 60, 2.5], ['phase3', 255, 3.0], ['filed', 20, 1.0],
];
export const MODALITY_MULT: Record<string, number> = {
  small_molecule: 1.0, mab: 1.2, adc: 1.4, mrna_vaccine: 1.3, car_t: 1.8, gene_therapy: 2.0,
};
const PHASE_ORDER = ['preclinical', 'phase1', 'phase2', 'phase3', 'filed'];
const ONCOLOGY_FACTOR = 0.65;

@Injectable({ providedIn: 'root' })
export class CostBenefitService {
  analyze(o: {
    modality: string; phase: string; incidence: number; price: number;
    penetration?: number; yearsAtPeak?: number; oncology?: boolean;
  }): CostBenefit {
    const penetration = o.penetration ?? 0.2;
    const yearsAtPeak = o.yearsAtPeak ?? 5;
    const oncology = o.oncology ?? true;
    const mult = MODALITY_MULT[o.modality] ?? 1;
    const loa = (LOA_FROM_PHASE[o.phase] ?? 0.05) * (oncology ? ONCOLOGY_FACTOR : 1);

    const start = PHASE_ORDER.indexOf(o.phase);
    const remaining = PHASE_PLAN.filter(([p]) => PHASE_ORDER.indexOf(p) >= start);
    const expCost = round(remaining.reduce((s, [, c]) => s + c, 0) * mult, 1);
    const expTime = round(remaining.reduce((s, [, , t]) => s + t, 0), 1);

    const peakRev = o.incidence * o.price * penetration;
    const grossMargin = 0.8;
    const riskAdjRev = loa * peakRev * yearsAtPeak * grossMargin;
    const bcr = expCost ? riskAdjRev / (expCost * 1e6) : 0;

    let verdict: string;
    if (bcr >= 5) verdict = 'Strongly favorable — high risk-adjusted return vs. cost';
    else if (bcr >= 1.5) verdict = 'Favorable — proceed, refine assumptions';
    else if (bcr >= 0.8) verdict = 'Marginal — sensitive to price/penetration/PoS; de-risk first';
    else verdict = 'Unfavorable — risk-adjusted return below remaining cost';

    return {
      modality: o.modality,
      phase: o.phase,
      probabilityOfApproval: round(loa, 4),
      expectedCostMusd: expCost,
      expectedTimeYears: expTime,
      peakRevenueMusd: round(peakRev / 1e6, 1),
      riskAdjustedRevenueMusd: round(riskAdjRev / 1e6, 1),
      benefitCostRatio: round(bcr, 2),
      verdict,
    };
  }
}
function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
