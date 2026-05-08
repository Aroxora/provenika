/**
 * RCSB PDB API Client
 *
 * Provides access to protein structure data via RCSB Protein Data Bank.
 * API Documentation: https://data.rcsb.org/
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { ProteinStructure, BindingSite, StructureLigand } from '../../domain/core/protein.js';

/**
 * PDB client configuration
 */
export interface PDBConfig extends Partial<DataSourceConfig> {}

/**
 * PDB entry structure
 */
interface PDBEntry {
  rcsb_id: string;
  struct?: {
    title?: string;
    pdbx_descriptor?: string;
  };
  exptl?: Array<{
    method: string;
  }>;
  rcsb_entry_info?: {
    resolution_combined?: number[];
    deposited_atom_count?: number;
    polymer_entity_count?: number;
    nonpolymer_entity_count?: number;
  };
  rcsb_accession_info?: {
    deposit_date?: string;
    initial_release_date?: string;
  };
  polymer_entities?: PDBPolymerEntity[];
  nonpolymer_entities?: PDBNonpolymerEntity[];
}

interface PDBPolymerEntity {
  rcsb_polymer_entity?: {
    pdbx_description?: string;
  };
  rcsb_entity_source_organism?: Array<{
    ncbi_taxonomy_id?: number;
    scientific_name?: string;
  }>;
  entity_poly?: {
    pdbx_seq_one_letter_code?: string;
    pdbx_strand_id?: string;
  };
  rcsb_polymer_entity_container_identifiers?: {
    uniprot_ids?: string[];
    auth_asym_ids?: string[];
  };
}

interface PDBNonpolymerEntity {
  pdbx_entity_nonpoly?: {
    comp_id?: string;
    name?: string;
  };
  rcsb_nonpolymer_entity?: {
    formula_weight?: number;
  };
}

/**
 * PDB search response
 */
interface PDBSearchResponse {
  result_set: Array<{
    identifier: string;
    score: number;
  }>;
  total_count: number;
}

/**
 * Binding site from PDB
 */
interface PDBBindingSite {
  id: string;
  rcsb_binding_affinity?: Array<{
    comp_id: string;
    value: number;
    type: string;
    unit: string;
  }>;
  struct_site?: {
    details?: string;
  };
}

/**
 * RCSB PDB API client
 */
export class PDBClient extends BaseClient {
  constructor(config: PDBConfig = {}) {
    super(
      {
        baseUrl: 'https://data.rcsb.org/rest/v1',
        rateLimitPerSecond: 10,
        cacheTtlMs: 3600000, // 1 hour - structures don't change often
        ...config,
      },
      'PDB'
    );
  }

