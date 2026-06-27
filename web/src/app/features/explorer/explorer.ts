import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';
import { DossierService } from '../../core/dossier.service';
import { TriageService } from '../../core/triage.service';
import { UniprotService } from '../../core/uniprot.service';
import { CostBenefitService } from '../../core/cost-benefit.service';
import { CheminformaticsService, ChemInfo } from '../../core/cheminformatics.service';
import { Scatter } from '../../shared/scatter';
import { Dossier, TriageHit, UniprotSummary } from '../../core/models';
import { track } from '../../core/firebase';

interface CostResult {
  probabilityOfApproval: number;
  expectedCostMusd: number;
  expectedTimeYears: number;
  riskAdjustedRevenueMusd: number;
  benefitCostRatio: number;
  verdict: string;
}

@Component({
  selector: 'app-explorer',
  imports: [DecimalPipe, RouterLink, Scatter],
  template: `
    <div class="ex-head">
      <div>
        <h1>Target Explorer</h1>
        <p class="muted">Live public data + deterministic models. Change the target in the bar above — everything updates.</p>
      </div>
      <div class="head-actions">
        <button (click)="runAll()" [disabled]="anyLoading()">Refresh all</button>
        <button class="primary" (click)="copyHypothesis()" [disabled]="!dossier()">Copy hypothesis</button>
      </div>
    </div>

    @if (target()) {
      <div class="current">Current target: <strong class="mono accent">{{ target() }}</strong></div>
    }

    <div class="grid">
      <!-- 1. Dossier -->
      <div class="card dossier">
        <div class="card-h">
          <h3>Dossier</h3>
          <span class="src">ChEMBL + UniProt</span>
        </div>
        @if (dossierLoading()) {
          <div><span class="spinner"></span> Loading dossier…</div>
        } @else if (dossier(); as d) {
          <div class="d-row"><span class="k">Target</span> <span class="v mono">{{ d.target.pref_name }}</span></div>
          <div class="d-row"><span class="k">ChEMBL ID</span> <a class="mono" [href]="'https://www.ebi.ac.uk/chembl/target_report_card/' + d.target.target_chembl_id + '/'" target="_blank">{{ d.target.target_chembl_id }}</a></div>
          @if (d.uniprot) {
            <div class="d-row"><span class="k">UniProt</span> <a class="mono" [href]="'https://www.uniprot.org/uniprotkb/' + d.uniprot.accession" target="_blank">{{ d.uniprot.accession }}</a> · {{ d.uniprot.name }}</div>
            <div class="d-row"><span class="k">Function</span> <span class="v">{{ (d.uniprot.function || '').slice(0, 240) }}{{ (d.uniprot.function || '').length > 240 ? '…' : '' }}</span></div>
          }
          <div class="d-row"><span class="k">Potent activities</span> <span class="v">{{ d.potentActivityCount | number }} measured (IC50/Ki/Kd)</span></div>
          @if (d.knownDrugs && d.knownDrugs.length) {
            <div class="drugs">
              <div class="k" style="margin-bottom:.2rem">Known modulators (top)</div>
              @for (dr of d.knownDrugs.slice(0,8); track dr.molecule_chembl_id) {
                <span class="pill" [class.green]="dr.devPhase?.includes('approved')">
                  {{ dr.name || dr.molecule_chembl_id }} <span class="tiny">{{ dr.devPhase || '' }}</span>
                </span>
              }
            </div>
          }
          <div class="readout">{{ d.readout }}</div>
        } @else {
          <p class="muted">Enter a valid oncology target gene symbol (e.g. EGFR, BTK).</p>
        }
      </div>

      <!-- 2. Ligand Triage (real + interactive) -->
      <div class="card triage">
        <div class="card-h">
          <h3>Ligand Triage</h3>
          <span class="src">ChEMBL live + computed scores</span>
        </div>

        <div class="tri-controls">
          <label>min pChEMBL <input type="number" [value]="minP()" (input)="minP.set(+$any($event.target).value)" step="0.5" style="width:70px"></label>
          <label>limit <input type="number" [value]="lim()" (input)="lim.set(+$any($event.target).value)" style="width:60px"></label>
          <label class="check"><input type="checkbox" [checked]="novelOnly()" (change)="novelOnly.set($any($event.target).checked)"> novel only</label>
          <button (click)="runTriage()" [disabled]="triageLoading()">Run</button>
          <button (click)="downloadTriageCsv()" [disabled]="!triageHits().length">CSV</button>
        </div>

        @if (triageLoading()) {
          <div><span class="spinner"></span> Scanning ChEMBL…</div>
        } @else if (triageError()) {
          <div class="error">{{ triageError() }}</div>
        } @else if (triageHits().length) {
          <div class="meta-line">{{ triageHits().length }} ranked ligands · top-right quadrant = potent + drug-like</div>

          <div class="scatter-wrap">
            <app-scatter [hits]="triageHits()" [selectedId]="selectedHit()?.chembl_id || ''" (select)="selectHit($event)" />
          </div>

          <div class="top-hits">
            @for (h of triageHits().slice(0,5); track h.chembl_id) {
              <div class="hit" [class.sel]="h.chembl_id === selectedHit()?.chembl_id" (click)="selectHit(h)">
                <span class="score">{{ h.score | number:'1.2-2' }}</span>
                <span class="mono">{{ h.chembl_id }}</span>
                <span>{{ h.name || '—' }}</span>
                <span class="muted">pChEMBL {{ h.pchembl_median | number:'1.1-1' }}@if (h.n_measurements) {<span> (n={{ h.n_measurements }})</span>}@if (h.potency_suspect) {<span title="near-ceiling potency from <2 measurements — verify">&nbsp;⚠️</span>}</span>
              </div>
            }
          </div>

          @if (selectedChem(); as c) {
            <div class="chem-liab" style="margin-top:.5rem;display:flex;gap:.35rem;flex-wrap:wrap;align-items:center">
              <span class="k">RDKit liabilities · {{ selectedHit()?.chembl_id }}</span>
              <span class="pill" [class.green]="c.painsAlerts === 0">PAINS {{ c.painsAlerts }}</span>
              <span class="pill" [class.green]="c.brenkAlerts === 0">Brenk {{ c.brenkAlerts }}</span>
              <span class="pill" [class.green]="c.eganOk">Egan {{ c.eganOk ? 'ok' : '✗' }}</span>
              <span class="pill" [class.green]="c.gskOk">GSK 4/400 {{ c.gskOk ? 'ok' : '✗' }}</span>
              <span class="pill" [class.green]="!c.pfizerToxRisk">Pfizer 3/75 {{ c.pfizerToxRisk ? 'risk' : 'ok' }}</span>
              @if (c.le != null) { <span class="tiny">LE {{ c.le | number:'1.2-2' }}</span> }
              @if (c.lle != null) { <span class="tiny">LLE {{ c.lle | number:'1.2-2' }}</span> }
              @if (c.saScore != null) { <span class="tiny">SA {{ c.saScore | number:'1.1-2' }}</span> }
              @if (c.scaffold) { <span class="tiny mono">scaffold {{ c.scaffold }}</span> }
            </div>
          } @else if (selectedHit()) {
            <p class="tiny muted" style="margin-top:.5rem">No precomputed RDKit liabilities for this target (generated by cad/precompute_site_data.py for a curated set).</p>
          }
        } @else {
          <p class="muted">No potent ligands found at current threshold. Lower min pChEMBL and rerun.</p>
        }
      </div>

      <!-- 3. Structure -->
      <div class="card structure">
        <div class="card-h">
          <h3>Best experimental structure</h3>
          <span class="src">UniProt → RCSB PDB</span>
        </div>
        @if (structLoading()) {
          <div><span class="spinner"></span> Finding structures…</div>
        } @else if (structError()) {
          <div class="error">{{ structError() }}</div>
        } @else if (bestPdb()) {
          <div class="pdb-head">
            <strong class="mono">{{ bestPdb() }}</strong>
            <a [href]="'https://www.rcsb.org/structure/' + bestPdb()" target="_blank">RCSB ↗</a>
            <a [href]="'https://files.rcsb.org/download/' + bestPdb() + '.pdb'" target="_blank">.pdb ↗</a>
          </div>
          <div class="viewer">
            <iframe [src]="viewerSrc()" title="Mol* structure viewer" loading="lazy"></iframe>
          </div>
          @if (uni(); as u) {
            <div class="pdb-chips">
              @for (p of (u.pdbs || []).slice(0,12); track p.id) {
                <button class="chip mono" [class.active]="p.id === bestPdb()" (click)="selectPdb(p.id)">{{ p.id }}</button>
              }
            </div>
          }
        } @else {
          <div class="muted">
            No experimental structure cross-referenced.
            @if (uni()?.accession) {
              Try <a [href]="'https://alphafold.ebi.ac.uk/entry/' + uni()!.accession" target="_blank">AlphaFold model ↗</a>
            }
          </div>
        }
      </div>

      <!-- 4. Feasibility / Cost-Benefit -->
      <div class="card feasibility">
        <div class="card-h">
          <h3>Feasibility snapshot</h3>
          <span class="src">Public benchmarks (cost, PoS, timelines)</span>
        </div>

        <div class="cb-grid">
          <div>
            <label>Modality
              <select [value]="modality()" (change)="setModality($any($event.target).value)">
                <option value="small_molecule">small molecule</option>
                <option value="mab">mAb</option>
                <option value="adc">ADC</option>
                <option value="car_t">CAR-T</option>
                <option value="gene_therapy">gene therapy</option>
              </select>
            </label>
            <label>Current phase
              <select [value]="phase()" (change)="setPhase($any($event.target).value)">
                @for (p of phases; track p) { <option [value]="p">{{ p }}</option> }
              </select>
            </label>
            <label>Incidence (patients/yr)
              <input type="number" [value]="incidence()" (input)="setIncidence(+$any($event.target).value)" />
            </label>
            <label>Price per year (USD)
              <input type="number" [value]="price()" (input)="setPrice(+$any($event.target).value)" />
            </label>
          </div>
          <div class="cb-results">
            @if (costResult(); as r) {
              <div class="big-num">{{ r.probabilityOfApproval * 100 | number:'1.0-1' }}% <span class="small muted">P(approval)</span></div>
              <div class="big-num">\${{ r.expectedCostMusd | number:'1.0-0' }}M <span class="small muted">expected remaining cost</span></div>
              <div class="big-num">{{ r.expectedTimeYears }} yr <span class="small muted">to market</span></div>
              <div class="bcr" [class.good]="r.benefitCostRatio >= 1.4" [class.bad]="r.benefitCostRatio < 0.85">
                Benefit/cost {{ r.benefitCostRatio | number:'1.1-1' }}
              </div>
              <div class="verdict">{{ r.verdict }}</div>
            }
          </div>
        </div>
        <p class="tiny muted">Order-of-magnitude planning only. Not financial advice. Oncology factor applied by default.</p>
      </div>
    </div>

    <p class="foot muted">
      All data fetched live or computed deterministically from public sources. Scores rank hypotheses, not clinical outcomes.
      <a routerLink="/log">See how the autonomous agent is doing right now →</a>
    </p>
  `,
  styles: [`
    .ex-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; margin-bottom:.4rem; flex-wrap:wrap; }
    .ex-head h1 { margin:0; }
    .head-actions { display:flex; gap:.4rem; }
    .current { font-size:.9rem; margin-bottom:1rem; }
    .accent { color: var(--accent); }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:1rem; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }

    .card-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.55rem; }
    .card-h h3 { margin:0; font-size:1.05rem; }
    .src { font-size:.72rem; color:var(--text-dim); }

    .d-row { display:flex; gap:.5rem; margin:.25rem 0; font-size:.93rem; }
    .d-row .k { color:var(--text-dim); width: 108px; flex-shrink:0; }
    .d-row .v { flex:1; }
    .drugs { display:flex; flex-wrap:wrap; gap:.3rem; margin-top:.35rem; }
    .drugs .pill { font-size:.7rem; }
    .tiny { font-size:.65rem; opacity:.7; margin-left:2px; }
    .readout { margin-top:.5rem; font-size:.85rem; color:var(--text-dim); }

    .tri-controls { display:flex; flex-wrap:wrap; gap:.4rem .6rem; align-items:center; margin-bottom:.5rem; }
    .tri-controls label { display:flex; align-items:center; gap:.3rem; font-size:.82rem; }
    .meta-line { font-size:.82rem; margin-bottom:.35rem; color:var(--text-dim); }
    .scatter-wrap { background:#0c121a; border-radius:10px; padding:.4rem; margin-bottom:.4rem; overflow:hidden; }
    .top-hits { display:grid; gap:.25rem; }
    .hit { display:grid; grid-template-columns: 52px 92px 1fr auto; gap:.4rem; padding:.3rem .5rem; border-radius:8px; cursor:pointer; border:1px solid transparent; }
    .hit:hover { background:#182334; }
    .hit.sel { border-color: var(--accent); background:#13241d; }
    .hit .score { font-weight:600; color:var(--accent); font-family:var(--mono); }

    .pdb-head { display:flex; gap:.6rem; flex-wrap:wrap; align-items:center; margin-bottom:.4rem; }
    .viewer { height: 320px; border-radius: 10px; overflow:hidden; border:1px solid var(--border); background:#000; margin-bottom:.5rem; }
    .viewer iframe { width:100%; height:100%; border:0; }
    .pdb-chips { display:flex; flex-wrap:wrap; gap:.3rem; }

    .cb-grid { display:grid; grid-template-columns: 1fr 1fr; gap:1rem; }
    @media (max-width:820px){ .cb-grid { grid-template-columns:1fr; } }
    .cb-grid label { display:block; margin-bottom:.35rem; font-size:.82rem; }
    .cb-results { background:#0c121a; border-radius:10px; padding:.6rem .8rem; }
    .big-num { font-size:1.15rem; font-weight:600; margin:.25rem 0; font-family:var(--mono); }
    .big-num .small { font-size:.7rem; font-family:var(--sans); }
    .bcr { margin:.4rem 0; font-weight:600; }
    .bcr.good { color: var(--accent); }
    .bcr.bad { color: var(--danger); }
    .verdict { font-size:.9rem; margin-top:.2rem; }

    .foot { margin-top:1.4rem; font-size:.8rem; }
  `]
})
export class Explorer {
  private store = inject(TargetStore);
  private dossierSvc = inject(DossierService);
  private triageSvc = inject(TriageService);
  private uniSvc = inject(UniprotService);
  private costSvc = inject(CostBenefitService);
  private chemSvc = inject(CheminformaticsService);

