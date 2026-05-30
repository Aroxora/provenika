import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DossierService } from '../../core/dossier.service';
import { TriageService } from '../../core/triage.service';
import { CostBenefitService, MODALITY_MULT } from '../../core/cost-benefit.service';
import { EuropePmcService, Article } from '../../core/europepmc.service';
import { TrialsService } from '../../core/trials.service';
import { TargetStore } from '../../core/target-store';
import { Dossier, TriageHit, CostBenefit } from '../../core/models';

@Component({
  selector: 'app-report',
  imports: [DecimalPipe],
  template: `
    <h2>Report <span class="muted">— consolidated, exportable brief</span></h2>
    <p class="muted intro">
      Runs dossier + triage + cost-benefit for <strong>{{ target() }}</strong> and assembles a
      one-page brief. Mirrors <code class="mono">cad/run_pipeline.py → SUMMARY.md</code>.
    </p>

    <div class="controls card">
      <label>Modality
        <select [value]="modality()" (change)="modality.set($any($event.target).value)">
          @for (m of modalities; track m) { <option [value]="m">{{ m }}</option> }
        </select>
      </label>
      <label>Phase
        <select [value]="phase()" (change)="phase.set($any($event.target).value)">
          @for (p of phases; track p) { <option [value]="p">{{ p }}</option> }
        </select>
      </label>
      <button class="primary" (click)="generate()" [disabled]="loading()">Generate report</button>
      <button (click)="download()" [disabled]="!dossier()">Download .md</button>
    </div>

    <div role="status" aria-live="polite">
    @if (loading()) {
      <div class="card"><span class="spinner"></span> Assembling report for {{ target() }}…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (dossier(); as d) {
      <div class="card">
        <h3>{{ d.target.pref_name }} <span class="muted mono">{{ d.target.target_chembl_id }}</span></h3>
        <div class="readout">{{ d.readout }}</div>
        <div class="sec">
          <h4>Druggability</h4>
          <ul>
            <li>UniProt {{ d.uniprot?.accession || 'n/a' }} · {{ d.uniprot?.length || '?' }} aa</li>
            <li>{{ d.uniprot?.pdb_count ?? 0 }} experimental PDB structures (docking feasible: {{ (d.uniprot?.pdb_count ?? 0) > 0 ? 'yes' : 'no' }})</li>
            <li>{{ d.potentActivityCount | number }} potent ChEMBL activities · {{ d.knownDrugs.length }} known mechanism drugs</li>
          </ul>
        </div>
        <div class="sec">
          <h4>Top ligand candidates</h4>
          <ol class="hits">
            @for (h of topHits(); track h.chembl_id) {
              <li><span class="mono">{{ h.chembl_id }}</span> — pChEMBL {{ h.best_pchembl | number:'1.1-1' }},
                DL {{ h.drug_likeness | number:'1.2-2' }}, {{ h.dev_phase }}</li>
            }
          </ol>
        </div>
        <div class="sec">
          <h4>Evidence</h4>
          <ul>
            <li>{{ trialCount() === null ? '—' : (trialCount() | number) }} registered clinical trials reference this term (ClinicalTrials.gov)</li>
            @if (literature().length) {
              <li>Top-cited literature (Europe PMC):
                <ul>
                  @for (a of literature(); track a.id) {
                    <li><a [href]="a.url" target="_blank" rel="noopener">{{ a.title }}</a> <span class="muted">({{ a.year }}, cited {{ a.citedBy | number }})</span></li>
                  }
                </ul>
              </li>
            }
          </ul>
        </div>
        @if (cb(); as c) {
          <div class="sec">
            <h4>Cost-benefit ({{ c.modality }} @ {{ c.phase }})</h4>
            <ul>
              <li>P(approval): {{ c.probabilityOfApproval * 100 | number:'1.1-1' }}% · expected cost \${{ c.expectedCostMusd | number:'1.0-0' }}M over {{ c.expectedTimeYears }} yr</li>
              <li>Risk-adjusted revenue \${{ c.riskAdjustedRevenueMusd | number:'1.0-0' }}M · benefit/cost {{ c.benefitCostRatio | number:'1.2-2' }}</li>
              <li><strong>{{ c.verdict }}</strong></li>
            </ul>
          </div>
        }
        <p class="disclaimer">Research only — not medical advice. Every figure links to a public source; verify before relying on it.</p>
      </div>
    } @else {
      <div class="card muted">Click “Generate report”.</div>
    }
    </div>
  `,
  styles: [`
    .intro { max-width: 64ch; }
    .controls { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.9rem; }
    .controls label { font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.4rem; }
    .readout { margin: 0.4rem 0 1rem; }
    .sec { margin: 0.9rem 0; }
    .sec h4 { margin: 0 0 0.4rem; color: var(--accent); }
    .sec ul, .sec ol { margin: 0; padding-left: 1.2rem; line-height: 1.6; font-size: 0.9rem; }
  `],
})
export class Report {
  private dossierSvc = inject(DossierService);
  private triageSvc = inject(TriageService);
  private cbSvc = inject(CostBenefitService);
  private pmcSvc = inject(EuropePmcService);
  private trialsSvc = inject(TrialsService);
  private store = inject(TargetStore);
  readonly target = this.store.target;

