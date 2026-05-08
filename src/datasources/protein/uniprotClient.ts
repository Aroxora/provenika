/**
 * UniProt API Client
 *
 * Provides access to protein data via UniProt REST API.
 * API Documentation: https://www.uniprot.org/help/api
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { Protein, ProteinSearchCriteria, ProteinDomain, PTMSite, ProteinStructure } from '../../domain/core/protein.js';

/**
 * UniProt client configuration
 */
export interface UniProtConfig extends Partial<DataSourceConfig> {}

/**
 * UniProt API response for search
 */
interface UniProtSearchResponse {
  results: UniProtEntry[];
}

/**
 * UniProt entry structure
 */
interface UniProtEntry {
  primaryAccession: string;
  uniProtkbId: string;
  organism?: {
    scientificName: string;
  };
  proteinDescription?: {
    recommendedName?: {
      fullName: { value: string };
    };
    submissionNames?: Array<{ fullName: { value: string } }>;
  };
  genes?: Array<{
    geneName?: { value: string };
    synonyms?: Array<{ value: string }>;
  }>;
  sequence?: {
    value: string;
    length: number;
    molWeight: number;
    crc64: string;
  };
  features?: UniProtFeature[];
  comments?: UniProtComment[];
  uniProtKBCrossReferences?: UniProtCrossReference[];
}

interface UniProtFeature {
  type: string;
  location: {
    start: { value: number };
    end: { value: number };
  };
  description?: string;
  featureId?: string;
  evidences?: Array<{ code: string }>;
}

interface UniProtComment {
  commentType: string;
  texts?: Array<{ value: string }>;
  subcellularLocations?: Array<{
    location: { value: string };
  }>;
  disease?: {
    diseaseId: string;
    description: string;
  };
}

interface UniProtCrossReference {
  database: string;
  id: string;
  properties?: Array<{ key: string; value: string }>;
}

/**
 * UniProt API client
 */
export class UniProtClient extends BaseClient {
  constructor(config: UniProtConfig = {}) {
    super(
      {
        baseUrl: 'https://rest.uniprot.org',
        rateLimitPerSecond: 10,
        cacheTtlMs: 600000, // 10 minutes
        ...config,
      },
      'UniProt'
    );
  }

  /**
   * Search for proteins
   */
  async search(
    criteria: ProteinSearchCriteria
  ): Promise<PaginatedResponse<Protein>> {
    const query = this.buildQuery(criteria);
    const limit = criteria.limit ?? 25;
    const offset = criteria.offset ?? 0;

    const params: Record<string, string> = {
      query,
      format: 'json',
      size: String(limit),
      cursor: offset > 0 ? String(offset) : '',
      fields: 'accession,id,organism_name,protein_name,gene_names,sequence,ft_domain,ft_site,ft_mod_res,cc_subcellular_location,cc_function,xref_pdb',
    };

    const response = await this.request<UniProtSearchResponse>('/uniprotkb/search', { params });
    const proteins = response.data.results.map(entry => this.mapEntryToProtein(entry));

    // UniProt doesn't return total count in the same way, so we estimate
    const total = proteins.length < limit ? offset + proteins.length : offset + proteins.length + 1;

    return createPaginatedResponse(proteins, total, offset, limit);
  }

