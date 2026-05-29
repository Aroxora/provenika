import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EuropePmcService, Article } from '../../core/europepmc.service';
import { TargetStore } from '../../core/target-store';

@Component({
  selector: 'app-literature',
  imports: [DecimalPipe],
  template: `
    <h2>Literature <span class="muted">— live from Europe PMC</span></h2>
    <p class="muted intro">Published &amp; preprint literature (Europe PMC) mentioning <strong>{{ target() }}</strong>. Use it to justify a target before triaging.</p>

    <div class="controls">
      <button [class.primary]="sort() === 'recent'" (click)="setSort('recent')">Most recent</button>
      <button [class.primary]="sort() === 'cited'" (click)="setSort('cited')">Most cited</button>
    </div>

    @if (loading()) {
      <div class="card"><span class="spinner"></span> Searching Europe PMC…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (articles().length) {
      <div class="list">
        @for (a of articles(); track a.source + a.id) {
          <div class="card art">
            <a class="title" [href]="a.url" target="_blank" rel="noopener">{{ a.title }}</a>
            <div class="meta muted">
              <span>{{ a.authors }}</span>
              @if (a.journal) { <span>· {{ a.journal }}</span> }
              @if (a.year) { <span>· {{ a.year }}</span> }
              <span class="pill blue">cited {{ a.citedBy | number }}</span>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="card muted">No articles found.</div>
    }
  `,
  styles: [`
    .intro { max-width: 60ch; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 0.9rem; }
    .list { display: flex; flex-direction: column; gap: 0.6rem; }
    .art { padding: 0.8rem 1rem; }
    .title { font-weight: 600; }
    .meta { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; font-size: 0.82rem; margin-top: 0.35rem; }
  `],
})
export class Literature {
  private svc = inject(EuropePmcService);
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly sort = signal<'recent' | 'cited'>('recent');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly articles = signal<Article[]>([]);

  constructor() {
    effect(() => {
      this.store.target();
      this.sort();
      this.fetch();
    });
  }

  setSort(s: 'recent' | 'cited') { this.sort.set(s); }

  private async fetch() {
    const t = this.store.target(), s = this.sort();
    const stale = () => this.store.target() !== t || this.sort() !== s;
    this.loading.set(true);
    this.error.set('');
    try {
      const a = await this.svc.search(t, s, 20);
      if (stale()) return;
      this.articles.set(a);
    } catch (e: any) {
      if (stale()) return;
      this.articles.set([]);
      this.error.set(e?.message ?? 'Literature search failed.');
    } finally {
      if (!stale()) this.loading.set(false);
    }
  }
}
