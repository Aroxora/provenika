import { Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LinePlot, Series, Marker } from './line-plot';
import {
  hill, nMtoP, pTonM, chengPrusoff, keFromHalfLife, multiDoseConc,
  accumulationRatio, aucSingle, Pt,
} from '../../core/math-models';

function geometric(min: number, max: number, n: number): number[] {
  const lo = Math.log10(min), hi = Math.log10(max);
  return Array.from({ length: n }, (_, i) => Math.pow(10, lo + (hi - lo) * (i / (n - 1))));
}
function linspace(min: number, max: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => min + (max - min) * (i / (n - 1)));
}

@Component({
  selector: 'app-math',
  imports: [DecimalPipe, LinePlot],
  template: `
    <h2>Interactive models <span class="muted">— quantitative pharmacology you can play with</span></h2>
    <p class="muted intro">
      Standard, citable models for drug discovery and disease. All compute in your browser;
      formulas are documented in <code class="mono">core/math-models.ts</code>.
      Educational — not clinical dosing guidance.
    </p>

    <!-- 1. Dose–response -->
    <div class="card">
      <h3>Dose–response (Hill / E<sub>max</sub>)</h3>
      <p class="muted sub">E(C) = E<sub>max</sub>·Cⁿ / (EC₅₀ⁿ + Cⁿ). Hill AV 1910; Goutelle 2008.</p>
      <div class="grid">
        <div class="inputs">
          <label>E<sub>max</sub> (%) <input type="range" min="10" max="100" step="5" [value]="emax()" (input)="emax.set(+$any($event.target).value)" /> <b class="mono">{{ emax() }}</b></label>
          <label>EC₅₀ (nM) <input type="number" min="0.1" step="1" [value]="ec50()" (input)="ec50.set(+$any($event.target).value)" /></label>
          <label>Hill n <input type="range" min="0.5" max="4" step="0.1" [value]="hillN()" (input)="hillN.set(+$any($event.target).value)" /> <b class="mono">{{ hillN() | number:'1.1-1' }}</b></label>
          <div class="readout">At EC₅₀ effect = <b class="mono">{{ emax()/2 | number:'1.0-1' }}%</b>. Steepness rises with n.</div>
        </div>
        <app-line-plot [series]="drSeries()" [markers]="drMarkers()" [logX]="true"
          [xmin]="ec50()/1000" [xmax]="ec50()*1000" [ymin]="0" [ymax]="emax()"
          xLabel="concentration (nM, log)" yLabel="effect (%)" />
      </div>
    </div>

    <!-- 2. Potency converter -->
    <div class="card">
      <h3>Potency converter</h3>
      <p class="muted sub">pChEMBL = 9 − log₁₀(IC₅₀ nM). Cheng–Prusoff (1973): K<sub>i</sub> = IC₅₀ / (1 + [S]/K<sub>m</sub>).</p>
      <div class="conv">
        <label>IC₅₀ (nM) <input type="number" min="0.001" step="1" [value]="ic50()" (input)="setIc50(+$any($event.target).value)" /></label>
        <span class="eq">⇄</span>
        <label>pChEMBL / pIC₅₀ <input type="number" min="3" max="12" step="0.1" [value]="pchembl() | number:'1.2-2'" (input)="setP(+$any($event.target).value)" /></label>
        <div class="cp">
          <label>[S] <input type="number" min="0" [value]="subs()" (input)="subs.set(+$any($event.target).value)" /></label>
          <label>K<sub>m</sub> <input type="number" min="0.01" [value]="km()" (input)="km.set(+$any($event.target).value)" /></label>
          <div class="readout">K<sub>i</sub> ≈ <b class="mono">{{ ki() | number:'1.2-2' }} nM</b></div>
        </div>
      </div>
    </div>

    <!-- 3. One-compartment PK -->
    <div class="card">
      <h3>Pharmacokinetics (one-compartment, multiple dose)</h3>
      <p class="muted sub">C(t) = (Dose/V<sub>d</sub>)·Σe^(−k<sub>e</sub>(t−iτ)); k<sub>e</sub> = ln2/t½. Gibaldi &amp; Perrier.</p>
      <div class="grid">
        <div class="inputs">
          <label>Dose (mg) <input type="number" min="1" [value]="dose()" (input)="dose.set(+$any($event.target).value)" /></label>
          <label>V<sub>d</sub> (L) <input type="number" min="1" [value]="vd()" (input)="vd.set(+$any($event.target).value)" /></label>
          <label>Half-life (h) <input type="number" min="0.1" step="0.5" [value]="thalf()" (input)="thalf.set(+$any($event.target).value)" /></label>
          <label>Interval τ (h) <input type="number" min="1" [value]="tau()" (input)="tau.set(+$any($event.target).value)" /></label>
          <label>Doses <input type="number" min="1" max="20" [value]="nDoses()" (input)="nDoses.set(+$any($event.target).value)" /></label>
          <div class="readout">
            C<sub>max,ss</sub> ≈ <b class="mono">{{ cmaxSs() | number:'1.2-2' }}</b> · trough ≈ <b class="mono">{{ troughSs() | number:'1.2-2' }}</b> mg/L<br />
            accumulation R ≈ <b class="mono">{{ accum() | number:'1.2-2' }}×</b> · AUC₀→∞(1 dose) ≈ <b class="mono">{{ auc() | number:'1.0-1' }}</b> mg·h/L
          </div>
        </div>
        <app-line-plot [series]="pkSeries()" [logX]="false"
          [xmin]="0" [xmax]="tau()*(nDoses())+tau()*2" [ymin]="0" [ymax]="cmaxSs()*1.15"
          xLabel="time (h)" yLabel="concentration (mg/L)" />
      </div>
    </div>

    <p class="disclaimer">Educational models from public literature. Not clinical dosing advice; real PK/PD requires patient data and validated models.</p>
  `,
  styles: [`
    .intro { max-width: 66ch; }
    .sub { font-size: 0.8rem; margin: 0 0 0.7rem; }
    .grid { display: grid; grid-template-columns: 260px 1fr; gap: 1rem; align-items: start; }
    @media (max-width: 740px) { .grid { grid-template-columns: 1fr; } }
    .inputs { display: flex; flex-direction: column; gap: 0.6rem; }
    .inputs label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; color: var(--text-dim); }
    .inputs input[type=number] { width: 110px; }
    .readout { font-size: 0.85rem; color: var(--text); margin-top: 0.3rem; line-height: 1.5; }
    .conv { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .conv label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; color: var(--text-dim); }
    .conv input { width: 130px; }
    .eq { font-size: 1.4rem; color: var(--accent); }
    .cp { display: flex; align-items: flex-end; gap: 0.8rem; padding-left: 1rem; border-left: 1px solid var(--border); flex-wrap: wrap; }
    .cp input { width: 90px; }
    h3 sub, p sub, .readout sub, label sub { font-size: 0.75em; }
  `],
})
export class MathPage {
  // 1. Dose-response
  readonly emax = signal(100);
  readonly ec50 = signal(50);
  readonly hillN = signal(1);
  readonly drSeries = computed<Series[]>(() => {
    const e = this.emax(), c = this.ec50(), n = this.hillN();
    const pts: Pt[] = geometric(c / 1000, c * 1000, 80).map((x) => ({ x, y: hill(x, e, c, n) }));
    return [{ color: '#3ddc97', pts }];
  });
  readonly drMarkers = computed<Marker[]>(() => [{ x: this.ec50(), y: this.emax() / 2, label: 'EC₅₀' }]);