  /**
   * Get structure by PDB ID
   */
  async getStructure(pdbId: string): Promise<ProteinStructure | null> {
    try {
      const response = await this.request<PDBEntry>(`/core/entry/${pdbId.toUpperCase()}`);
      return this.mapEntryToStructure(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Search for structures
   */
  async search(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<ProteinStructure>> {
    const limit = options.limit ?? 25;
    const offset = options.offset ?? 0;

    const searchBody = {
      query: {
        type: 'terminal',
        service: 'full_text',
        parameters: {
          value: query,
        },
      },
      return_type: 'entry',
      request_options: {
        paginate: {
          start: offset,
          rows: limit,
        },
      },
    };

    const response = await this.request<PDBSearchResponse>(
      'https://search.rcsb.org/rcsbsearch/v2/query',
      {
        method: 'POST',
        body: searchBody,
      }
    );

    const pdbIds = response.data.result_set.map(r => r.identifier);
    const structures = await this.getStructures(pdbIds);

    return createPaginatedResponse(structures, response.data.total_count, offset, limit);
  }

  /**
   * Get multiple structures by PDB IDs
   */
  async getStructures(pdbIds: string[]): Promise<ProteinStructure[]> {
    if (pdbIds.length === 0) return [];

    const structures: ProteinStructure[] = [];

    // Batch requests
    const batchSize = 10;
    for (let i = 0; i < pdbIds.length; i += batchSize) {
      const batch = pdbIds.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(id => this.getStructure(id)));
      structures.push(...results.filter((s): s is ProteinStructure => s !== null));
    }

    return structures;
  }

  /**
   * Search structures by UniProt ID
   */
  async searchByUniprot(
    uniprotId: string,
    options: { limit?: number } = {}
  ): Promise<ProteinStructure[]> {
    const limit = options.limit ?? 10;

    const searchBody = {
      query: {
        type: 'terminal',
        service: 'text',
        parameters: {
          attribute: 'rcsb_polymer_entity_container_identifiers.uniprot_ids',
          operator: 'exact_match',
          value: uniprotId,
        },
      },
      return_type: 'entry',
      request_options: {
        paginate: {
          start: 0,
          rows: limit,
        },
      },
    };

    const response = await this.request<PDBSearchResponse>(
      'https://search.rcsb.org/rcsbsearch/v2/query',
      {
        method: 'POST',
        body: searchBody,
      }
    );

    const pdbIds = response.data.result_set.map(r => r.identifier);
    return this.getStructures(pdbIds);
  }

  /**
   * Get ligands bound in a structure
   */
  async getLigands(pdbId: string): Promise<StructureLigand[]> {
    try {
      const response = await this.request<PDBEntry>(`/core/entry/${pdbId.toUpperCase()}`);
      const entry = response.data;

      if (!entry.nonpolymer_entities) return [];

      return entry.nonpolymer_entities.map(entity => ({
        id: entity.pdbx_entity_nonpoly?.comp_id ?? 'unknown',
        name: entity.pdbx_entity_nonpoly?.name ?? 'Unknown ligand',
        type: 'small_molecule' as const,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get binding sites in a structure
   */
  async getBindingSites(pdbId: string): Promise<BindingSite[]> {
    try {
      // Binding site information requires a different endpoint
      const response = await this.request<{ struct_site: PDBBindingSite[] }>(
        `/core/entry/${pdbId.toUpperCase()}/struct_site`
      );

      if (!response.data.struct_site) return [];

      return response.data.struct_site.map((site, index) => {
        const ligands = site.rcsb_binding_affinity?.map(ba => ba.comp_id) ?? [];

        return {
          id: site.id ?? `site_${index + 1}`,
          name: site.struct_site?.details ?? `Binding site ${index + 1}`,
          type: 'ligand_binding' as const,
          residues: [], // Would need additional API call to get residues
          ligands,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Search for structures with specific ligand
   */
  async searchByLigand(
    ligandId: string,
    options: { limit?: number } = {}
  ): Promise<ProteinStructure[]> {
    const limit = options.limit ?? 20;

    const searchBody = {
      query: {
        type: 'terminal',
        service: 'text',
        parameters: {
          attribute: 'pdbx_entity_nonpoly.comp_id',
          operator: 'exact_match',
          value: ligandId.toUpperCase(),
        },
      },
      return_type: 'entry',
      request_options: {
        paginate: {
          start: 0,
          rows: limit,
        },
      },
    };

    const response = await this.request<PDBSearchResponse>(
      'https://search.rcsb.org/rcsbsearch/v2/query',
      {
        method: 'POST',
        body: searchBody,
      }
    );

    const pdbIds = response.data.result_set.map(r => r.identifier);
    return this.getStructures(pdbIds);
  }

  /**
   * Get structure sequence
   */
  async getSequence(pdbId: string, chainId?: string): Promise<string | null> {
    try {
      const response = await this.request<PDBEntry>(`/core/entry/${pdbId.toUpperCase()}`);
      const entry = response.data;

      if (!entry.polymer_entities?.length) return null;

      // Find the matching chain or return first
      for (const entity of entry.polymer_entities) {
        const chains = entity.rcsb_polymer_entity_container_identifiers?.auth_asym_ids ?? [];

        if (!chainId || chains.includes(chainId)) {
          return entity.entity_poly?.pdbx_seq_one_letter_code ?? null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Map PDB entry to ProteinStructure
   */
  private mapEntryToStructure(entry: PDBEntry): ProteinStructure {
    const method = entry.exptl?.[0]?.method ?? 'unknown';
    const resolution = entry.rcsb_entry_info?.resolution_combined?.[0];

    // Get ligands
    const ligands: StructureLigand[] = (entry.nonpolymer_entities ?? []).map(entity => ({
      id: entity.pdbx_entity_nonpoly?.comp_id ?? 'unknown',
      name: entity.pdbx_entity_nonpoly?.name ?? 'Unknown',
      type: 'small_molecule' as const,
    }));

    return {
      pdbId: entry.rcsb_id,
      title: entry.struct?.title,
      method: this.mapMethod(method),
      resolution,
      ligands,
      depositionDate: entry.rcsb_accession_info?.deposit_date,
    };
  }

  /**
   * Map experimental method
   */
  private mapMethod(method: string): 'X-ray' | 'NMR' | 'cryo-EM' | 'AlphaFold' | 'other' {
    const lower = method.toLowerCase();
    if (lower.includes('x-ray') || lower.includes('diffraction')) return 'X-ray';
    if (lower.includes('nmr')) return 'NMR';
    if (lower.includes('electron') || lower.includes('em')) return 'cryo-EM';
    return 'other';
  }

  /**
   * Test connection to PDB
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getStructure('1TUP');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a PDB client
 */
export function createPDBClient(): PDBClient {
  return new PDBClient();
}