  readonly target = this.store.target;

  // Dossier
  readonly dossier = signal<Dossier | null>(null);
  readonly dossierLoading = signal(false);

  // Triage
  readonly minP = signal(7);
  readonly lim = signal(20);
  readonly novelOnly = signal(true);
  readonly triageHits = signal<TriageHit[]>([]);
  readonly triageLoading = signal(false);
  readonly triageError = signal('');
  readonly selectedHit = signal<TriageHit | null>(null);
  // Precomputed RDKit liabilities (PAINS/Brenk/Egan/scaffold) for this target, if available.
  readonly chemInfo = signal<Map<string, ChemInfo> | null>(null);
  readonly selectedChem = computed<ChemInfo | null>(() => {
    const h = this.selectedHit();
    return h ? (this.chemInfo()?.get(h.chembl_id) ?? null) : null;
  });

  // Structure
  readonly uni = signal<UniprotSummary | null>(null);
  readonly bestPdb = signal<string | null>(null);
  readonly structLoading = signal(false);
  readonly structError = signal('');
  readonly viewerSrc = computed(() => {
    const pdb = this.bestPdb();
    if (!pdb) return '';
    // RCSB Mol* embed
    return `https://www.rcsb.org/3d-view/${pdb}?preset=3d&viewer=mmcif&theme=dark` as any;
  });

