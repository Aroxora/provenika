import { Component, effect, inject, signal } from '@angular/core';
import { ReactomeService, Pathway } from '../../core/reactome.service';
import { TargetStore } from '../../core/target-store';

@Component({
  selector: 'app-pathways',
  template: `
    <h2>Pathways <span class="muted">— live from Reactome</span></h2>
    <p class="muted intro">Human signalling pathways involving <strong>{{ target() }}</strong>. Pathway context helps judge biology and off-target risk.</p>

    @if (loading()) {
      <div class="card"><span class="spinner"></span> Searching Reactome…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (pathways().length) {
      <div class="list">
        @for (p of pathways(); track p.stId) {
          <div class="card pw">
            <div class="pw-head">
              <a class="title" [href]="p.url" target="_blank" rel="noopener">{{ p.name }}</a>
              @if (p.isDisease) { <span class="pill warn">disease</span> }
              <span class="pill mono">{{ p.stId }}</span>
            </div>
            @if (p.summary) { <p class="muted sum">{{ p.summary }}</p> }
            <a class="diagram" [href]="p.diagramUrl" target="_blank" rel="noopener">Open pathway diagram ↗</a>
          </div>
        }
      </div>
    } @else {
      <div class="card muted">No Reactome pathways found for this term.</div>
    }
  `,
  styles: [`
    .intro { max-width: 60ch; }
    .list { display: flex; flex-direction: column; gap: 0.6rem; }
    .pw-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .title { font-weight: 600; }
    .sum { font-size: 0.85rem; margin: 0.4rem 0; max-height: 6em; overflow: auto; }
    .diagram { font-size: 0.82rem; }
  `],
})
export class Pathways {
  private svc = inject(ReactomeService);
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pathways = signal<Pathway[]>([]);

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
      const p = await this.svc.pathways(t);
      if (stale()) return;
      this.pathways.set(p);
    } catch (e: any) {
      if (stale()) return;
      this.pathways.set([]);
      this.error.set(e?.message ?? 'Pathway search failed.');
    } finally {
      if (!stale()) this.loading.set(false);
    }
  }
}
