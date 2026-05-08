/**
 * ChEMBL API Client
 *
 * Provides access to drug and bioactivity data via ChEMBL.
 * API Documentation: https://www.ebi.ac.uk/chembl/api/data/docs
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { Drug, DrugType, DrugStatus, ChemicalStructure } from '../../domain/drug/drug.js';
import type { DrugTarget } from '../../domain/drug/target.js';

/**
 * ChEMBL client configuration
 */
export interface ChEMBLConfig extends Partial<DataSourceConfig> {}

/**
 * ChEMBL molecule data
 */
interface ChEMBLMolecule {
  molecule_chembl_id: string;
  pref_name?: string;
  molecule_type?: string;
  first_approval?: number;
  max_phase?: number;
  therapeutic_flag?: boolean;
  molecule_properties?: {
    full_mwt?: number;
    alogp?: number;
    hba?: number;
    hbd?: number;
    psa?: number;
    rtb?: number;
    ro3_pass?: string;
    num_ro5_violations?: number;
    molecular_species?: string;
    full_molformula?: string;
  };
  molecule_structures?: {
    canonical_smiles?: string;
    standard_inchi?: string;
    standard_inchi_key?: string;
  };
  molecule_synonyms?: Array<{
    molecule_synonym: string;
    syn_type: string;
  }>;
  indication_class?: string;
  atc_classifications?: string[];
}

/**
 * ChEMBL activity data
 */
interface ChEMBLActivity {
  activity_id: number;
  molecule_chembl_id: string;
  target_chembl_id: string;
  target_pref_name?: string;
  target_organism?: string;
  target_type?: string;
  assay_chembl_id: string;
  assay_type?: string;
  standard_type?: string;
  standard_relation?: string;
  standard_value?: number;
  standard_units?: string;
  pchembl_value?: number;
}

/**
 * ChEMBL target data
 */
interface ChEMBLTarget {
  target_chembl_id: string;
  pref_name: string;
  target_type: string;
  organism: string;
  target_components?: Array<{
    accession?: string;
    component_id: number;
    component_type: string;
    component_description?: string;
  }>;
}

/**
 * ChEMBL API response wrapper
 */
interface ChEMBLResponse<T> {
  molecules?: T[];
  activities?: T[];
  targets?: T[];
  page_meta?: {
    limit: number;
    offset: number;
    total_count: number;
    next?: string;
    previous?: string;
  };
}

/**
 * ChEMBL API client
 */
export class ChEMBLClient extends BaseClient {
  constructor(config: ChEMBLConfig = {}) {
    super(
      {
        baseUrl: 'https://www.ebi.ac.uk/chembl/api/data',
        rateLimitPerSecond: 5,
        cacheTtlMs: 600000, // 10 minutes
        ...config,
      },
      'ChEMBL'
    );
  }

  /**
   * Search for molecules/drugs
   */
  async searchMolecules(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Drug>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const response = await this.request<ChEMBLResponse<ChEMBLMolecule>>('/molecule/search.json', {
      params: {
        q: query,
        limit: String(limit),
        offset: String(offset),
      },
    });

    const molecules = response.data.molecules ?? [];
    const total = response.data.page_meta?.total_count ?? molecules.length;

    const drugs = molecules.map(m => this.mapMoleculeToDrug(m));

    return createPaginatedResponse(drugs, total, offset, limit);
  }