  // Cost-benefit (simple defaults, explicit to avoid FormsModule)
  modality = signal('small_molecule');
  phase = signal('phase1');
  incidence = signal(18000);
  price = signal(180000);
  readonly phases = ['preclinical', 'phase1', 'phase2', 'phase3', 'filed'];
  readonly costResult = signal<CostResult | null>(null);

  constructor() {
    // Load when target changes
    effect(() => {
      const t = this.target();
      if (t) this.loadForTarget(t);
    });

    // initial load
    const initial = this.target();
    if (initial) this.loadForTarget(initial);
  }

  async loadForTarget(t: string) {
    this.dossier.set(null);
    this.triageHits.set([]);
    this.uni.set(null);
    this.bestPdb.set(null);
    this.chemInfo.set(null);

    this.dossierLoading.set(true);
    this.structLoading.set(true);

    try {
      const d = await this.dossierSvc.build(t);
      this.dossier.set(d);
    } catch (e: any) {
      this.dossier.set(null);
    } finally {
      this.dossierLoading.set(false);
    }

    // structure (light)
    try {
      const u = await this.uniSvc.summary(t);
      this.uni.set(u || null);
      const first = u?.pdbs?.[0]?.id;
      if (first) this.bestPdb.set(first);
    } catch {
      this.uni.set(null);
    } finally {
      this.structLoading.set(false);
    }

    // default triage run (non-blocking for the page)
    this.runTriageQuiet();

    // precomputed RDKit liabilities for this target, if any (non-blocking, null-safe)
    this.chemSvc.forTarget(t).then((m) => this.chemInfo.set(m)).catch(() => this.chemInfo.set(null));

    // default cost
    this.recomputeCost();
    track('explore_target', { target: t });
  }

