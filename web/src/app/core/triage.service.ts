import { Injectable, inject } from '@angular/core';
import { ChemblService } from './chembl.service';
import { TriageHit } from './models';
import { parseVariants, stripVariants } from './mutations';

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
  }): Promise<{ targetId: string; targetName: string; hits: TriageHit[]; variantWarning?: string }> {
    const minPchembl = opts.minPchembl ?? 7;
    const limit = opts.limit ?? 25;

    // Allele-specific query ("KRAS G12C"): resolve the bare gene, keep only matching-variant records.
    const variants = parseVariants(opts.target);
    const resolveName = variants.size ? stripVariants(opts.target) : opts.target;

    const target = await this.chembl.resolveTarget(resolveName);
    if (!target) throw new Error(`No ChEMBL target found for "${resolveName}".`);

    const actives = await this.chembl.fetchActives(
      target.target_chembl_id, minPchembl, opts.scan ?? 2500, variants.size ? variants : null,
    );

    // Honest about allele specificity: a mutation with no matching ChEMBL records isn't silently
    // backfilled with wild-type data.
    let variantWarning: string | undefined;
    if (variants.size && (!actives.size || ![...actives.values()].some((a) => a.variantDataSeen))) {
      const allele = [...variants].sort().join(', ');
      variantWarning = `No ${allele}-specific assay data in ChEMBL for ${target.pref_name} — results are NOT for the requested allele.`;
      if (!actives.size) throw new Error(variantWarning);
    }
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
        pchembl_median: a.pchembl,
        best_pchembl: a.maxPchembl,
        n_measurements: a.n,
        potency_suspect: a.maxPchembl >= 10 && a.n < 2,
        measurement_type: a.type,
        assay_format: a.assayFormat,
        variant: a.variant,
        drug_likeness: dl,
        score: composite(a.pchembl, dl),   // rank on the robust median, not the single best value
        chembl_url: `https://www.ebi.ac.uk/chembl/compound_report_card/${id}/`,
      });
    }
    if (opts.excludeApproved) hits = hits.filter((h) => (h.max_phase ?? 0) < 4);
    hits.sort((a, b) => b.score - a.score);
    return {
      targetId: target.target_chembl_id, targetName: target.pref_name,
      hits: hits.slice(0, limit), variantWarning,
    };
  }

  toCsv(hits: TriageHit[]): string {
    const cols = ['chembl_id', 'name', 'dev_phase', 'pchembl_median', 'best_pchembl', 'n_measurements',
      'potency_suspect', 'measurement_type', 'assay_format', 'variant', 'score',
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
