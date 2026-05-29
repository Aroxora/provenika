// Pure, well-established quantitative-pharmacology models used by the interactive
// math tools. Every formula is standard and citable; keep them exact and documented.

export interface Pt { x: number; y: number; }

/**
 * Hill / Emax dose–response.
 * Effect E(C) = E0 + (Emax − E0) · C^n / (EC50^n + C^n).
 * Ref: Hill AV, J Physiol 1910; Goutelle et al., Fundam Clin Pharmacol 2008;22:633.
 */
export function hill(conc: number, emax: number, ec50: number, n: number, e0 = 0): number {
  if (conc <= 0) return e0;
  const cn = Math.pow(conc, n);
  return e0 + (emax - e0) * cn / (Math.pow(ec50, n) + cn);
}

/** pChEMBL / pIC50 = −log10(potency in M) = 9 − log10(potency in nM). */
export function nMtoP(nM: number): number {
  return 9 - Math.log10(nM);
}
export function pTonM(p: number): number {
  return Math.pow(10, 9 - p);
}

/**
 * Cheng–Prusoff: convert IC50 to Ki for a competitive inhibitor.
 * Ki = IC50 / (1 + [S]/Km).  Ref: Cheng & Prusoff, Biochem Pharmacol 1973;22:3099.
 */
export function chengPrusoff(ic50: number, substrate: number, km: number): number {
  return ic50 / (1 + substrate / km);
}

/** First-order elimination rate from half-life. */
export function keFromHalfLife(halfLifeH: number): number {
  return Math.LN2 / halfLifeH;
}

/**
 * One-compartment, IV-bolus, multiple-dose concentration at time t (hours).
 * Superposition of single-dose decays: C(t) = (Dose/Vd) · Σ e^(−ke·(t − i·τ)) for t ≥ i·τ.
 * Ref: Gibaldi & Perrier, Pharmacokinetics, 2nd ed.
 */
export function multiDoseConc(t: number, dose: number, vd: number, ke: number, tau: number, nDoses: number): number {
  const c0 = dose / vd;
  let c = 0;
  for (let i = 0; i < nDoses; i++) {
    const ti = i * tau;
    if (t >= ti) c += c0 * Math.exp(-ke * (t - ti));
  }
  return c;
}

/** Steady-state accumulation ratio R = 1 / (1 − e^(−ke·τ)). */
export function accumulationRatio(ke: number, tau: number): number {
  return 1 / (1 - Math.exp(-ke * tau));
}

/** Single-dose AUC0→∞ = Dose / (Vd · ke) = Dose / clearance. */
export function aucSingle(dose: number, vd: number, ke: number): number {
  return dose / (vd * ke);
}

/**
 * FDA human-equivalent dose by body-surface-area scaling.
 * HED (mg/kg) = animal dose (mg/kg) × (Km_animal / Km_human), Km_human = 37.
 * Ref: FDA Guidance (2005), Estimating the Maximum Safe Starting Dose; Km from Table 1.
 */
export const KM_FACTORS: Record<string, number> = {
  Mouse: 3, Hamster: 5, Rat: 6, 'Guinea pig': 8, Rabbit: 12, Dog: 20, Monkey: 12, Human: 37,
};
export function humanEquivalentDose(animalMgPerKg: number, species: string): number {
  const km = KM_FACTORS[species] ?? 37;
  return animalMgPerKg * (km / KM_FACTORS['Human']);
}
