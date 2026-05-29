import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Trial } from './models';

const BASE = 'https://clinicaltrials.gov/api/v2/studies';

/** Client for the public ClinicalTrials.gov v2 API (CORS-enabled, no key). */
@Injectable({ providedIn: 'root' })
export class TrialsService {
  private http = inject(HttpClient);

  /** Total number of registered studies matching a term (accurate count). */
  async count(term: string): Promise<number> {
    const data: any = await firstValueFrom(
      this.http.get(BASE, { params: { 'query.term': term, countTotal: 'true', pageSize: 1, format: 'json' } }),
    );
    return data?.totalCount ?? 0;
  }

  async search(term: string, pageSize = 25): Promise<Trial[]> {
    const data: any = await firstValueFrom(
      this.http.get(BASE, { params: { 'query.term': term, pageSize, format: 'json' } }),
    );
    return (data?.studies ?? []).map((s: any) => {
      const ps = s.protocolSection ?? {};
      const id = ps.identificationModule ?? {};
      const status = ps.statusModule ?? {};
      const design = ps.designModule ?? {};
      const cond = ps.conditionsModule ?? {};
      const nctId = id.nctId ?? '';
      return {
        nctId,
        title: id.briefTitle ?? '(untitled)',
        status: status.overallStatus ?? '',
        phase: (design.phases ?? []).join(', ') || 'N/A',
        conditions: (cond.conditions ?? []).slice(0, 3).join(', '),
        url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : '',
      } as Trial;
    });
  }
}
