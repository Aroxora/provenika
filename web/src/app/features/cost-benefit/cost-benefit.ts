import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CostBenefitService, MODALITY_MULT } from '../../core/cost-benefit.service';

@Component({
  selector: 'app-cost-benefit',
  imports: [DecimalPipe, RouterLink],
  template: `
    <h2>4 · Cost-benefit <span class="muted">— program feasibility / go-no-go</span></h2>
    <p class="muted intro">
      Risk-adjusted feasibility from public benchmarks (BIO/Informa CDSR, DiMasi, Wong et al.).
      Port of <code class="mono">cad/cost_benefit.py</code>. Rough planning heuristic — not a valuation.
    </p>

    <div class="layout">
      <div class="card form">
        <label>Modality
          <select [value]="modality()" (change)="modality.set($any($event.target).value)">
            @for (m of modalities; track m) { <option [value]="m">{{ label(m) }}</option> }
          </select>
        </label>
        <label>Current phase
          <select [value]="phase()" (change)="phase.set($any($event.target).value)">
            @for (p of phases; track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </label>
        <label>Addressable patients / yr
          <input type="number" [value]="incidence()" (input)="incidence.set(+$any($event.target).value)" />
        </label>
        <label>Annual price (USD)
          <input type="number" [value]="price()" (input)="price.set(+$any($event.target).value)" />
        </label>
        <label>Peak penetration
          <input type="number" step="0.05" min="0.01" max="1" [value]="penetration()"
                 (input)="penetration.set(+$any($event.target).value)" />
        </label>
        <label class="check">
          <input type="checkbox" [checked]="oncology()" (change)="oncology.set($any($event.target).checked)" />
          apply lower oncology success factor
        </label>
      </div>

      <div class="card result">
        @if (result(); as r) {
          <div class="metrics">
            <div class="metric"><div class="big mono">{{ r.probabilityOfApproval * 100 | number:'1.1-1' }}%</div><div class="muted">P(approval) from {{ r.phase }}</div></div>
            <div class="metric"><div class="big mono">\${{ r.expectedCostMusd | number:'1.0-0' }}M</div><div class="muted">expected remaining cost</div></div>
            <div class="metric"><div class="big mono">{{ r.expectedTimeYears }} yr</div><div class="muted">to market</div></div>
            <div class="metric"><div class="big mono">\${{ r.riskAdjustedRevenueMusd | number:'1.0-0' }}M</div><div class="muted">risk-adjusted revenue</div></div>
          </div>
          <div class="bcr" [class.good]="r.benefitCostRatio >= 1.5" [class.bad]="r.benefitCostRatio < 0.8">
            Benefit/cost ratio <strong>{{ r.benefitCostRatio | number:'1.2-2' }}</strong>
          </div>
          <div class="verdict">{{ r.verdict }}</div>
          <div class="muted small">
            Peak revenue \${{ r.peakRevenueMusd | number:'1.0-0' }}M = {{ incidence() | number }} pts ×
            \${{ price() | number }} × {{ penetration() * 100 | number:'1.0-0' }}%.
          </div>
        }
      </div>
    </div>
    <p class="disclaimer">Order-of-magnitude planning figures only. Not financial advice, not a valuation, not a clinical claim.</p>
    <div class="next"><a routerLink="/report"><button class="primary">Next: assemble report →</button></a></div>
  `,
  styles: [`
    .intro { max-width: 64ch; }
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 0.9rem; }
    @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
    .form { display: flex; flex-direction: column; gap: 0.7rem; }
    .form label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.82rem; color: var(--text-dim); }
    .form .check { flex-direction: row; align-items: center; gap: 0.4rem; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1rem; }
    .big { font-size: 1.7rem; font-weight: 700; color: var(--accent-2); }
    .bcr { font-size: 1.1rem; padding: 0.5rem 0.8rem; border-radius: 8px; background: var(--bg-elev-2);
      border: 1px solid var(--border); display: inline-block; }
    .bcr strong { color: var(--warn); }
    .bcr.good strong { color: var(--accent); }
    .bcr.bad strong { color: var(--danger); }
    .verdict { margin: 0.7rem 0; font-weight: 600; }
    .small { font-size: 0.82rem; }
  `],
})
export class CostBenefitPage {
  private svc = inject(CostBenefitService);
  readonly modalities = Object.keys(MODALITY_MULT);
  readonly phases = ['preclinical', 'phase1', 'phase2', 'phase3', 'filed'];

  readonly modality = signal('small_molecule');
  readonly phase = signal('phase1');
  readonly incidence = signal(60000);
  readonly price = signal(150000);
  readonly penetration = signal(0.2);
  readonly oncology = signal(true);

  readonly result = computed(() =>
    this.svc.analyze({
      modality: this.modality(), phase: this.phase(),
      incidence: this.incidence(), price: this.price(),
      penetration: this.penetration(), oncology: this.oncology(),
    }),
  );

  label(m: string): string {
    return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
