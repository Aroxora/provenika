import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const BASE = 'https://reactome.org/ContentService';

export interface Pathway {
  stId: string;
  name: string;
  species: string;
  isDisease: boolean;
  summary: string;
  url: string;
  diagramUrl: string;
}

/** Client for the Reactome Content Service (CORS-enabled, no key) — pathways. */
@Injectable({ providedIn: 'root' })
export class ReactomeService {
  private http = inject(HttpClient);

  async pathways(query: string): Promise<Pathway[]> {
    const data: any = await firstValueFrom(
      this.http.get(`${BASE}/search/query`, {
        params: { query, species: 'Homo sapiens', types: 'Pathway', cluster: 'true' },
      }),
    );
    const groups: any[] = data?.results ?? [];
    const entries = groups.find((g) => g.typeName === 'Pathway')?.entries ?? [];
    return entries.map((e: any) => ({
      stId: e.stId,
      name: strip(e.name),
      species: (e.species ?? []).join(', '),
      isDisease: !!e.isDisease,
      summary: strip(e.summation ?? ''),
      url: `https://reactome.org/content/detail/${e.stId}`,
      diagramUrl: `https://reactome.org/PathwayBrowser/#/${e.stId}`,
    }));
  }
}

function strip(s: string): string {
  return (s ?? '').replace(/<[^>]+>/g, '');
}
