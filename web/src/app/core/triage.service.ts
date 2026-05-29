import { Injectable, inject } from '@angular/core';
import { ChemblService } from './chembl.service';
import { TriageHit } from './models';

/** Ligand-based virtual triage — port of cad/virtual_triage.py to the browser. */
@Injectable({ providedIn: 'root' })
export class TriageService {
  private chembl = inject(ChemblService);

  async run(opts: {
    target: string;
    minPchembl?: number;
    limit?: number;
    scan?: number;
    excludeApproved?: boolean;
  }): Promise<{ targetId: string; targetName: string; hits: TriageHit[] }> {
    const minPchembl = opts.minPchembl ?? 7;
    const limit = opts.limit ?? 25;

    const target = await this.chembl.resolveTarget(opts.target);
    if (!target) throw new Error(`No ChEMBL target found for "${opts.target}".`);

    const actives = await this.chembl.fetchActives(target.target_chembl_id, minPchembl, opts.scan ?? 2500);
    if (!actives.size) throw new Error('No potent ligands met the threshold (try lowering min pChEMBL).');

    const topIds = [...actives.keys()]
      .sort((a, b) => actives.get(b)!.pchembl - actives.get(a)!.pchembl)
      .slice(0, Math.max(limit * 4, limit));
    const props = await this.chembl.fetchMoleculeProps(topIds);

    let hits: TriageHit[] = [];
    for (const id of topIds) {
      const p = props.get(id);
      if (!p) continue;
      const a = actives.get(id)!;
      const dl = drugLikeness(p.qed, p.ro5_violations);
      hits.push({
        ...p,
        best_pchembl: a.pchembl,
        assay_type: a.type,
        drug_likeness: dl,
        score: composite(a.pchembl, dl),
        chembl_url: `https://www.ebi.ac.uk/chembl/compound_report_card/${id}/`,
      });
    }
    if (opts.excludeApproved) hits = hits.filter((h) => (h.max_phase ?? 0) < 4);
    hits.sort((a, b) => b.score - a.score);
    return { targetId: target.target_chembl_id, targetName: target.pref_name, hits: hits.slice(0, limit) };
  }

  toCsv(hits: TriageHit[]): string {
    const cols = ['chembl_id', 'name', 'dev_phase', 'best_pchembl', 'assay_type', 'score',
      'drug_likeness', 'qed', 'ro5_violations', 'mw', 'alogp', 'hbd', 'hba', 'psa', 'smiles', 'chembl_url'];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = hits.map((h) => cols.map((c) => esc((h as any)[c])).join(','));
    return [cols.join(','), ...rows].join('\n');
  }
}

export function drugLikeness(qed: number | null, ro5: number | null): number {
  const qedPart = qed ?? 0.5;
  const ro5Part = ro5 == null || ro5 === 0 ? 1 : Math.max(0, 1 - 0.34 * ro5);
  return round(0.6 * qedPart + 0.4 * ro5Part, 3);
}
function composite(pchembl: number, dl: number): number {
  const potency = Math.min(pchembl, 11) / 11;
  return round(0.6 * potency + 0.4 * dl, 4);
}
function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
