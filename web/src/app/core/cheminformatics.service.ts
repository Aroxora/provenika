import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ChemInfo {
  painsAlerts: number; pains: string[];
  brenkAlerts: number; brenk: string[];
  scaffold: string; eganOk: boolean; fractionCsp3: number; clean: boolean;
  le?: number; lle?: number; cluster?: number;
}

/**
 * Loads precomputed RDKit cheminformatics (PAINS/Brenk/scaffold/Egan) for a target.
 * Generated server-side by cad/precompute_site_data.py since RDKit can't run in-browser.
 * Returns null when no precomputed file exists for the target.
 */
@Injectable({ providedIn: 'root' })
export class CheminformaticsService {
  private http = inject(HttpClient);
  private cache = new Map<string, Map<string, ChemInfo> | null>();
  private counts = new Map<string, number>();

  static slug(name: string): string {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  /** Number of distinct chemotype clusters for the target (0 if not precomputed). */
  clusterCount(name: string): number {
    return this.counts.get(CheminformaticsService.slug(name)) ?? 0;
  }

  async forTarget(name: string): Promise<Map<string, ChemInfo> | null> {
    const slug = CheminformaticsService.slug(name);
    if (this.cache.has(slug)) return this.cache.get(slug)!;
    try {
      const d: any = await firstValueFrom(this.http.get(`data/cheminformatics/${slug}.json`));
      const m = new Map<string, ChemInfo>(Object.entries(d?.byChembl ?? {}) as [string, ChemInfo][]);
      this.cache.set(slug, m);
      if (typeof d?.clusterCount === 'number') this.counts.set(slug, d.clusterCount);
      return m;
    } catch {
      this.cache.set(slug, null); // 404 / not precomputed
      return null;
    }
  }
}
