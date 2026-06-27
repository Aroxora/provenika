import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChemblTarget, MoleculeProps } from './models';
import { variantMatches, parseVariants } from './mutations';

const BASE = 'https://www.ebi.ac.uk/chembl/api/data';
const POTENCY_TYPES = new Set(['IC50', 'Ki', 'Kd', 'EC50']);

// ChEMBL activity-quality gate — mirrors virtual_triage.ACTIVITY_QUALITY_PARAMS so the browser ranks
// on the same clean, '='-relation, validity-checked, potency-ordered records as the CLI.
const QUALITY_PARAMS: Record<string, string> = {
  pchembl_value__isnull: 'false',
  standard_relation: '=',
  data_validity_comment__isnull: 'true',
  order_by: '-pchembl_value',
};

export interface ActiveAgg {
  pchembl: number;        // MEDIAN of qualifying measurements — the ranking value
  maxPchembl: number;     // best single measurement
  n: number;              // how many measurements backed the median
  type: string;           // measurement type (IC50/Ki/Kd/EC50)
  assayFormat: string | null;  // ChEMBL assay_type B/F/A
  variant: string | null;
  variantDataSeen: boolean;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Client for the public ChEMBL REST API (CORS-enabled, no key). */
@Injectable({ providedIn: 'root' })
export class ChemblService {
  private http = inject(HttpClient);

  async resolveTarget(name: string): Promise<ChemblTarget | null> {
    const data: any = await firstValueFrom(
      this.http.get(`${BASE}/target/search`, { params: { q: name, format: 'json', limit: 25 } }),
    );
    const targets: any[] = data?.targets ?? [];
    if (!targets.length) return null;
    targets.sort((a, b) => rank(b) - rank(a));
    const t = targets[0];
    return {
      target_chembl_id: t.target_chembl_id,
      pref_name: t.pref_name,
      target_type: t.target_type,
      organism: t.organism,
    };
  }

  /**
   * Quality-gated potency per molecule for a target, aggregated to a ROBUST MEDIAN (not the single
   * luckiest measurement), with measurement support and optional allele filtering — mirrors the CLI
   * (cad/virtual_triage.fetch_actives). Drops potential_duplicate rows; records assay format/variant.
   */
  async fetchActives(
    targetId: string,
    minPchembl: number,
    scan = 2000,
    variantFilter: Set<string> | null = null,
  ): Promise<Map<string, ActiveAgg>> {
    const vals = new Map<string, number[]>();
    const rep = new Map<string, { max: number; type: string; assayFormat: string | null; variant: string | null }>();
    let variantDataSeen = false;
    let offset = 0;
    const page = 1000;
    let fetched = 0;
    while (fetched < scan) {
      const data: any = await firstValueFrom(
        this.http.get(`${BASE}/activity`, {
          params: {
            ...QUALITY_PARAMS,
            target_chembl_id: targetId,
            format: 'json',
            limit: Math.min(page, scan - fetched),
            offset,
          },
        }),
      );
      const acts: any[] = data?.activities ?? [];
      if (!acts.length) break;
      let stop = false;
      for (const a of acts) {
        const pv = parseFloat(a.pchembl_value);
        if (isNaN(pv)) continue;
        if (pv < minPchembl) { stop = true; break; }   // records are descending → rest are below floor
        const mol = a.molecule_chembl_id;
        const stype = a.standard_type;
        if (!mol || !POTENCY_TYPES.has(stype)) continue;
        if (a.potential_duplicate === 1 || a.potential_duplicate === '1') continue;
        if (variantFilter) {
          const recVars = parseVariants(a.assay_variant_mutation || '');
          for (const v of variantFilter) if (recVars.has(v)) { variantDataSeen = true; break; }
          if (!variantMatches(variantFilter, a.assay_variant_mutation)) continue;
        }
        if (!vals.has(mol)) vals.set(mol, []);
        vals.get(mol)!.push(pv);
        const cur = rep.get(mol);
        if (!cur || pv > cur.max) {
          rep.set(mol, { max: pv, type: stype, assayFormat: a.assay_type ?? null, variant: a.assay_variant_mutation || null });
        }
      }
      fetched += acts.length;
      if (stop || !data?.page_meta?.next) break;
      offset += acts.length;
    }
    const out = new Map<string, ActiveAgg>();
    for (const [mol, list] of vals) {
      const r = rep.get(mol)!;
      out.set(mol, {
        pchembl: r2(median(list)), maxPchembl: r2(r.max), n: list.length,
        type: r.type, assayFormat: r.assayFormat, variant: r.variant, variantDataSeen,
      });
    }
    return out;
  }

  async fetchMoleculeProps(ids: string[]): Promise<Map<string, MoleculeProps>> {
    const out = new Map<string, MoleculeProps>();
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40);
      const data: any = await firstValueFrom(
        this.http.get(`${BASE}/molecule`, {
          params: { molecule_chembl_id__in: chunk.join(','), format: 'json', limit: chunk.length },
        }),
      );
      for (const m of data?.molecules ?? []) {
        const p = m.molecule_properties ?? {};
        const s = m.molecule_structures ?? {};
        out.set(m.molecule_chembl_id, {
          chembl_id: m.molecule_chembl_id,
          name: m.pref_name || m.molecule_chembl_id,
          max_phase: numOrNull(m.max_phase),
          dev_phase: devPhase(m.max_phase),
          mw: numOrNull(p.full_mwt),
          alogp: numOrNull(p.alogp),
          hbd: numOrNull(p.hbd),
          hba: numOrNull(p.hba),
          psa: numOrNull(p.psa),
          rtb: numOrNull(p.rtb),
          ro5_violations: numOrNull(p.num_ro5_violations),
          qed: numOrNull(p.qed_weighted),
          smiles: s.canonical_smiles ?? null,
        });
      }
    }
    return out;
  }

  /** Known mechanism-of-action drugs for a target. */
  async fetchMechanisms(targetId: string): Promise<{ molecule_chembl_id: string; action_type: string; mechanism: string }[]> {
    const data: any = await firstValueFrom(
      this.http.get(`${BASE}/mechanism`, { params: { target_chembl_id: targetId, format: 'json', limit: 50 } }),
    );
    const seen = new Set<string>();
    const out: any[] = [];
    for (const m of data?.mechanisms ?? []) {
      const id = m.molecule_chembl_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push({ molecule_chembl_id: id, action_type: m.action_type, mechanism: m.mechanism_of_action });
      }
    }
    return out;
  }

  async countPotentActivities(targetId: string): Promise<number> {
    const data: any = await firstValueFrom(
      this.http.get(`${BASE}/activity`, {
        params: { target_chembl_id: targetId, pchembl_value__isnull: 'false', format: 'json', limit: 1 },
      }),
    );
    return data?.page_meta?.total_count ?? 0;
  }
}

function rank(t: any): number {
  return (t.target_type === 'SINGLE PROTEIN' ? 2 : 0) + (t.organism === 'Homo sapiens' ? 1 : 0);
}
function numOrNull(v: any): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
export function devPhase(maxPhase: any): string {
  const mp = parseFloat(maxPhase);
  if (isNaN(mp)) return 'research/preclinical';
  if (mp >= 4) return 'approved drug';
  if (mp >= 1) return `clinical (phase ${Math.trunc(mp)})`;
  return 'research/preclinical';
}
