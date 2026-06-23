import { describe, it, expect } from 'vitest';
import {
  hill, nMtoP, pTonM, chengPrusoff, keFromHalfLife, multiDoseConc,
  accumulationRatio, aucSingle, humanEquivalentDose, KM_FACTORS,
  tumorVolume, doublingTime, survivalExp, hazardRatioExp,
  michaelisMenten, combinationIndex, synergyVerdict, hillFraction, blissExpected,
} from './math-models';

// Known-value checks pinning every quantitative-pharmacology formula to its cited
// reference. These are the highest-stakes numbers in the app (shown to researchers),
// so a regression here must fail CI rather than silently ship a wrong figure.
const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('math-models', () => {
  it('hill: e0 at conc 0, half-max at EC50, Emax asymptote, e0 offset', () => {
    close(hill(0, 100, 10, 1), 0);              // conc 0 -> e0 (default 0)
    close(hill(10, 100, 10, 1), 50);            // C = EC50 -> Emax/2
    expect(hill(1e9, 100, 10, 2)).toBeCloseTo(100, 5);
    close(hill(10, 100, 10, 1, 20), 60);        // e0=20 -> 20 + (100-20)*0.5
  });

  it('potency: 1 nM = pIC50 9; nM<->p are inverse', () => {
    close(nMtoP(1), 9);
    close(nMtoP(10), 8);
    close(pTonM(9), 1);
    close(pTonM(nMtoP(42)), 42);
  });

  it('cheng-prusoff: Ki = IC50/2 when [S] = Km; = IC50 when [S] = 0', () => {
    close(chengPrusoff(100, 5, 5), 50);
    close(chengPrusoff(100, 0, 5), 100);
  });

  it('ke = ln2/t-half; AUC = dose/(Vd*ke)', () => {
    close(keFromHalfLife(1), Math.LN2);
    close(aucSingle(100, 10, 0.1), 100);
  });

  it('accumulation ratio R = 1/(1-e^-ke*tau) = 2 when tau = half-life', () => {
    close(accumulationRatio(Math.LN2, 1), 2);
  });

  it('multi-dose superposition: a single dose at t=0 is dose/Vd', () => {
    close(multiDoseConc(0, 100, 10, 0.1, 12, 1), 10);
  });

  it('FDA HED: Km table (Mouse 3, Rat 6, Dog 20, Monkey 12, Human 37); HED = animal*Km_a/37', () => {
    expect(KM_FACTORS['Mouse']).toBe(3);
    expect(KM_FACTORS['Rat']).toBe(6);
    expect(KM_FACTORS['Dog']).toBe(20);
    expect(KM_FACTORS['Monkey']).toBe(12);
    expect(KM_FACTORS['Human']).toBe(37);
    close(humanEquivalentDose(37, 'Mouse'), 3);   // 37 * 3/37 = 3
    close(humanEquivalentDose(37, 'Rat'), 6);     // 37 * 6/37 = 6
  });

  it('tumor growth: V0 at t=0 for all models; K asymptote for logistic/gompertz', () => {
    close(tumorVolume('exponential', 0, 100, 0.1, 1000), 100);
    close(tumorVolume('logistic', 0, 100, 0.1, 1000), 100);
    close(tumorVolume('gompertz', 0, 100, 0.1, 1000), 100);
    expect(tumorVolume('logistic', 1e6, 100, 0.1, 1000)).toBeCloseTo(1000, 3);
    expect(tumorVolume('gompertz', 1e6, 100, 0.1, 1000)).toBeCloseTo(1000, 3);
    close(doublingTime(Math.LN2), 1);
  });

  it('exponential survival: S(median)=0.5, S(0)=1; HR = median_ref/median_test', () => {
    close(survivalExp(10, 10), 0.5);
    close(survivalExp(0, 10), 1);
    close(hazardRatioExp(20, 10), 2);
  });

  it('michaelis-menten: v = Vmax/2 at [S] = Km', () => {
    close(michaelisMenten(5, 100, 5), 50);
  });

  it('Loewe CI and synergy bands', () => {
    close(combinationIndex(0.5, 0.5, 1, 1), 1);
    expect(synergyVerdict(0.5)).toBe('synergy');
    expect(synergyVerdict(1)).toBe('additive');
    expect(synergyVerdict(2)).toBe('antagonism');
  });

  it('hill fraction (Emax=1) and Bliss independence', () => {
    close(hillFraction(10, 10, 1), 0.5);
    close(hillFraction(0, 10), 0);
    close(blissExpected(0.5, 0.5), 0.75);
    close(blissExpected(0, 0.4), 0.4);
  });
});
