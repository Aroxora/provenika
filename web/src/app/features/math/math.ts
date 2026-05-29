import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LinePlot, Series, Marker } from './line-plot';
import { TargetStore } from '../../core/target-store';
import {
  hill, nMtoP, pTonM, chengPrusoff, keFromHalfLife, multiDoseConc,
  accumulationRatio, aucSingle, Pt,
  tumorVolume, doublingTime, survivalExp, hazardRatioExp, GrowthModel, michaelisMenten,
  combinationIndex, synergyVerdict, hillFraction, blissExpected,
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

    @if (focus(); as f) {
      <div class="card prefill">
        Prefilled potency from triage hit <strong class="mono">{{ f.id }}</strong>
        (pChEMBL {{ f.pchembl | number:'1.1-1' }} → IC₅₀ {{ focusNm() | number:'1.2-2' }} nM).
        Adjust below to explore.
      </div>
    }

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

    <!-- 4. Tumor growth -->
    <div class="card">
      <h3>Tumor growth</h3>
      <p class="muted sub">Exponential / logistic / Gompertz (Laird 1964; Norton 1988). V₀,K in mm³, r in /day.</p>
      <div class="grid">
        <div class="inputs">
          <label>Model
            <select [value]="growth()" (change)="growth.set($any($event.target).value)">
              <option value="gompertz">Gompertz</option>
              <option value="logistic">Logistic</option>
              <option value="exponential">Exponential</option>
            </select>
          </label>
          <label>V₀ (mm³) <input type="number" min="1" [value]="v0()" (input)="v0.set(+$any($event.target).value)" /></label>
          <label>Growth rate r (/day) <input type="number" min="0.001" step="0.01" [value]="rate()" (input)="rate.set(+$any($event.target).value)" /></label>
          <label>Carrying capacity K (mm³) <input type="number" min="100" [value]="kcap()" (input)="kcap.set(+$any($event.target).value)" /></label>
          <div class="readout">Exponential-phase doubling time ≈ <b class="mono">{{ doubling() | number:'1.1-1' }} days</b>.</div>
        </div>
        <app-line-plot [series]="growthSeries()" [logX]="false"
          [xmin]="0" [xmax]="growthDays" [ymin]="0" [ymax]="kcap()*1.05"
          xLabel="time (days)" yLabel="volume (mm³)" />
      </div>
    </div>

    <!-- 5. Survival -->
    <div class="card">
      <h3>Parametric survival comparator</h3>
      <p class="muted sub">Exponential S(t)=0.5^(t/median); hazard ratio = median<sub>ctrl</sub>/median<sub>exp</sub>. Educational — true trials use Kaplan–Meier on event data.</p>
      <div class="grid">
        <div class="inputs">
          <label>Control median OS (months) <input type="number" min="1" [value]="medCtrl()" (input)="medCtrl.set(+$any($event.target).value)" /></label>
          <label>Experimental median OS (months) <input type="number" min="1" [value]="medExp()" (input)="medExp.set(+$any($event.target).value)" /></label>
          <div class="readout">
            Hazard ratio ≈ <b class="mono">{{ hr() | number:'1.2-2' }}</b>
            ({{ hr() < 1 ? 'experimental favored' : hr() > 1 ? 'control favored' : 'no difference' }}).<br />
            <span class="muted">Median gain {{ medExp() - medCtrl() | number:'1.0-1' }} mo.</span>
          </div>
        </div>
        <app-line-plot [series]="survSeries()" [logX]="false"
          [xmin]="0" [xmax]="survMonths" [ymin]="0" [ymax]="1"
          xLabel="time (months)" yLabel="surviving fraction" />
      </div>
    </div>

    <!-- 6. Michaelis–Menten -->
    <div class="card">
      <h3>Enzyme kinetics (Michaelis–Menten)</h3>
      <p class="muted sub">v = V<sub>max</sub>·[S] / (K<sub>m</sub> + [S]); v = V<sub>max</sub>/2 at [S]=K<sub>m</sub>. Michaelis &amp; Menten 1913.</p>
      <div class="grid">
        <div class="inputs">
          <label>V<sub>max</sub> <input type="number" min="1" [value]="vmax()" (input)="vmax.set(+$any($event.target).value)" /></label>
          <label>K<sub>m</sub> <input type="number" min="0.1" step="0.5" [value]="kmMM()" (input)="kmMM.set(+$any($event.target).value)" /></label>
          <div class="readout">At [S]=K<sub>m</sub>, v = <b class="mono">{{ vmax()/2 | number:'1.0-1' }}</b> (½ V<sub>max</sub>).</div>
        </div>
        <app-line-plot [series]="mmSeries()" [markers]="mmMarkers()" [logX]="false"
          [xmin]="0" [xmax]="kmMM()*8" [ymin]="0" [ymax]="vmax()*1.05"
          xLabel="[substrate]" yLabel="reaction rate v" />
      </div>
    </div>

    <!-- 7. Drug synergy -->
    <div class="card">
      <h3>Drug combination synergy</h3>
      <p class="muted sub">Loewe isobologram + combination index CI = d<sub>A</sub>/Dx<sub>A</sub> + d<sub>B</sub>/Dx<sub>B</sub> (Chou–Talalay 2006); Bliss independence (1939).</p>
      <div class="grid">
        <div class="inputs">
          <label>IC₅₀ drug A <input type="number" min="0.1" step="0.5" [value]="ic50A()" (input)="ic50A.set(+$any($event.target).value)" /></label>
          <label>IC₅₀ drug B <input type="number" min="0.1" step="0.5" [value]="ic50B()" (input)="ic50B.set(+$any($event.target).value)" /></label>
          <label>Combination dose A <input type="number" min="0" step="0.5" [value]="dA()" (input)="dA.set(+$any($event.target).value)" /></label>
          <label>Combination dose B <input type="number" min="0" step="0.5" [value]="dB()" (input)="dB.set(+$any($event.target).value)" /></label>
          <div class="readout">
            CI ≈ <b class="mono" [style.color]="ciColor()">{{ ci() | number:'1.2-2' }}</b> → <b>{{ verdict() }}</b><br />
            <span class="muted">Bliss-expected combined inhibition ≈ {{ bliss()*100 | number:'1.0-0' }}%.</span>
          </div>
        </div>
        <app-line-plot [series]="isoSeries()" [markers]="isoMarkers()" [logX]="false"
          [xmin]="0" [xmax]="ic50A()*1.3" [ymin]="0" [ymax]="ic50B()*1.3"
          xLabel="dose A" yLabel="dose B" />
      </div>
      <p class="muted cap">The line is dose additivity; a point <em>below</em> it (CI&lt;1) indicates synergy, on it = additive, above = antagonism.</p>
    </div>

    <p class="disclaimer">Educational models from public literature. Not clinical dosing/prognosis advice; real PK/PD, tumor dynamics, and survival require patient data and validated models.</p>
  `,
  styles: [`
    .intro { max-width: 66ch; }
    .prefill { border-left: 3px solid var(--accent); font-size: 0.88rem; }
    .prefill strong { color: var(--accent); }
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
  private store = inject(TargetStore);
  // Cross-link: a ligand selected in triage prefills the potency-based models.
  readonly focus = this.store.focusLigand;
  readonly focusNm = computed(() => { const f = this.focus(); return f ? pTonM(f.pchembl) : 0; });

  constructor() {
    effect(() => {
      const f = this.focus();
      if (f) {
        const nm = pTonM(f.pchembl);
        this.ec50.set(Math.round(nm * 100) / 100);
        this.ic50.set(Math.round(nm * 100) / 100);
      }
    });
  }

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

  // 4. Tumor growth
  readonly growthDays = 180;
  readonly growth = signal<GrowthModel>('gompertz');
  readonly v0 = signal(100);
  readonly rate = signal(0.05);
  readonly kcap = signal(100000);
  readonly doubling = computed(() => doublingTime(this.rate()));
  readonly growthSeries = computed<Series[]>(() => {
    const m = this.growth(), v = this.v0(), r = this.rate(), k = this.kcap();
    const pts: Pt[] = linspace(0, this.growthDays, 120).map((t) => ({ x: t, y: tumorVolume(m, t, v, r, k) }));
    return [{ color: '#ff6b6b', pts }];
  });

  // 5. Survival
  readonly survMonths = 60;
  readonly medCtrl = signal(12);
  readonly medExp = signal(20);
  readonly hr = computed(() => hazardRatioExp(this.medCtrl(), this.medExp()));
  readonly survSeries = computed<Series[]>(() => {
    const ts = linspace(0, this.survMonths, 120);
    return [
      { color: '#8b9bb0', pts: ts.map((t) => ({ x: t, y: survivalExp(t, this.medCtrl()) })) },
      { color: '#3ddc97', pts: ts.map((t) => ({ x: t, y: survivalExp(t, this.medExp()) })) },
    ];
  });

  // 6. Michaelis–Menten
  readonly vmax = signal(100);
  readonly kmMM = signal(10);
  readonly mmSeries = computed<Series[]>(() => {
    const vm = this.vmax(), km = this.kmMM();
    const pts: Pt[] = linspace(0, km * 8, 120).map((s) => ({ x: s, y: michaelisMenten(s, vm, km) }));
    return [{ color: '#ffb454', pts }];
  });
  readonly mmMarkers = computed<Marker[]>(() => [{ x: this.kmMM(), y: this.vmax() / 2, label: 'Kₘ' }]);

  // 7. Drug synergy
  readonly ic50A = signal(10);
  readonly ic50B = signal(8);
  readonly dA = signal(4);
  readonly dB = signal(2);
  readonly ci = computed(() => combinationIndex(this.dA(), this.dB(), this.ic50A(), this.ic50B()));
  readonly verdict = computed(() => synergyVerdict(this.ci()));
  readonly ciColor = computed(() => this.ci() < 0.9 ? 'var(--accent)' : this.ci() <= 1.1 ? 'var(--warn)' : 'var(--danger)');
  readonly bliss = computed(() =>
    blissExpected(hillFraction(this.dA(), this.ic50A()), hillFraction(this.dB(), this.ic50B())));
  readonly isoSeries = computed<Series[]>(() => [
    { color: '#8b9bb0', pts: [{ x: this.ic50A(), y: 0 }, { x: 0, y: this.ic50B() }] }, // additivity line
  ]);
  readonly isoMarkers = computed<Marker[]>(() => [{ x: this.dA(), y: this.dB(), label: `CI ${this.ci().toFixed(2)}` }]);
}
