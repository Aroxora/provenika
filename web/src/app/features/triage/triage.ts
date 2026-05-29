import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TriageService } from '../../core/triage.service';
import { TargetStore } from '../../core/target-store';
import { TriageHit } from '../../core/models';

@Component({
  selector: 'app-triage',
  imports: [DecimalPipe],
  template: `
    <h2>② Ligand triage <span class="muted">— rank real ChEMBL ligands</span></h2>
    <p class="muted intro">
      Resolves the target, pulls its most potent measured ligands (IC50/Ki/Kd → pChEMBL),
      joins drug-likeness (Lipinski Ro5, QED) and ranks them. Port of
      <code class="mono">cad/virtual_triage.py</code>.
    </p>

    <div class="controls card">
      <label>min pChEMBL
        <input type="number" step="0.5" min="4" max="11" [value]="minPchembl()"
               (input)="minPchembl.set(+$any($event.target).value)" />
      </label>
      <label>limit
        <input type="number" min="5" max="100" [value]="limit()"
               (input)="limit.set(+$any($event.target).value)" />
      </label>
      <label class="check">
        <input type="checkbox" [checked]="excludeApproved()"
               (change)="excludeApproved.set($any($event.target).checked)" />
        novel only (exclude approved)
      </label>
      <button class="primary" (click)="rerun()" [disabled]="loading()">Run triage</button>
      <button (click)="downloadCsv()" [disabled]="!hits().length">Export CSV</button>
    </div>

    @if (loading()) {
      <div class="card"><span class="spinner"></span> Scanning ChEMBL bioactivities for <strong>{{ target() }}</strong>…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (hits().length) {
      <div class="card meta">
        <strong>{{ targetName() }}</strong> · {{ hits().length }} candidates ranked by potency + drug-likeness
        <span class="muted">— scores rank hypotheses, not efficacy.</span>
      </div>
      <div class="card tablewrap">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('score')">Score {{ arrow('score') }}</th>
              <th (click)="sortBy('chembl_id')">ChEMBL ID</th>
              <th (click)="sortBy('best_pchembl')">pChEMBL {{ arrow('best_pchembl') }}</th>
              <th (click)="sortBy('qed')">QED {{ arrow('qed') }}</th>
              <th (click)="sortBy('ro5_violations')">Ro5 {{ arrow('ro5_violations') }}</th>
              <th (click)="sortBy('drug_likeness')">Drug-likeness {{ arrow('drug_likeness') }}</th>
              <th>Phase</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            @for (h of sorted(); track h.chembl_id) {
              <tr>
                <td><span class="score" [style.--w.%]="h.score * 100">{{ h.score | number:'1.3-3' }}</span></td>
                <td><a [href]="h.chembl_url" target="_blank" rel="noopener" class="mono">{{ h.chembl_id }}</a></td>
                <td class="mono">{{ h.best_pchembl | number:'1.2-2' }}</td>
                <td class="mono">{{ h.qed | number:'1.2-2' }}</td>
                <td class="mono" [class.warn-text]="(h.ro5_violations ?? 0) > 0">{{ h.ro5_violations ?? '–' }}</td>
                <td class="mono">{{ h.drug_likeness | number:'1.2-2' }}</td>
                <td><span class="pill" [class.green]="h.dev_phase === 'approved drug'">{{ h.dev_phase }}</span></td>
                <td>{{ h.name === h.chembl_id ? '—' : h.name }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="muted foot">
        pChEMBL = −log₁₀(molar potency): 6≈1µM, 8≈10nM, 9≈1nM. Drug-likeness blends QED with
        Lipinski Ro5. Export feeds docking/ADMET follow-up. ⚠️ Triage only — needs validation.
      </p>
    } @else {
      <div class="card muted">No candidates yet — adjust thresholds and run triage.</div>
    }
  `,
  styles: [`
    .intro { max-width: 64ch; }
    .controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.9rem; }
    .controls label { font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem; }
    .controls input[type=number] { width: 80px; }
    .check { gap: 0.35rem !important; }
    .meta { margin-bottom: 0.6rem; }
    .tablewrap { overflow-x: auto; padding: 0.4rem 0.6rem; }
    .score { position: relative; display: inline-block; padding: 0.1rem 0.45rem; border-radius: 6px;
      background: linear-gradient(90deg, #1f5e4455 var(--w, 0%), transparent var(--w, 0%)); font-weight: 600; }
    .warn-text { color: var(--warn); }
    .foot { font-size: 0.78rem; margin-top: 0.6rem; }
  `],
})
export class Triage {
  private svc = inject(TriageService);
  private store = inject(TargetStore);
  readonly target = this.store.target;

  readonly minPchembl = signal(7);
  readonly limit = signal(30);
  readonly excludeApproved = signal(false);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly hits = signal<TriageHit[]>([]);
  readonly targetName = signal('');

  readonly sortKey = signal<keyof TriageHit>('score');
  readonly sortDir = signal<1 | -1>(-1);

  readonly sorted = computed(() => {
    const k = this.sortKey();
    const dir = this.sortDir();
    return [...this.hits()].sort((a, b) => {
      const av = (a[k] ?? 0) as number;
      const bv = (b[k] ?? 0) as number;
      return av > bv ? dir : av < bv ? -dir : 0;
    });
  });

  constructor() {
    effect(() => {
      this.store.target(); // react to target change
      this.rerun();
    });
  }

  async rerun() {
    const name = this.store.target();
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.svc.run({
        target: name,
        minPchembl: this.minPchembl(),
        limit: this.limit(),
        excludeApproved: this.excludeApproved(),
      });
      this.targetName.set(res.targetName);
      this.hits.set(res.hits);
    } catch (e: any) {
      this.hits.set([]);
      this.error.set(e?.message ?? 'Triage failed.');
    } finally {
      this.loading.set(false);
    }
  }

  sortBy(k: keyof TriageHit) {
    if (this.sortKey() === k) this.sortDir.set(this.sortDir() === 1 ? -1 : 1);
    else { this.sortKey.set(k); this.sortDir.set(-1); }
  }
  arrow(k: keyof TriageHit) {
    return this.sortKey() === k ? (this.sortDir() === 1 ? '▲' : '▼') : '';
  }

  downloadCsv() {
    const csv = this.svc.toCsv(this.sorted());
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.target().replace(/\s+/g, '_')}_triage.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
