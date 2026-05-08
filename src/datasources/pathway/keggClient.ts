/**
 * KEGG API Client
 *
 * Provides access to KEGG pathway and gene data.
 * API Documentation: https://www.kegg.jp/kegg/rest/keggapi.html
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { Pathway, PathwayNode, PathwayInteraction, PathwayCategory } from '../../domain/core/pathway.js';

/**
 * KEGG client configuration
 */
export interface KEGGConfig extends Partial<DataSourceConfig> {}

/**
 * KEGG pathway info
 */
interface KEGGPathwayInfo {
  entry: string;
  name: string;
  description?: string;
  organism?: string;
  genes?: string[];
  drugs?: string[];
  diseases?: string[];
}

/**
 * KEGG gene info
 */
interface KEGGGeneInfo {
  entry: string;
  name: string;
  definition?: string;
  orthology?: string;
  position?: string;
  dblinks?: Record<string, string>;
}

/**
 * KEGG API client
 */
export class KEGGClient extends BaseClient {
  constructor(config: KEGGConfig = {}) {
    super(
      {
        baseUrl: 'https://rest.kegg.jp',
        rateLimitPerSecond: 3, // KEGG has strict rate limits
        cacheTtlMs: 3600000, // 1 hour - pathway data is stable
        ...config,
      },
      'KEGG'
    );
  }

  /**
   * List all pathways for an organism
   */
  async listPathways(organism: string = 'hsa'): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request<string>(`/list/pathway/${organism}`, {
      headers: { Accept: 'text/plain' },
    });

