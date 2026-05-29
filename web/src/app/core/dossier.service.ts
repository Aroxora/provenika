import { Injectable, inject } from '@angular/core';
import { ChemblService } from './chembl.service';
import { UniprotService } from './uniprot.service';
import { Dossier } from './models';

/** Target dossier — port of cad/target_report.py to the browser. */
@Injectable({ providedIn: 'root' })
export class DossierService {
  private chembl = inject(ChemblService);
  private uniprot = inject(UniprotService);

  async build(name: string): Promise<Dossier> {
    const target = await this.chembl.resolveTarget(name);
    if (!target) throw new Error(`No ChEMBL target found for "${name}".`);

    const [count, drugs, uni] = await Promise.all([
      this.chembl.countPotentActivities(target.target_chembl_id),
      this.chembl.fetchMechanisms(target.target_chembl_id),
      this.uniprot.summary(name),
    ]);

    // Enrich the known modulators with human-readable drug names + development phase.
    const topDrugs = drugs.slice(0, 12);
    let enriched = topDrugs;
    try {
      const props = await this.chembl.fetchMoleculeProps(topDrugs.map((d) => d.molecule_chembl_id));
      enriched = topDrugs.map((d) => {
        const p = props.get(d.molecule_chembl_id);
        return { ...d, name: p?.name, devPhase: p?.dev_phase };
      });
    } catch {
      /* names are supplementary — fall back to IDs */
    }

    const bits: string[] = [];
    bits.push(count > 500 ? 'rich ligand data' : count > 50 ? 'moderate ligand data' : 'sparse ligand data');
    if (uni?.pdb_count) bits.push('structure available for docking');
    if (drugs.length) bits.push(`${drugs.length} known modulator(s) — repurposing/SAR start points`);

    return {
      target,
      uniprot: uni,
      potentActivityCount: count,
      knownDrugs: enriched,
      readout: bits.join('; ') + '.',
    };
  }
}