  async runAll() {
    const t = this.target();
    if (t) await this.loadForTarget(t);
  }

  anyLoading() {
    return this.dossierLoading() || this.triageLoading() || this.structLoading();
  }

  async runTriage() {
    await this.runTriageQuiet(true);
  }

  private async runTriageQuiet(showLoading = false) {
    const t = this.target();
    if (!t) return;
    if (showLoading) this.triageLoading.set(true);
    this.triageError.set('');
    try {
      const res = await this.triageSvc.run({
        target: t,
        minPchembl: this.minP(),
        limit: this.lim(),
        excludeApproved: this.novelOnly(),
      });
      this.triageHits.set(res.hits);
      if (res.hits.length && !this.selectedHit()) this.selectedHit.set(res.hits[0]);
    } catch (e: any) {
      this.triageHits.set([]);
      this.triageError.set(e?.message || 'Triage failed');
    } finally {
      if (showLoading) this.triageLoading.set(false);
    }
  }

  selectHit(h: TriageHit) {
    this.selectedHit.set(h);
    // optionally set focus ligand for future math use
    this.store.setFocusLigand({ id: h.chembl_id, pchembl: h.pchembl_median, name: h.name || h.chembl_id });
  }

  downloadTriageCsv() {
    const csv = this.triageSvc.toCsv(this.triageHits());
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.target()}_triage.csv`;
    a.click();
  }

  selectPdb(id: string) {
    this.bestPdb.set(id);
  }

  setModality(v: string) { this.modality.set(v); this.recomputeCost(); }
  setPhase(v: string) { this.phase.set(v); this.recomputeCost(); }
  setIncidence(v: number) { this.incidence.set(v || 1000); this.recomputeCost(); }
  setPrice(v: number) { this.price.set(v || 50000); this.recomputeCost(); }

  recomputeCost() {
    try {
      const r = this.costSvc.analyze({
        modality: this.modality(),
        phase: this.phase(),
        incidence: this.incidence(),
        price: this.price(),
        oncology: true,
      });
      this.costResult.set(r);
    } catch {}
  }

  async copyHypothesis() {
    const d = this.dossier();
    const hits = this.triageHits();
    const r = this.costResult();
    const lines: string[] = [];
    lines.push(`Provenika hypothesis — ${this.target()}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    if (d) {
      lines.push(`Dossier: ${d.target.pref_name} (${d.target.target_chembl_id})`);
      lines.push(`Potent activities: ${d.potentActivityCount}`);
      if (d.knownDrugs?.length) lines.push(`Known modulators: ${d.knownDrugs.slice(0,4).map(x => x.name||x.molecule_chembl_id).join(', ')}`);
    }
    if (hits.length) {
      lines.push(`Top ligand: ${hits[0].chembl_id} (score ${hits[0].score.toFixed(3)})`);
    }
    if (r) {
      lines.push(`Feasibility: ${r.verdict} (BCR ${r.benefitCostRatio.toFixed(2)})`);
    }
    lines.push('');
    lines.push('Sources: live ChEMBL, UniProt, RCSB. Verify: python3 cad/verify.py --target ' + this.target());
    lines.push('https://provenika.com/explore?t=' + encodeURIComponent(this.target()));

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      alert('Hypothesis copied to clipboard');
    } catch {
      // fallback
      prompt('Copy this:', lines.join('\n'));
    }
  }
}
