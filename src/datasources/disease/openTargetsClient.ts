/**
 * Open Targets Platform client (keyless, CORS-enabled GraphQL).
 *
 * Disease → association-scored druggable targets — the one entry point the gene-first CLI
 * one-liners lacked. The same public API the web app uses (core/opentargets.service.ts); no key.
 * Association scores are Open Targets' own integrated evidence scores, not a claim of efficacy.
 */

import { BaseClient, type DataSourceConfig } from '../base/baseClient.js';

export interface DiseaseTarget {
  readonly symbol: string;
  readonly name: string;
  readonly score: number; // Open Targets overall association score, 0–1
  readonly tractableModalities: string[]; // human-readable modalities with ≥1 positive bucket
}

// Open Targets tractability modality codes → human-readable.
const MODALITY: Record<string, string> = {
  SM: 'small-molecule',
  AB: 'antibody',
  PR: 'PROTAC',
  OC: 'other-clinical',
};

export interface DiseaseTargets {
  readonly diseaseId: string; // EFO/MONDO id
  readonly diseaseName: string;
  readonly count: number; // total associated targets (not just the returned page)
  readonly targets: DiseaseTarget[];
}

export interface OpenTargetsConfig extends Partial<DataSourceConfig> {}

export class OpenTargetsClient extends BaseClient {
  constructor(config: OpenTargetsConfig = {}) {
    super(
      {
        baseUrl: 'https://api.platform.opentargets.org/api/v4',
        cacheTtlMs: 3600000, // 1 hour — association scores are stable
        ...config,
      },
      'Open Targets',
    );
  }

  private async gql<T>(query: string): Promise<T | null> {
    const res = await this.request<{ data?: T }>('/graphql', {
      method: 'POST',
      body: { query },
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data?.data ?? null;
  }

  /** Resolve a disease name to its top association-scored targets. Returns null if unresolved. */
  async targetsForDisease(name: string, size = 25): Promise<DiseaseTargets | null> {
    const esc = name.replace(/"/g, '\\"');
    const sd = await this.gql<{ search: { hits: { id: string; name: string }[] } }>(
      `{ search(queryString:"${esc}", entityNames:["disease"]) { hits { id name } } }`,
    );
    const hit = sd?.search?.hits?.[0];
    if (!hit) return null;

    const data = await this.gql<{
      disease: { name: string; associatedTargets: { count: number; rows: Array<{ target: { approvedSymbol: string; approvedName: string; tractability?: Array<{ modality: string; value: boolean }> }; score: number }> } };
    }>(
      `{ disease(efoId:"${hit.id}") { name associatedTargets(page:{index:0,size:${size}}) { count rows { target { approvedSymbol approvedName tractability { modality value } } score } } } }`,
    );
    const at = data?.disease?.associatedTargets;
    return {
      diseaseId: hit.id,
      diseaseName: data?.disease?.name ?? hit.name,
      count: at?.count ?? 0,
      targets: (at?.rows ?? []).map((r) => ({
        symbol: r.target.approvedSymbol,
        name: r.target.approvedName,
        score: r.score,
        // Distinct modalities with at least one positive tractability bucket (drug-able by that modality).
        tractableModalities: [
          ...new Set(
            (r.target.tractability ?? [])
              .filter((t) => t.value)
              .map((t) => MODALITY[t.modality] ?? t.modality),
          ),
        ],
      })),
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const r = await this.gql<{ search: { hits: { id: string }[] } }>(
        `{ search(queryString:"EGFR", entityNames:["target"]) { hits { id } } }`,
      );
      return Array.isArray(r?.search?.hits);
    } catch {
      return false;
    }
  }
}

export function createOpenTargetsClient(): OpenTargetsClient {
  return new OpenTargetsClient();
}