  // 2. Potency converter
  readonly ic50 = signal(10);
  readonly pchembl = computed(() => nMtoP(this.ic50()));
  setIc50(v: number) { if (v > 0) this.ic50.set(v); }
  setP(p: number) { this.ic50.set(pTonM(p)); }
  readonly subs = signal(10);
  readonly km = signal(20);
  readonly ki = computed(() => chengPrusoff(this.ic50(), this.subs(), this.km()));

  // 3. PK
  readonly dose = signal(100);
  readonly vd = signal(50);
  readonly thalf = signal(6);
  readonly tau = signal(12);
  readonly nDoses = signal(6);
  private ke = computed(() => keFromHalfLife(this.thalf()));
  readonly pkSeries = computed<Series[]>(() => {
    const tEnd = this.tau() * this.nDoses() + this.tau() * 2;
    const pts: Pt[] = linspace(0, tEnd, 200).map((t) => ({
      x: t, y: multiDoseConc(t, this.dose(), this.vd(), this.ke(), this.tau(), this.nDoses()),
    }));
    return [{ color: '#4aa8ff', pts }];
  });
  readonly cmaxSs = computed(() => (this.dose() / this.vd()) * accumulationRatio(this.ke(), this.tau()));
  readonly troughSs = computed(() => this.cmaxSs() * Math.exp(-this.ke() * this.tau()));
  readonly accum = computed(() => accumulationRatio(this.ke(), this.tau()));
  readonly auc = computed(() => aucSingle(this.dose(), this.vd(), this.ke()));
}