  readonly modalities = Object.keys(MODALITY_MULT);
  readonly phases = ['preclinical', 'phase1', 'phase2', 'phase3', 'filed'];
  readonly modality = signal('small_molecule');
  readonly phase = signal('phase1');

  readonly loading = signal(false);
  readonly error = signal('');
  readonly dossier = signal<Dossier | null>(null);
  readonly topHits = signal<TriageHit[]>([]);
  readonly cb = signal<CostBenefit | null>(null);
  readonly literature = signal<Article[]>([]);
  readonly trialCount = signal<number | null>(null);

  async generate() {
    const name = this.store.target();
    this.loading.set(true);
    this.error.set('');
    try {
      const [d, t, lit, trials] = await Promise.all([
        this.dossierSvc.build(name),
        this.triageSvc.run({ target: name, minPchembl: 7, limit: 5 }).catch(() => ({ hits: [] as TriageHit[] })),
        this.pmcSvc.search(name, 'cited', 3).catch(() => [] as Article[]),
        this.trialsSvc.count(name).catch(() => null),
      ]);
      this.dossier.set(d);
      this.topHits.set(t.hits.slice(0, 5));
      this.literature.set(lit);
      this.trialCount.set(trials);
      this.cb.set(this.cbSvc.analyze({
        modality: this.modality(), phase: this.phase(), incidence: 50000, price: 150000,
      }));
    } catch (e: any) {
      this.dossier.set(null);
      this.error.set(e?.message ?? 'Report failed.');
    } finally {
      this.loading.set(false);
    }
  }

  download() {
    const d = this.dossier();
    if (!d) return;
    const c = this.cb();
    const md: string[] = [
      `# CADD report — ${d.target.pref_name} (${d.target.target_chembl_id})`,
      '', `> ${d.readout}`, '',
      '## Druggability',
      `- UniProt: ${d.uniprot?.accession ?? 'n/a'} (${d.uniprot?.length ?? '?'} aa)`,
      `- PDB structures: ${d.uniprot?.pdb_count ?? 0} (docking feasible: ${(d.uniprot?.pdb_count ?? 0) > 0 ? 'yes' : 'no'})`,
      `- Potent ChEMBL activities: ${d.potentActivityCount} · known mechanism drugs: ${d.knownDrugs.length}`,
      '', '## Top ligand candidates',
      ...this.topHits().map((h, i) => `${i + 1}. ${h.chembl_id} — pChEMBL ${h.best_pchembl.toFixed(1)}, DL ${h.drug_likeness.toFixed(2)}, ${h.dev_phase}`),
      '', '## Evidence',
      `- Registered clinical trials referencing term: ${this.trialCount() ?? 'n/a'}`,
      ...this.literature().map((a) => `- ${a.title} (${a.year}, cited ${a.citedBy}) — ${a.url}`),
    ];
    if (c) md.push('', `## Cost-benefit (${c.modality} @ ${c.phase})`,
      `- P(approval): ${(c.probabilityOfApproval * 100).toFixed(1)}%; expected cost $${c.expectedCostMusd}M over ${c.expectedTimeYears} yr`,
      `- Risk-adjusted revenue $${c.riskAdjustedRevenueMusd}M; benefit/cost ${c.benefitCostRatio}`,
      `- ${c.verdict}`);
    md.push('', '_Research only — not medical advice. Verify every figure at its public source._');
    const blob = new Blob([md.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.target().replace(/\s+/g, '_')}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