    return this.parseListResponse(response.data);
  }

  /**
   * Get pathway details
   */
  async getPathway(pathwayId: string): Promise<Pathway | null> {
    try {
      // Ensure pathway ID has correct prefix
      const id = pathwayId.startsWith('path:') ? pathwayId : `path:${pathwayId}`;

      const response = await this.request<string>(`/get/${id}`, {
        headers: { Accept: 'text/plain' },
      });

      return this.parsePathway(response.data, pathwayId);
    } catch {
      return null;
    }
  }

  /**
   * Get genes in a pathway
   */
  async getPathwayGenes(pathwayId: string): Promise<string[]> {
    try {
      const id = pathwayId.replace('path:', '').replace('hsa', '');
      const response = await this.request<string>(`/link/hsa/hsa${id}`, {
        headers: { Accept: 'text/plain' },
      });

      const lines = response.data.split('\n').filter(l => l.trim());
      const genes: string[] = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts[1]) {
          // Extract gene symbol from hsa:XXXXX format
          genes.push(parts[1].replace('hsa:', ''));
        }
      }

      return genes;
    } catch {
      return [];
    }
  }

  /**
   * Search pathways by keyword
   */
  async searchPathways(
    keyword: string,
    organism: string = 'hsa',
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Pathway>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const response = await this.request<string>(`/find/pathway/${keyword}`, {
      headers: { Accept: 'text/plain' },
    });

    const pathwayList = this.parseListResponse(response.data);

    // Filter by organism
    const filtered = pathwayList.filter(p => p.id.startsWith(organism));

    // Get details for each pathway
    const pathwayPromises = filtered.slice(offset, offset + limit).map(p =>
      this.getPathway(p.id)
    );

    const pathways = await Promise.all(pathwayPromises);
    const validPathways = pathways.filter((p): p is Pathway => p !== null);

    return createPaginatedResponse(validPathways, filtered.length, offset, limit);
  }

  /**
   * Get gene information
   */
  async getGene(geneId: string): Promise<KEGGGeneInfo | null> {
    try {
      const id = geneId.startsWith('hsa:') ? geneId : `hsa:${geneId}`;
      const response = await this.request<string>(`/get/${id}`, {
        headers: { Accept: 'text/plain' },
      });

      return this.parseGeneInfo(response.data, geneId);
    } catch {
      return null;
    }
  }

  /**
   * Find pathways containing a gene
   */
  async findPathwaysForGene(geneSymbol: string): Promise<Array<{ id: string; name: string }>> {
    try {
      // First, search for the gene to get its KEGG ID
      const geneResponse = await this.request<string>(`/find/genes/${geneSymbol}+hsa`, {
        headers: { Accept: 'text/plain' },
      });

      const geneLines = geneResponse.data.split('\n').filter(l => l.trim());
      if (geneLines.length === 0) return [];

      // Get the first matching gene ID
      const firstLine = geneLines[0];
      const geneId = firstLine?.split('\t')[0] ?? '';

      if (!geneId) return [];

      // Find pathways containing this gene
      const pathwayResponse = await this.request<string>(`/link/pathway/${geneId}`, {
        headers: { Accept: 'text/plain' },
      });

      const pathwayLines = pathwayResponse.data.split('\n').filter(l => l.trim());
      const pathways: Array<{ id: string; name: string }> = [];

      for (const line of pathwayLines) {
        const parts = line.split('\t');
        if (parts[1]) {
          const pathwayId = parts[1].replace('path:', '');
          pathways.push({ id: pathwayId, name: '' });
        }
      }

      // Get names for pathways
      const allPathways = await this.listPathways('hsa');
      for (const pathway of pathways) {
        const found = allPathways.find(p => p.id === pathway.id);
        if (found) {
          pathway.name = found.name;
        }
      }

      return pathways;
    } catch {
      return [];
    }
  }

  /**
   * Get cancer-related pathways
   */
  async getCancerPathways(): Promise<Pathway[]> {
    const cancerKeywords = [
      'cancer',
      'carcinoma',
      'leukemia',
      'melanoma',
      'glioma',
      'myeloma',
    ];

    const allPathways: Pathway[] = [];

    for (const keyword of cancerKeywords) {
      const result = await this.searchPathways(keyword, 'hsa', { limit: 50 });
      allPathways.push(...result.items);
    }

    // Deduplicate
    const seen = new Set<string>();
    return allPathways.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  /**
   * Get drug-pathway associations
   */
  async getDrugPathways(drugId: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const id = drugId.startsWith('D') ? drugId : `D${drugId}`;
      const response = await this.request<string>(`/link/pathway/dr:${id}`, {
        headers: { Accept: 'text/plain' },
      });

      return this.parseListResponse(response.data);
    } catch {
      return [];
    }
  }

  /**
   * Parse list response from KEGG
   */
  private parseListResponse(data: string): Array<{ id: string; name: string }> {
    const lines = data.split('\n').filter(l => l.trim());
    const results: Array<{ id: string; name: string }> = [];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        results.push({
          id: (parts[0] ?? '').replace('path:', ''),
          name: parts[1] ?? '',
        });
      }
    }

    return results;
  }

  /**
   * Parse pathway details from KEGG format
   */
  private parsePathway(data: string, pathwayId: string): Pathway {
    const lines = data.split('\n');
    let name = '';
    let description = '';
    const genes: string[] = [];
    let category: PathwayCategory = 'other';

    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('NAME')) {
        name = line.replace('NAME', '').trim();
      } else if (line.startsWith('DESCRIPTION')) {
        description = line.replace('DESCRIPTION', '').trim();
      } else if (line.startsWith('CLASS')) {
        const classInfo = line.replace('CLASS', '').trim().toLowerCase();
        category = this.mapPathwayCategory(classInfo);
      } else if (line.startsWith('GENE')) {
        currentSection = 'GENE';
        const geneInfo = line.replace('GENE', '').trim();
        const geneMatch = geneInfo.match(/^\d+\s+(\w+)/);
        if (geneMatch?.[1]) genes.push(geneMatch[1]);
      } else if (currentSection === 'GENE' && line.startsWith('            ')) {
        const geneMatch = line.trim().match(/^\d+\s+(\w+)/);
        if (geneMatch?.[1]) genes.push(geneMatch[1]);
      } else if (!line.startsWith(' ')) {
        currentSection = '';
      }
    }

    return {
      id: pathwayId,
      name,
      database: 'KEGG',
      externalId: pathwayId,
      description,
      category,
      organism: 'Homo sapiens',
      nodes: genes.map(gene => ({
        id: gene,
        name: gene,
        type: 'gene' as const,
        geneSymbol: gene,
      })),
      interactions: [],
      genes,
      url: `https://www.kegg.jp/pathway/${pathwayId}`,
    };
  }

  /**
   * Parse gene info
   */
  private parseGeneInfo(data: string, geneId: string): KEGGGeneInfo {
    const lines = data.split('\n');
    let name = '';
    let definition = '';
    let orthology = '';
    let position = '';
    const dblinks: Record<string, string> = {};

    for (const line of lines) {
      if (line.startsWith('NAME')) {
        name = line.replace('NAME', '').trim();
      } else if (line.startsWith('DEFINITION')) {
        definition = line.replace('DEFINITION', '').trim();
      } else if (line.startsWith('ORTHOLOGY')) {
        orthology = line.replace('ORTHOLOGY', '').trim();
      } else if (line.startsWith('POSITION')) {
        position = line.replace('POSITION', '').trim();
      } else if (line.startsWith('DBLINKS')) {
        const dblinkInfo = line.replace('DBLINKS', '').trim();
        const parts = dblinkInfo.split(':');
        if (parts.length === 2) {
          dblinks[parts[0].trim()] = parts[1].trim();
        }
      }
    }

    return {
      entry: geneId,
      name,
      definition,
      orthology,
      position,
      dblinks,
    };
  }

  /**
   * Map KEGG class to pathway category
   */
  private mapPathwayCategory(classInfo: string): PathwayCategory {
    if (classInfo.includes('signal')) return 'signaling';
    if (classInfo.includes('metabol')) return 'metabolic';
    if (classInfo.includes('cell cycle')) return 'cell_cycle';
    if (classInfo.includes('apoptosis') || classInfo.includes('death')) return 'apoptosis';
    if (classInfo.includes('immune')) return 'immune_response';
    if (classInfo.includes('repair')) return 'dna_repair';
    if (classInfo.includes('transcription')) return 'transcription';
    if (classInfo.includes('translation')) return 'translation';
    if (classInfo.includes('drug')) return 'drug_metabolism';
    return 'other';
  }

  /**
   * Test connection to KEGG
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/info/kegg', { headers: { Accept: 'text/plain' } });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a KEGG client
 */
export function createKEGGClient(): KEGGClient {
  return new KEGGClient();
}