  /**
   * Get protein by UniProt accession
   */
  async getByAccession(accession: string): Promise<Protein | null> {
    try {
      const response = await this.request<UniProtEntry>(`/uniprotkb/${accession}.json`);
      return this.mapEntryToProtein(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Get protein by gene name
   */
  async getByGeneName(geneName: string, organism: string = 'human'): Promise<Protein | null> {
    const result = await this.search({
      geneName,
      organism,
      limit: 1,
    });

    return result.items[0] ?? null;
  }

  /**
   * Get proteins by multiple accessions
   */
  async getByAccessions(accessions: string[]): Promise<Protein[]> {
    if (accessions.length === 0) return [];

    const proteins: Protein[] = [];

    // UniProt recommends batching requests
    const batchSize = 50;
    for (let i = 0; i < accessions.length; i += batchSize) {
      const batch = accessions.slice(i, i + batchSize);
      const query = `accession:(${batch.join(' OR ')})`;

      const response = await this.request<UniProtSearchResponse>('/uniprotkb/search', {
        params: {
          query,
          format: 'json',
          size: String(batch.length),
          fields: 'accession,id,organism_name,protein_name,gene_names,sequence,ft_domain,ft_site,ft_mod_res,cc_subcellular_location,cc_function,xref_pdb',
        },
      });

      proteins.push(...response.data.results.map(entry => this.mapEntryToProtein(entry)));
    }

    return proteins;
  }

  /**
   * Search for proteins involved in cancer
   */
  async searchCancerProteins(
    cancerType?: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Protein>> {
    const queryParts = ['(keyword:KW-0656)']; // Disease keyword

    if (cancerType) {
      queryParts.push(`(cc_disease:"${cancerType}")`);
    } else {
      queryParts.push('(cc_disease:cancer OR cc_disease:tumor OR cc_disease:neoplasm)');
    }

    queryParts.push('(organism_id:9606)'); // Human

    return this.search({
      keyword: queryParts.join(' AND '),
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Get protein domains
   */
  async getProteinDomains(accession: string): Promise<readonly ProteinDomain[]> {
    const protein = await this.getByAccession(accession);
    return protein?.domains ?? [];
  }

  /**
   * Build search query
   */
  private buildQuery(criteria: ProteinSearchCriteria): string {
    const parts: string[] = [];

    if (criteria.uniprotId) {
      parts.push(`(accession:${criteria.uniprotId})`);
    }

    if (criteria.geneName) {
      parts.push(`(gene:${criteria.geneName})`);
    }

    if (criteria.keyword) {
      parts.push(`(${criteria.keyword})`);
    }

    if (criteria.organism) {
      const organismMap: Record<string, string> = {
        human: '9606',
        mouse: '10090',
        rat: '10116',
      };
      const taxId = organismMap[criteria.organism.toLowerCase()] ?? criteria.organism;
      parts.push(`(organism_id:${taxId})`);
    }

    if (criteria.hasStructure) {
      parts.push('(database:pdb)');
    }

    if (criteria.hasDruggableSite) {
      parts.push('(keyword:KW-0903)'); // Pharmaceutical keyword
    }

    return parts.length > 0 ? parts.join(' AND ') : '*';
  }

  /**
   * Map UniProt entry to Protein domain model
   */
  private mapEntryToProtein(entry: UniProtEntry): Protein {
    const geneName = entry.genes?.[0]?.geneName?.value ?? '';
    const proteinName = entry.proteinDescription?.recommendedName?.fullName?.value ??
                        entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ??
                        'Unknown';

    // Extract domains
    const domains: ProteinDomain[] = (entry.features ?? [])
      .filter(f => f.type === 'Domain' || f.type === 'Region')
      .map(f => ({
        id: f.featureId ?? `domain_${f.location.start.value}`,
        name: f.description ?? 'Unknown domain',
        database: 'InterPro' as const,
        startPosition: f.location.start.value,
        endPosition: f.location.end.value,
        description: f.description,
      }));

    // Extract PTM sites
    const ptmSites: PTMSite[] = (entry.features ?? [])
      .filter(f => f.type === 'Modified residue')
      .map(f => ({
        position: f.location.start.value,
        residue: '',
        modificationType: this.mapModificationType(f.description ?? ''),
        evidence: 'experimental' as const,
      }));

    // Extract PDB structures
    const structures: ProteinStructure[] = (entry.uniProtKBCrossReferences ?? [])
      .filter(ref => ref.database === 'PDB')
      .map(ref => {
        const method = ref.properties?.find(p => p.key === 'Method')?.value ?? '';
        const resolution = ref.properties?.find(p => p.key === 'Resolution')?.value;

        return {
          pdbId: ref.id,
          method: this.mapStructureMethod(method),
          resolution: resolution ? parseFloat(resolution) : undefined,
        };
      });

    // Extract subcellular location
    const subcellularLocation = (entry.comments ?? [])
      .filter(c => c.commentType === 'SUBCELLULAR LOCATION')
      .flatMap(c => c.subcellularLocations?.map(loc => loc.location.value) ?? []);

    // Extract function
    const functionComment = (entry.comments ?? [])
      .find(c => c.commentType === 'FUNCTION');
    const proteinFunction = functionComment?.texts?.[0]?.value;

    return {
      id: entry.primaryAccession,
      uniprotId: entry.primaryAccession,
      name: proteinName,
      geneName,
      organism: entry.organism?.scientificName,
      sequence: entry.sequence ? {
        sequence: entry.sequence.value,
        length: entry.sequence.length,
        checksum: entry.sequence.crc64,
      } : undefined,
      domains,
      ptmSites,
      structures,
      subcellularLocation,
      function: proteinFunction,
    };
  }

  /**
   * Map modification type from description
   */
  private mapModificationType(
    description: string
  ): 'phosphorylation' | 'ubiquitination' | 'acetylation' | 'methylation' | 'glycosylation' | 'sumoylation' | 'other' {
    const lower = description.toLowerCase();
    if (lower.includes('phospho')) return 'phosphorylation';
    if (lower.includes('ubiquit')) return 'ubiquitination';
    if (lower.includes('acetyl')) return 'acetylation';
    if (lower.includes('methyl')) return 'methylation';
    if (lower.includes('glyco')) return 'glycosylation';
    if (lower.includes('sumo')) return 'sumoylation';
    return 'other';
  }

  /**
   * Map structure method
   */
  private mapStructureMethod(method: string): 'X-ray' | 'NMR' | 'cryo-EM' | 'AlphaFold' | 'other' {
    const lower = method.toLowerCase();
    if (lower.includes('x-ray')) return 'X-ray';
    if (lower.includes('nmr')) return 'NMR';
    if (lower.includes('em') || lower.includes('electron')) return 'cryo-EM';
    return 'other';
  }

  /**
   * Test connection to UniProt
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<UniProtSearchResponse>('/uniprotkb/search', {
        params: { query: 'accession:P53_HUMAN', format: 'json', size: '1' },
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a UniProt client
 */
export function createUniProtClient(): UniProtClient {
  return new UniProtClient();
}
