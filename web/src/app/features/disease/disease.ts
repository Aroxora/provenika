import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { OpenTargetsService, DiseaseTargets } from '../../core/opentargets.service';
import { TargetStore } from '../../core/target-store';

@Component({
  selector: 'app-disease',
  imports: [DecimalPipe],
  template: `
    <h2>Disease → targets <span class="muted">— start from any disease</span></h2>
    <p class="muted intro">
      Enter a disease; Open Targets returns its highest-association-scored druggable targets
      (genetics, expression, pathways, known drugs, literature). Pick one to drive the whole
      pipeline. Works for cancer and beyond.
    </p>

    <form class="bar" (submit)="search(); $event.preventDefault()">
      <input [value]="query()" (input)="query.set($any($event.target).value)"
             placeholder="e.g. lung cancer, type 2 diabetes, Alzheimer disease" aria-label="Disease" />
      <button class="primary" type="submit" [disabled]="loading()">Find targets</button>
    </form>
    <div class="examples">
      <span class="muted">Try:</span>
      @for (d of examples; track d) { <button class="chip" (click)="query.set(d); search()">{{ d }}</button> }
    </div>

    <div role="status" aria-live="polite">
    @if (loading()) {
      <div class="card"><span class="spinner"></span> Querying Open Targets…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (result(); as r) {
      <div class="card meta">
        <strong>{{ r.disease.name }}</strong> <span class="pill mono">{{ r.disease.id }}</span>
        · {{ r.count | number }} associated targets — top {{ r.targets.length }} shown
      </div>
      <div class="card tablewrap">
        <table>
          <thead><tr><th>Target</th><th>Association</th><th>Name</th><th></th></tr></thead>
          <tbody>
            @for (t of r.targets; track t.symbol) {
              <tr>
                <td class="mono"><strong>{{ t.symbol }}</strong></td>
                <td><span class="score" [style.--w.%]="t.score * 100">{{ t.score | number:'1.2-2' }}</span></td>
                <td class="muted">{{ t.name }}</td>
                <td><button (click)="analyze(t.symbol)">Analyze →</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="muted foot">Association score (0–1) aggregates genetic, genomic, transcriptomic,
        drug, pathway &amp; literature evidence. Source: Open Targets Platform.</p>
    }
    </div>
  `,
  styles: [`
    .intro { max-width: 64ch; }
    .bar { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .bar input { flex: 1; min-width: 200px; }
    .examples { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; font-size: 0.85rem; }
    .chip { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
    .meta { margin-bottom: 0.6rem; }
    .tablewrap { overflow-x: auto; padding: 0.4rem 0.6rem; }
    .score { display: inline-block; padding: 0.1rem 0.45rem; border-radius: 6px; font-weight: 600;
      background: linear-gradient(90deg, #1f5e4455 var(--w, 0%), transparent var(--w, 0%)); }
    .foot { font-size: 0.78rem; margin-top: 0.6rem; }
  `],
})
export class Disease {
  private svc = inject(OpenTargetsService);
  private store = inject(TargetStore);
  private router = inject(Router);

  readonly query = signal('lung cancer');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<DiseaseTargets | null>(null);
  readonly examples = ['lung cancer', 'pancreatic cancer', 'melanoma', 'type 2 diabetes', 'Alzheimer disease'];

  constructor() {
    this.search();
  }

  async search() {
    const q = this.query().trim();
    if (!q) return;
    const stale = () => this.query().trim() !== q;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.svc.targetsForDisease(q, 25);
      if (stale()) return;
      if (!r) { this.error.set(`No disease found for "${q}".`); this.result.set(null); }
      else this.result.set(r);
    } catch (e: any) {
      if (stale()) return;
      this.error.set(e?.message ?? 'Open Targets query failed.');
      this.result.set(null);
    } finally {
      if (!stale()) this.loading.set(false);
    }
  }

  analyze(symbol: string) {
    this.store.set(symbol);
    this.router.navigate(['/dossier']);
  }
}
