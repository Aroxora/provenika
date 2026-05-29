import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

export interface Article {
  id: string;
  source: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  citedBy: number;
  doi: string;
  url: string;
}

/** Client for Europe PMC (CORS-enabled, no key) — literature OSINT. */
@Injectable({ providedIn: 'root' })
export class EuropePmcService {
  private http = inject(HttpClient);

  async search(term: string, sort: 'recent' | 'cited' = 'recent', pageSize = 20): Promise<Article[]> {
    const sortParam = sort === 'cited' ? 'CITED desc' : 'P_PDATE_D desc';
    const data: any = await firstValueFrom(
      this.http.get(BASE, {
        params: { query: term, format: 'json', pageSize, sort: sortParam, resultType: 'lite' },
      }),
    );
    const results: any[] = data?.resultList?.result ?? [];
    return results.map((r) => {
      const source = r.source ?? 'MED';
      const id = r.id ?? r.pmid ?? '';
      return {
        id,
        source,
        title: stripTags(r.title ?? '(untitled)'),
        authors: r.authorString ?? '',
        journal: r.journalTitle ?? r.bookOrReportDetails?.publisher ?? '',
        year: r.pubYear ?? '',
        citedBy: r.citedByCount ?? 0,
        doi: r.doi ?? '',
        url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${source}/${id}`,
      } as Article;
    });
  }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
