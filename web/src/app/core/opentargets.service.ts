import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const BASE = 'https://api.platform.opentargets.org/api/v4/graphql';

export interface DiseaseHit { id: string; name: string; }
export interface AssociatedTarget { symbol: string; name: string; score: number; }
export interface DiseaseTargets {
  disease: DiseaseHit;
  count: number;
  targets: AssociatedTarget[];
}
export interface Tractability { modality: string; top: string; tier: 'approved' | 'clinical' | 'discovery'; }

const MODALITY_NAMES: Record<string, string> = { SM: 'Small molecule', AB: 'Antibody', PR: 'PROTAC / degrader', OC: 'Other clinical' };
const HEADLINE = ['Approved Drug', 'Advanced Clinical', 'Phase 1 Clinical'];

/** Open Targets Platform GraphQL (CORS-enabled, no key) — disease → druggable targets. */
@Injectable({ providedIn: 'root' })
export class OpenTargetsService {
  private http = inject(HttpClient);

  private async gql<T>(query: string): Promise<T> {
    const res: any = await firstValueFrom(this.http.post(BASE, { query }));
    return res?.data as T;
  }

  async searchDiseases(q: string): Promise<DiseaseHit[]> {
    const escaped = q.replace(/"/g, '\\"');
    const data = await this.gql<{ search: { hits: DiseaseHit[] } }>(
      `{ search(queryString:"${escaped}", entityNames:["disease"]) { hits { id name } } }`,
    );
    return data?.search?.hits ?? [];
  }

  /** Resolve a disease name to its top association-scored targets. */
  async targetsForDisease(q: string, size = 25): Promise<DiseaseTargets | null> {
    const hits = await this.searchDiseases(q);
    if (!hits.length) return null;
    const d = hits[0];
    const data = await this.gql<{ disease: { associatedTargets: { count: number; rows: any[] } } }>(
      `{ disease(efoId:"${d.id}") { associatedTargets(page:{index:0,size:${size}}) { count rows { target { approvedSymbol approvedName } score } } } }`,
    );
    const at = data?.disease?.associatedTargets;
    return {
      disease: d,
      count: at?.count ?? 0,
      targets: (at?.rows ?? []).map((r) => ({
        symbol: r.target.approvedSymbol,
        name: r.target.approvedName,
        score: r.score,
      })),
    };
  }

  /** Druggability tractability by modality (highest achieved bucket) for a gene symbol. */
  async tractability(symbol: string): Promise<Tractability[]> {
    const esc = symbol.replace(/"/g, '\\"');
    const sd = await this.gql<{ search: { hits: { id: string }[] } }>(
      `{ search(queryString:"${esc}", entityNames:["target"]) { hits { id } } }`,
    );
    const id = sd?.search?.hits?.[0]?.id;
    if (!id) return [];
    const data = await this.gql<{ target: { tractability: { label: string; modality: string; value: boolean }[] } }>(
      `{ target(ensemblId:"${id}") { tractability { label modality value } } }`,
    );
    const rows = (data?.target?.tractability ?? []).filter((r) => r.value);
    const out: Tractability[] = [];
    for (const code of ['SM', 'AB', 'PR', 'OC']) {
      const labels = rows.filter((r) => r.modality === code).map((r) => r.label);
      if (!labels.length) continue;
      const top = HEADLINE.find((h) => labels.includes(h)) ?? labels[0];
      const tier = top === 'Approved Drug' ? 'approved' : HEADLINE.includes(top) ? 'clinical' : 'discovery';
      out.push({ modality: MODALITY_NAMES[code] ?? code, top, tier });
    }
    return out;
  }
}
