import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UniprotSummary } from './models';

const BASE = 'https://rest.uniprot.org/uniprotkb/search';

/** Client for the public UniProt REST API (CORS-enabled, no key). */
@Injectable({ providedIn: 'root' })
export class UniprotService {
  private http = inject(HttpClient);

  async summary(name: string): Promise<UniprotSummary | null> {
    const query = `(gene:${name} OR protein_name:${name}) AND organism_id:9606 AND reviewed:true`;
    const data: any = await firstValueFrom(
      this.http.get(BASE, {
        params: { query, fields: 'accession,protein_name,length,cc_function,xref_pdb', size: 1, format: 'json' },
      }),
    );
    const e = data?.results?.[0];
    if (!e) return null;

    const name_val =
      e.proteinDescription?.recommendedName?.fullName?.value ?? e.primaryAccession;
    let func = '';
    for (const c of e.comments ?? []) {
      if (c.commentType === 'FUNCTION' && c.texts?.length) {
        func = c.texts[0].value;
        break;
      }
    }
    const pdbs = (e.uniProtKBCrossReferences ?? [])
      .filter((x: any) => x.database === 'PDB')
      .map((x: any) => {
        const props: Record<string, string> = {};
        for (const p of x.properties ?? []) props[p.key] = p.value;
        const res = props['Resolution'] ?? '';
        const resNum = res && /^\d/.test(res) ? parseFloat(res) : 9999;
        return { id: x.id, method: props['Method'] ?? '', resolution: res, res_num: isNaN(resNum) ? 9999 : resNum };
      });

    return {
      accession: e.primaryAccession,
      name: name_val,
      length: e.sequence?.length ?? null,
      function: func,
      pdb_count: pdbs.length,
      pdbs: pdbs.sort((a: any, b: any) => bestFirst(a) - bestFirst(b)),
    };
  }
}

function bestFirst(p: { method: string; res_num: number }): number {
  const prefer = p.method === 'X-ray' || p.method === 'EM' ? 0 : 1;
  return prefer * 100000 + p.res_num;
}
