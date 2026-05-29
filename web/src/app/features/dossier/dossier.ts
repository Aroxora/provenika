import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DossierService } from '../../core/dossier.service';
import { TargetStore } from '../../core/target-store';
import { Dossier as DossierModel } from '../../core/models';

@Component({
  selector: 'app-dossier',
  imports: [RouterLink, DecimalPipe],
  template: `
    <h2>① Target dossier <span class="muted">— is this target worth pursuing?</span></h2>
    <p class="muted intro">
      Druggability snapshot from UniProt (function, structures) and ChEMBL (ligand depth,
      known drugs). Equivalent to <code class="mono">cad/target_report.py</code>.
    </p>

    @if (loading()) {
      <div class="card"><span class="spinner"></span> Querying UniProt + ChEMBL for <strong>{{ target() }}</strong>…</div>
    } @else if (error()) {
      <div class="card error">{{ error() }}</div>
    } @else if (data(); as d) {
      <div class="grid">
        <div class="card">
          <div class="card-head">
            <h3>{{ d.target.pref_name }}</h3>
            <span class="pill blue mono">{{ d.target.target_chembl_id }}</span>
          </div>
          <div class="muted">{{ d.target.target_type }} · {{ d.target.organism }}</div>
          @if (d.uniprot; as u) {
            <p class="fn">{{ u.function || 'No function annotation.' }}</p>
            <div class="kv">
              <div><span class="muted">UniProt</span>
                <a href="https://www.uniprot.org/uniprotkb/{{ u.accession }}" target="_blank" rel="noopener">{{ u.accession }}</a></div>
              <div><span class="muted">Length</span> {{ u.length }} aa</div>
            </div>
          }
        </div>

        <div class="card stat">
          <div class="big mono">{{ d.potentActivityCount | number }}</div>
          <div class="muted">potent ChEMBL activities</div>
        </div>
        <div class="card stat">
          <div class="big mono">{{ d.uniprot?.pdb_count ?? 0 }}</div>
          <div class="muted">experimental PDB structures</div>
          <div class="pill" [class.green]="(d.uniprot?.pdb_count ?? 0) > 0">
            docking feasible: {{ (d.uniprot?.pdb_count ?? 0) > 0 ? 'yes' : 'no public structure' }}
          </div>
        </div>
        <div class="card stat">
          <div class="big mono">{{ d.knownDrugs.length }}</div>
          <div class="muted">known mechanism drugs</div>
        </div>
      </div>

      <div class="card readout">
        <strong>Read-out:</strong> {{ d.readout }}
        <div class="actions">
          <a routerLink="/triage"><button class="primary">Triage ligands →</button></a>
          <a routerLink="/structure"><button>View structure →</button></a>
        </div>
      </div>

      @if (d.knownDrugs.length) {
        <div class="card">
          <h3>Known modulators <span class="muted">(repurposing / SAR start points)</span></h3>
          <table>
            <thead><tr><th>ChEMBL ID</th><th>Action</th><th>Mechanism</th></tr></thead>
            <tbody>
              @for (m of d.knownDrugs.slice(0, 12); track m.molecule_chembl_id) {
                <tr>
                  <td><a href="https://www.ebi.ac.uk/chembl/compound_report_card/{{ m.molecule_chembl_id }}/" target="_blank" rel="noopener" class="mono">{{ m.molecule_chembl_id }}</a></td>
                  <td>{{ m.action_type }}</td>
                  <td>{{ m.mechanism }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    .intro { max-width: 60ch; }
    .grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.9rem; margin-bottom: 0.9rem; }
    .grid .card:first-child { grid-row: span 1; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .card-head h3 { margin: 0; }
    .fn { font-size: 0.85rem; line-height: 1.45; max-height: 7.5em; overflow: auto; }
    .kv { display: flex; gap: 1.5rem; font-size: 0.85rem; margin-top: 0.4rem; }
    .stat { display: flex; flex-direction: column; gap: 0.25rem; justify-content: center; }
    .big { font-size: 1.9rem; font-weight: 700; color: var(--accent); }
    .readout { margin-bottom: 0.9rem; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.8rem; }
  `],
})
export class Dossier {
  private svc = inject(DossierService);
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly data = signal<DossierModel | null>(null);

  constructor() {
    effect(() => {
      const t = this.store.target();
      this.fetch(t);
    });
  }

  private async fetch(name: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.svc.build(name));
    } catch (e: any) {
      this.data.set(null);
      this.error.set(e?.message ?? 'Lookup failed.');
    } finally {
      this.loading.set(false);
    }
  }
}