  /**
   * Get molecule by ChEMBL ID
   */
  async getMolecule(chemblId: string): Promise<Drug | null> {
    try {
      const response = await this.request<ChEMBLMolecule>(`/molecule/${chemblId}.json`);
      return this.mapMoleculeToDrug(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Get approved drugs
   */
  async getApprovedDrugs(
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Drug>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const response = await this.request<ChEMBLResponse<ChEMBLMolecule>>('/molecule.json', {
      params: {
        max_phase: '4',
        limit: String(limit),
        offset: String(offset),
      },
    });

    const molecules = response.data.molecules ?? [];
    const total = response.data.page_meta?.total_count ?? molecules.length;

    const drugs = molecules.map(m => this.mapMoleculeToDrug(m));

    return createPaginatedResponse(drugs, total, offset, limit);
  }

  /**
   * Get bioactivities for a molecule
   */
  async getMoleculeActivities(
    chemblId: string,
    options: { limit?: number } = {}
  ): Promise<ChEMBLActivity[]> {
    const limit = options.limit ?? 100;

    const response = await this.request<ChEMBLResponse<ChEMBLActivity>>('/activity.json', {
      params: {
        molecule_chembl_id: chemblId,
        limit: String(limit),
      },
    });

    return response.data.activities ?? [];
  }

  /**
   * Get target by ChEMBL ID
   */
  async getTarget(targetChemblId: string): Promise<DrugTarget | null> {
    try {
      const response = await this.request<ChEMBLTarget>(`/target/${targetChemblId}.json`);
      return this.mapChEMBLTarget(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Search for targets
   */
  async searchTargets(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<DrugTarget>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const response = await this.request<ChEMBLResponse<ChEMBLTarget>>('/target/search.json', {
      params: {
        q: query,
        limit: String(limit),
        offset: String(offset),
      },
    });

    const targets = response.data.targets ?? [];
    const total = response.data.page_meta?.total_count ?? targets.length;

    const drugTargets = targets.map(t => this.mapChEMBLTarget(t));

    return createPaginatedResponse(drugTargets, total, offset, limit);
  }

  /**
   * Get drugs targeting a specific protein (by UniProt ID)
   */
  async getDrugsForTarget(
    uniprotId: string,
    options: { limit?: number } = {}
  ): Promise<Drug[]> {
    const limit = options.limit ?? 50;

    // First, find the target ChEMBL ID
    const targetResponse = await this.request<ChEMBLResponse<ChEMBLTarget>>('/target.json', {
      params: {
        target_components__accession: uniprotId,
        limit: '1',
      },
    });

    const targets = targetResponse.data.targets ?? [];
    if (targets.length === 0) return [];

    const targetChemblId = targets[0]?.target_chembl_id;
    if (!targetChemblId) return [];

    // Get activities for this target
    const activityResponse = await this.request<ChEMBLResponse<ChEMBLActivity>>('/activity.json', {
      params: {
        target_chembl_id: targetChemblId,
        pchembl_value__gte: '5', // Filter for reasonable activity
        limit: String(limit),
      },
    });

    const activities = activityResponse.data.activities ?? [];
    const uniqueMoleculeIds = [...new Set(activities.map(a => a.molecule_chembl_id))];

    // Get molecule details
    const drugs: Drug[] = [];
    for (const moleculeId of uniqueMoleculeIds.slice(0, limit)) {
      const drug = await this.getMolecule(moleculeId);
      if (drug) drugs.push(drug);
    }

    return drugs;
  }

  /**
   * Search for cancer drugs
   */
  async searchCancerDrugs(
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Drug>> {
    return this.searchMolecules('cancer OR tumor OR neoplasm OR oncology', options);
  }

  /**
   * Get similar molecules by structure
   */
  async findSimilarMolecules(
    smiles: string,
    similarity: number = 0.7,
    options: { limit?: number } = {}
  ): Promise<Drug[]> {
    const limit = options.limit ?? 20;

    const response = await this.request<ChEMBLResponse<ChEMBLMolecule>>('/similarity.json', {
      params: {
        smiles,
        similarity: String(Math.round(similarity * 100)),
        limit: String(limit),
      },
    });

    const molecules = response.data.molecules ?? [];
    return molecules.map(m => this.mapMoleculeToDrug(m));
  }

  /**
   * Map ChEMBL molecule to Drug domain model
   */
  private mapMoleculeToDrug(mol: ChEMBLMolecule): Drug {
    const structure: ChemicalStructure | undefined = mol.molecule_structures ? {
      smiles: mol.molecule_structures.canonical_smiles,
      inchi: mol.molecule_structures.standard_inchi,
      inchiKey: mol.molecule_structures.standard_inchi_key,
      molecularFormula: mol.molecule_properties?.full_molformula,
      molecularWeight: mol.molecule_properties?.full_mwt,
    } : undefined;

    const synonyms = mol.molecule_synonyms
      ?.filter(s => s.syn_type === 'TRADE_NAME' || s.syn_type === 'INN')
      .map(s => s.molecule_synonym) ?? [];

    return {
      id: mol.molecule_chembl_id,
      name: mol.pref_name ?? mol.molecule_chembl_id,
      synonyms,
      type: this.mapMoleculeType(mol.molecule_type),
      status: this.mapDrugStatus(mol.max_phase),
      structure,
      drugLikeness: mol.molecule_properties ? {
        lipinskiViolations: mol.molecule_properties.num_ro5_violations,
        logP: mol.molecule_properties.alogp,
        hbondDonors: mol.molecule_properties.hbd,
        hbondAcceptors: mol.molecule_properties.hba,
        polarSurfaceArea: mol.molecule_properties.psa,
        rotableBonds: mol.molecule_properties.rtb,
      } : undefined,
      references: [{
        database: 'ChEMBL',
        id: mol.molecule_chembl_id,
        url: `https://www.ebi.ac.uk/chembl/compound_report_card/${mol.molecule_chembl_id}`,
      }],
    };
  }

  /**
   * Map ChEMBL target to DrugTarget domain model
   */
  private mapChEMBLTarget(target: ChEMBLTarget): DrugTarget {
    const uniprotId = target.target_components?.find(c => c.accession)?.accession;

    return {
      id: target.target_chembl_id,
      name: target.pref_name,
      geneSymbol: '', // Would need additional lookup
      uniprotId,
      targetType: this.mapTargetType(target.target_type),
      cancerRelevance: {
        isOncogene: false,
        isTumorSuppressor: false,
        cancerTypes: [],
      },
    };
  }

  /**
   * Map molecule type
   */
  private mapMoleculeType(type?: string): DrugType {
    if (!type) return 'small_molecule';

    const lower = type.toLowerCase();
    if (lower.includes('antibody')) return 'antibody';
    if (lower.includes('protein') || lower.includes('peptide')) return 'biologic';
    return 'small_molecule';
  }

  /**
   * Map max phase to drug status
   */
  private mapDrugStatus(maxPhase?: number): DrugStatus {
    switch (maxPhase) {
      case 4: return 'approved';
      case 3:
      case 2:
      case 1: return 'investigational';
      default: return 'experimental';
    }
  }

  /**
   * Map target type
   */
  private mapTargetType(type: string): 'protein' | 'enzyme' | 'receptor' | 'ion_channel' | 'transporter' | 'kinase' | 'other' {
    const lower = type.toLowerCase();
    if (lower.includes('enzyme')) return 'enzyme';
    if (lower.includes('receptor')) return 'receptor';
    if (lower.includes('ion channel')) return 'ion_channel';
    if (lower.includes('transporter')) return 'transporter';
    if (lower.includes('kinase')) return 'kinase';
    if (lower.includes('protein')) return 'protein';
    return 'other';
  }

  /**
   * Test connection to ChEMBL
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/status.json');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a ChEMBL client
 */
export function createChEMBLClient(): ChEMBLClient {
  return new ChEMBLClient();
}
