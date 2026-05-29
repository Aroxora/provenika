import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TriageService } from '../../core/triage.service';
import { TargetStore } from '../../core/target-store';
import { TriageHit } from '../../core/models';
import { Scatter } from './scatter';
import { InfoTip } from '../../shared/info-tip';

@Component({
  selector: 'app-triage',
  host: { '(document:keydown.escape)': 'close()' },
  imports: [DecimalPipe, Scatter, InfoTip],
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
        novel only
      </label>
      <button class="primary" (click)="rerun()" [disabled]="loading()">Run triage</button>
      <button (click)="downloadCsv()" [disabled]="!hits().length">Export CSV</button>
      <span class="spacer"></span>
      <div class="seg">
        <button [class.on]="view() === 'plot'" (click)="view.set('plot')">Plot</button>
        <button [class.on]="view() === 'table'" (click)="view.set('table')">Table</button>
      </div>
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

      @if (view() === 'plot') {
        <div class="card">
          <app-scatter [hits]="hits()" [selectedId]="selected()?.chembl_id ?? ''" (select)="pick($event)" />
          <p class="muted cap">Each point is a measured ligand. Top-right = potent <em>and</em> drug-like — the triage sweet spot.</p>
        </div>
      } @else {
        <div class="card tablewrap">
          <table>
            <thead>
              <tr>
                <th tabindex="0" [attr.aria-sort]="ariaSort('score')" (click)="sortBy('score')"
                    (keydown.enter)="sortBy('score')" (keydown.space)="sortBy('score'); $event.preventDefault()">Score {{ arrow('score') }}</th>
                <th tabindex="0" [attr.aria-sort]="ariaSort('chembl_id')" (click)="sortBy('chembl_id')"
                    (keydown.enter)="sortBy('chembl_id')" (keydown.space)="sortBy('chembl_id'); $event.preventDefault()">ChEMBL ID</th>
                <th tabindex="0" [attr.aria-sort]="ariaSort('best_pchembl')" (click)="sortBy('best_pchembl')"
                    (keydown.enter)="sortBy('best_pchembl')" (keydown.space)="sortBy('best_pchembl'); $event.preventDefault()"><app-tip term="pChEMBL" label="pChEMBL" /> {{ arrow('best_pchembl') }}</th>
                <th tabindex="0" [attr.aria-sort]="ariaSort('qed')" (click)="sortBy('qed')"
                    (keydown.enter)="sortBy('qed')" (keydown.space)="sortBy('qed'); $event.preventDefault()"><app-tip term="QED" label="QED" /> {{ arrow('qed') }}</th>
                <th tabindex="0" [attr.aria-sort]="ariaSort('ro5_violations')" (click)="sortBy('ro5_violations')"
                    (keydown.enter)="sortBy('ro5_violations')" (keydown.space)="sortBy('ro5_violations'); $event.preventDefault()"><app-tip term="Ro5" label="Ro5" /> {{ arrow('ro5_violations') }}</th>
                <th tabindex="0" [attr.aria-sort]="ariaSort('drug_likeness')" (click)="sortBy('drug_likeness')"
                    (keydown.enter)="sortBy('drug_likeness')" (keydown.space)="sortBy('drug_likeness'); $event.preventDefault()">Drug-likeness {{ arrow('drug_likeness') }}</th>
                <th>Phase</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              @for (h of sorted(); track h.chembl_id) {
                <tr (click)="pick(h)" class="row" [class.sel]="h.chembl_id === selected()?.chembl_id"
                    tabindex="0" role="button" [attr.aria-label]="'Details for ' + (h.name === h.chembl_id ? h.chembl_id : h.name)"
                    (keydown.enter)="pick(h)" (keydown.space)="pick(h); $event.preventDefault()">
                  <td><span class="score" [style.--w.%]="h.score * 100">{{ h.score | number:'1.3-3' }}</span></td>
                  <td class="mono">{{ h.chembl_id }}</td>
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
      }
      <p class="muted foot">
        pChEMBL = −log₁₀(molar potency): 6≈1µM, 8≈10nM, 9≈1nM. Drug-likeness blends QED with
        Lipinski Ro5. Click a {{ view() === 'plot' ? 'point' : 'row' }} for the 2-D structure. ⚠️ Triage only — needs validation.
      </p>
    } @else {
      <div class="card muted">No candidates yet — adjust thresholds and run triage.</div>
    }

    @if (selected(); as h) {
      <aside class="drawer" (click)="close()">
        <div class="panel" #panel tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="hit-title"
             (click)="$event.stopPropagation()"
             (keydown.tab)="trap($event, false)" (keydown.shift.tab)="trap($event, true)">
          <button class="close" (click)="close()" aria-label="Close details">✕</button>
          <h3 id="hit-title">{{ h.name === h.chembl_id ? h.chembl_id : h.name }}</h3>
          <img class="depiction" [src]="depiction(h.chembl_id)" [alt]="'2-D structure of ' + h.chembl_id"
               loading="lazy" width="320" height="240" />
          <div class="props">
            <div><span class="muted">pChEMBL</span> <b class="mono">{{ h.best_pchembl | number:'1.2-2' }}</b> ({{ h.assay_type }})</div>
            <div><span class="muted">Drug-likeness</span> <b class="mono">{{ h.drug_likeness | number:'1.2-2' }}</b></div>
            <div><span class="muted">QED</span> <b class="mono">{{ h.qed | number:'1.2-2' }}</b></div>
            <div><span class="muted">Ro5 violations</span> <b class="mono">{{ h.ro5_violations ?? '–' }}</b></div>
            <div><span class="muted">MW</span> <b class="mono">{{ h.mw | number:'1.0-0' }}</b></div>
            <div><span class="muted">cLogP</span> <b class="mono">{{ h.alogp | number:'1.1-1' }}</b></div>
            <div><span class="muted">TPSA</span> <b class="mono">{{ h.psa | number:'1.0-0' }}</b></div>
            <div><span class="muted">Phase</span> <b>{{ h.dev_phase }}</b></div>
          </div>
          @if (h.smiles) { <div class="smiles mono">{{ h.smiles }}</div> }
          <a class="ext" [href]="h.chembl_url" target="_blank" rel="noopener">Open in ChEMBL ↗</a>
        </div>
      </aside>
    }
  `,
  styles: [`
    .intro { max-width: 64ch; }
    .controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.9rem; }
    .controls label { font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem; }
    .controls input[type=number] { width: 80px; }
    .check { gap: 0.35rem !important; }
    .spacer { flex: 1; }
    .seg { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .seg button { border: 0; border-radius: 0; padding: 0.45rem 0.8rem; background: transparent; }
    .seg button.on { background: var(--accent); color: #04130c; }
    .meta { margin-bottom: 0.6rem; }
    .cap { font-size: 0.8rem; margin: 0.5rem 0 0; }
    .tablewrap { overflow-x: auto; padding: 0.4rem 0.6rem; }
    .row { cursor: pointer; }
    .row.sel { background: #3ddc9712; }
    .score { position: relative; display: inline-block; padding: 0.1rem 0.45rem; border-radius: 6px;
      background: linear-gradient(90deg, #1f5e4455 var(--w, 0%), transparent var(--w, 0%)); font-weight: 600; }
    .warn-text { color: var(--warn); }
    .foot { font-size: 0.78rem; margin-top: 0.6rem; }
    .drawer { position: fixed; inset: 0; background: #000a; display: flex; justify-content: flex-end; z-index: 50; }
    .panel { width: min(420px, 92vw); height: 100%; overflow-y: auto; background: var(--bg-elev);
      border-left: 1px solid var(--border); padding: 1.3rem; position: relative; }
    .close { position: absolute; top: 0.8rem; right: 0.8rem; padding: 0.3rem 0.55rem; }
    .depiction { width: 100%; max-width: 340px; background: #fff; border-radius: 8px; margin: 0.5rem 0 1rem; }
    .props { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; font-size: 0.88rem; }
    .smiles { font-size: 0.75rem; word-break: break-all; margin: 1rem 0; padding: 0.5rem; background: var(--bg); border-radius: 6px; }
    .ext { display: inline-block; margin-top: 0.5rem; }
  `],
})
export class Triage {
  private svc = inject(TriageService);
  private store = inject(TargetStore);
  readonly target = this.store.target;

  readonly minPchembl = signal(7);
  readonly limit = signal(30);
  readonly excludeApproved = signal(false);
  readonly view = signal<'plot' | 'table'>('plot');

  readonly loading = signal(false);
  readonly error = signal('');
  readonly hits = signal<TriageHit[]>([]);
  readonly targetName = signal('');
  readonly selected = signal<TriageHit | null>(null);
  readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private prevFocus: HTMLElement | null = null;

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
    // Auto-run ONLY when the shared target changes. untracked() keeps the
    // synchronous control-signal reads inside rerun() out of this effect's
    // dependency set (otherwise typing in the inputs would refire a ChEMBL scan).
    effect(() => {
      this.store.target();
      untracked(() => this.rerun());
    });
    // Move focus into the drawer when it opens (a11y: modal dialog).
    effect(() => {
      if (this.selected()) {
        const el = this.panel()?.nativeElement;
        if (el) queueMicrotask(() => el.focus());
      }
    });
  }

  close() {
    if (!this.selected()) return;
    this.selected.set(null);
    this.prevFocus?.focus?.();
  }

  /** Simple focus trap for the modal drawer. */
  trap(e: Event, back: boolean) {
    const root = this.panel()?.nativeElement;
    if (!root) return;
    const f = Array.from(
      root.querySelectorAll<HTMLElement>('a[href],button,[tabindex]:not([tabindex="-1"])'),
    ).filter((x) => !x.hasAttribute('disabled'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    const active = document.activeElement;
    if (back && (active === first || active === root)) { e.preventDefault(); last.focus(); }
    else if (!back && active === last) { e.preventDefault(); first.focus(); }
  }

  ariaSort(k: keyof TriageHit): 'ascending' | 'descending' | 'none' {
    return this.sortKey() === k ? (this.sortDir() === 1 ? 'ascending' : 'descending') : 'none';
  }

  async rerun() {
    const name = this.store.target();
    this.loading.set(true);
    this.error.set('');
    this.selected.set(null);
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

  pick(h: TriageHit) {
    this.prevFocus = document.activeElement as HTMLElement;
    this.selected.set(h);
  }

  depiction(id: string): string {
    return `https://www.ebi.ac.uk/chembl/api/data/image/${id}.svg`;
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
