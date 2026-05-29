import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChemblTarget, MoleculeProps } from './models';

const BASE = 'https://www.ebi.ac.uk/chembl/api/data';
const POTENCY_TYPES = new Set(['IC50', 'Ki', 'Kd', 'EC50']);

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

  /** Best (highest) pChEMBL potency activity per molecule for a target. */
  async fetchActives(
    targetId: string,
    minPchembl: number,
    scan = 2000,
  ): Promise<Map<string, { pchembl: number; type: string }>> {
    const best = new Map<string, { pchembl: number; type: string }>();
    let offset = 0;
    const page = 1000;
    let fetched = 0;
    while (fetched < scan) {
      const data: any = await firstValueFrom(
        this.http.get(`${BASE}/activity`, {
          params: {
            target_chembl_id: targetId,
            pchembl_value__isnull: 'false',
            format: 'json',
            limit: Math.min(page, scan - fetched),
            offset,
          },
        }),
      );
      const acts: any[] = data?.activities ?? [];
      if (!acts.length) break;
      for (const a of acts) {
        const mol = a.molecule_chembl_id;
        const pv = parseFloat(a.pchembl_value);
        const stype = a.standard_type;
        if (!mol || isNaN(pv) || !POTENCY_TYPES.has(stype) || pv < minPchembl) continue;
        const cur = best.get(mol);
        if (!cur || pv > cur.pchembl) best.set(mol, { pchembl: pv, type: stype });
      }
      fetched += acts.length;
      if (!data?.page_meta?.next) break;
      offset += acts.length;
    }
    return best;
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
