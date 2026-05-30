import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { UniprotService } from '../../core/uniprot.service';
import { TargetStore } from '../../core/target-store';
import { UniprotSummary } from '../../core/models';

@Component({
  selector: 'app-structure',
  imports: [RouterLink],
  template: `
    <h2>3 · Structure <span class="muted">— 3-D receptor for docking</span></h2>
    <p class="muted intro">
      Best experimental structure for <strong>{{ target() }}</strong> from UniProt → RCSB PDB.
      Port of <code class="mono">cad/fetch_structure.py</code>; viewer is RCSB Mol*.
    </p>

    <div role="status" aria-live="polite">
    @if (loading()) {
      <div class="card"><span class="spinner"></span> Finding structures…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (uni(); as u) {
      @if (selected(); as pdb) {
        <div class="card head">
          <div>
            <strong class="mono">{{ pdb }}</strong>
            <span class="muted">· {{ u.pdb_count }} structures available</span>
          </div>
          <div class="links">
            <a [href]="'https://www.rcsb.org/structure/' + pdb" target="_blank" rel="noopener">RCSB page ↗</a>
            <a [href]="'https://files.rcsb.org/download/' + pdb + '.pdb'" target="_blank" rel="noopener">Download .pdb ↗</a>
          </div>
        </div>
        <div class="viewer card">
          <iframe [src]="viewerUrl()" title="RCSB Mol* viewer" loading="lazy"></iframe>
        </div>
        <div class="chips">
          @for (p of u.pdbs.slice(0, 18); track p.id) {
            <button class="chip mono" [class.active]="p.id === pdb" (click)="select(p.id)"
              [title]="p.method + ' ' + p.resolution">{{ p.id }}</button>
          }
        </div>
      } @else {
        <div class="card muted">
          No experimental PDB structure cross-referenced for this target.
          An AlphaFold model may exist:
          <a [href]="'https://alphafold.ebi.ac.uk/entry/' + u.accession" target="_blank" rel="noopener">AlphaFold {{ u.accession }} ↗</a>
        </div>
      }
    } @else {
      <div class="card muted">No UniProt entry resolved for “{{ target() }}”. Try a gene symbol (e.g. EGFR, BRAF).</div>
    }
    </div>
    @if (uni()) {
      <div class="next"><a routerLink="/cost-benefit"><button>Next: cost-benefit →</button></a></div>
    }
  `,
  styles: [`
    .intro { max-width: 60ch; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.7rem; flex-wrap: wrap; }
    .links { display: flex; gap: 1rem; font-size: 0.88rem; }
    .viewer { padding: 0; overflow: hidden; }
    .viewer iframe { width: 100%; height: 520px; border: 0; display: block; background: #000; }
    .chips { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.7rem; }
    .chips .chip { font-size: 0.78rem; padding: 0.2rem 0.5rem; }
    .chips .chip.active { border-color: var(--accent); color: var(--accent); }
    .next { margin-top: 1rem; }
  `],
})
export class Structure {
  private svc = inject(UniprotService);
  private store = inject(TargetStore);
  private sanitizer = inject(DomSanitizer);
  readonly target = this.store.target;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly uni = signal<UniprotSummary | null>(null);
  readonly selected = signal<string>('');

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
      const u = await this.svc.summary(t);
      if (stale()) return;
      this.uni.set(u);
      this.selected.set(u?.pdbs?.[0]?.id ?? '');
    } catch (e: any) {
      if (stale()) return;
      this.uni.set(null);
      this.error.set(e?.message ?? 'Structure lookup failed.');
    } finally {
      if (!stale()) this.loading.set(false);
    }
  }

  select(id: string) {
    this.selected.set(id);
  }

  viewerUrl(): SafeResourceUrl {
    const id = this.selected();
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.rcsb.org/3d-view/${id}`);
  }
}
