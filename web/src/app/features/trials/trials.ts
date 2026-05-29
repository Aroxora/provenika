import { Component, effect, inject, signal } from '@angular/core';
import { TrialsService } from '../../core/trials.service';
import { TargetStore } from '../../core/target-store';
import { Trial } from '../../core/models';

@Component({
  selector: 'app-trials',
  template: `
    <h2>Clinical trials <span class="muted">— live from ClinicalTrials.gov</span></h2>
    <p class="muted intro">Recent interventional/observational studies mentioning <strong>{{ target() }}</strong>.</p>

    @if (loading()) {
      <div class="card"><span class="spinner"></span> Searching ClinicalTrials.gov…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (trials().length) {
      <div class="card tablewrap">
        <table>
          <thead><tr><th>NCT</th><th>Title</th><th>Phase</th><th>Status</th><th>Conditions</th></tr></thead>
          <tbody>
            @for (t of trials(); track t.nctId) {
              <tr>
                <td><a [href]="t.url" target="_blank" rel="noopener" class="mono">{{ t.nctId }}</a></td>
                <td>{{ t.title }}</td>
                <td><span class="pill">{{ t.phase }}</span></td>
                <td>{{ t.status }}</td>
                <td class="muted">{{ t.conditions }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="card muted">No trials found for this term.</div>
    }
  `,
  styles: [`.intro { max-width: 60ch; } .tablewrap { overflow-x: auto; }`],
})
export class Trials {
  private svc = inject(TrialsService);
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly trials = signal<Trial[]>([]);

  constructor() {
    effect(() => {
      this.store.target();
      this.fetch();
    });
  }

  private async fetch() {
    const t = this.store.target();
    const stale = () => this.store.target() !== t;
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await this.svc.search(t, 25);
      if (stale()) return;
      this.trials.set(r);
    } catch (e: any) {
      if (stale()) return;
      this.trials.set([]);
      this.error.set(e?.message ?? 'Trial search failed.');
    } finally {
      if (!stale()) this.loading.set(false);
    }
  }
}
