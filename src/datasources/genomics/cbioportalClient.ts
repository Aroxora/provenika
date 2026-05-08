/**
 * cBioPortal API Client
 *
 * Provides access to cancer genomics data via cBioPortal.
 * API Documentation: https://www.cbioportal.org/api
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { Mutation, Variant, ClinicalSignificance, VariantType, VariantConsequence } from '../../domain/core/mutation.js';
import type { Gene, GeneExpression } from '../../domain/core/gene.js';

/**
 * cBioPortal client configuration
 */
export interface CBioPortalConfig extends Partial<DataSourceConfig> {}

/**
 * cBioPortal cancer study
 */
export interface CancerStudy {
  readonly studyId: string;
  readonly name: string;
  readonly description: string;
  readonly cancerTypeId: string;
  readonly cancerType: string;
  readonly pmid?: string;
  readonly citation?: string;
  readonly groups?: string;
  readonly status?: string;
  readonly allSampleCount: number;
}

/**
 * cBioPortal mutation data
 */
interface CBioMutation {
  sampleId: string;
  patientId: string;
  studyId: string;
  entrezGeneId: number;
  gene: {
    hugoGeneSymbol: string;
    entrezGeneId: number;
  };
  molecularProfileId: string;
  proteinChange?: string;
  mutationType: string;
  variantType?: string;
  ncbiBuild?: string;
  chr?: string;
  startPosition?: number;
  endPosition?: number;
  referenceAllele?: string;
  variantAllele?: string;
  tumorAltCount?: number;
  tumorRefCount?: number;
  normalAltCount?: number;
  normalRefCount?: number;
  keyword?: string;
  mutationStatus?: string;
}

/**
 * cBioPortal gene panel data
 */
interface CBioGenePanel {
  genePanelId: string;
  description?: string;
  genes: Array<{
    entrezGeneId: number;
    hugoGeneSymbol: string;
  }>;
}

/**
 * cBioPortal copy number data
 */
interface CBioCopyNumber {
  sampleId: string;
  patientId: string;
  studyId: string;
  entrezGeneId: number;
  gene: {
    hugoGeneSymbol: string;
  };
  alteration: number; // -2: deep deletion, -1: shallow deletion, 0: diploid, 1: gain, 2: amplification
}

/**
 * cBioPortal API client
 */
export class CBioPortalClient extends BaseClient {
  constructor(config: CBioPortalConfig = {}) {
    super(
      {
        baseUrl: 'https://www.cbioportal.org/api',
        rateLimitPerSecond: 5,
        cacheTtlMs: 600000, // 10 minutes
        ...config,
      },
      'cBioPortal'
    );
  }

  /**
   * Get all cancer studies
   */
  async getStudies(): Promise<CancerStudy[]> {
    const response = await this.request<Array<{
      studyId: string;
      name: string;
      description: string;
      cancerTypeId: string;
      cancerType: { name: string };
      pmid?: string;
      citation?: string;
      groups?: string;
      status?: string;
      allSampleCount: number;
    }>>('/studies');

    return response.data.map(study => ({
      studyId: study.studyId,
      name: study.name,
      description: study.description,
      cancerTypeId: study.cancerTypeId,
      cancerType: study.cancerType?.name ?? study.cancerTypeId,
      pmid: study.pmid,
      citation: study.citation,
      groups: study.groups,
      status: study.status,
      allSampleCount: study.allSampleCount,
    }));
  }

  /**
   * Get study by ID
   */
  async getStudy(studyId: string): Promise<CancerStudy | null> {
    try {
      const response = await this.request<{
        studyId: string;
        name: string;
        description: string;
        cancerTypeId: string;
        cancerType: { name: string };
        pmid?: string;
        citation?: string;
        groups?: string;
        status?: string;
        allSampleCount: number;
      }>(`/studies/${studyId}`);

      return {
        studyId: response.data.studyId,
        name: response.data.name,
        description: response.data.description,
        cancerTypeId: response.data.cancerTypeId,
        cancerType: response.data.cancerType?.name ?? response.data.cancerTypeId,
        pmid: response.data.pmid,
        citation: response.data.citation,
        groups: response.data.groups,
        status: response.data.status,
        allSampleCount: response.data.allSampleCount,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get mutations for a gene in a study
   */
  async getMutations(
    studyId: string,
    geneSymbol: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<Mutation>> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    // First, get the molecular profile ID for mutations
    const profiles = await this.request<Array<{ molecularProfileId: string; molecularAlterationType: string }>>(
      `/studies/${studyId}/molecular-profiles`
    );

    const mutationProfile = profiles.data.find(
      p => p.molecularAlterationType === 'MUTATION_EXTENDED'
    );

    if (!mutationProfile) {
      return createPaginatedResponse([], 0, offset, limit);
    }

    // Get mutations
    const response = await this.request<CBioMutation[]>(
      `/molecular-profiles/${mutationProfile.molecularProfileId}/mutations/fetch`,
      {
        method: 'POST',
        body: {
          geneQueries: [{ hugoSymbol: geneSymbol }],
          sampleListId: `${studyId}_all`,
        },
      }
    );

    const mutations = response.data.map(m => this.mapCBioMutation(m));
    const paginated = mutations.slice(offset, offset + limit);

    return createPaginatedResponse(paginated, mutations.length, offset, limit);
  }

  /**
   * Get mutations for multiple genes in a study
   */
  async getMutationsForGenes(
    studyId: string,
    geneSymbols: string[]
  ): Promise<Mutation[]> {
    if (geneSymbols.length === 0) return [];

    // Get the molecular profile ID
    const profiles = await this.request<Array<{ molecularProfileId: string; molecularAlterationType: string }>>(
      `/studies/${studyId}/molecular-profiles`
    );

    const mutationProfile = profiles.data.find(
      p => p.molecularAlterationType === 'MUTATION_EXTENDED'
    );

    if (!mutationProfile) return [];

    const response = await this.request<CBioMutation[]>(
      `/molecular-profiles/${mutationProfile.molecularProfileId}/mutations/fetch`,
      {
        method: 'POST',
        body: {
          geneQueries: geneSymbols.map(symbol => ({ hugoSymbol: symbol })),
          sampleListId: `${studyId}_all`,
        },
      }
    );

    return response.data.map(m => this.mapCBioMutation(m));
  }

  /**
   * Get copy number alterations for a gene
   */
  async getCopyNumberAlterations(
    studyId: string,
    geneSymbol: string
  ): Promise<Array<{ sampleId: string; alteration: 'amplification' | 'gain' | 'diploid' | 'shallow_deletion' | 'deep_deletion' }>> {
    // Get the molecular profile ID for CNA
    const profiles = await this.request<Array<{ molecularProfileId: string; molecularAlterationType: string }>>(
      `/studies/${studyId}/molecular-profiles`
    );

    const cnaProfile = profiles.data.find(
      p => p.molecularAlterationType === 'COPY_NUMBER_ALTERATION'
    );

    if (!cnaProfile) return [];

    const response = await this.request<CBioCopyNumber[]>(
      `/molecular-profiles/${cnaProfile.molecularProfileId}/discrete-copy-number/fetch`,
      {
        method: 'POST',
        body: {
          geneIds: [geneSymbol],
          sampleListId: `${studyId}_all`,
        },
      }
    );

    return response.data.map(cna => ({
      sampleId: cna.sampleId,
      alteration: this.mapCopyNumber(cna.alteration),
    }));
  }

  /**
   * Get gene panels for a study
   */
  async getGenePanels(studyId: string): Promise<CBioGenePanel[]> {
    const response = await this.request<CBioGenePanel[]>(`/studies/${studyId}/gene-panels`);
    return response.data;
  }

  /**
   * Get cancer types
   */
  async getCancerTypes(): Promise<Array<{ id: string; name: string; parent?: string }>> {
    const response = await this.request<Array<{
      cancerTypeId: string;
      name: string;
      parent?: string;
    }>>('/cancer-types');

    return response.data.map(ct => ({
      id: ct.cancerTypeId,
      name: ct.name,
      parent: ct.parent,
    }));
  }

  /**
   * Search studies by cancer type
   */
  async searchStudiesByCancerType(cancerTypeId: string): Promise<CancerStudy[]> {
    const allStudies = await this.getStudies();
    return allStudies.filter(
      study => study.cancerTypeId.toLowerCase() === cancerTypeId.toLowerCase()
    );
  }

  /**
   * Get mutation frequency for a gene across studies
   */
  async getMutationFrequency(geneSymbol: string): Promise<Array<{ studyId: string; frequency: number; sampleCount: number }>> {
    // This would require iterating through studies
    // For now, return a placeholder
    const studies = await this.getStudies();

    const frequencies: Array<{ studyId: string; frequency: number; sampleCount: number }> = [];

    // Sample a few studies (full implementation would query all)
    const sampleStudies = studies.slice(0, 5);

    for (const study of sampleStudies) {
      try {
        const mutations = await this.getMutations(study.studyId, geneSymbol, { limit: 1000 });
        const uniqueSamples = new Set(mutations.items.map(m => m.sampleId)).size;
        const frequency = study.allSampleCount > 0 ? uniqueSamples / study.allSampleCount : 0;

        frequencies.push({
          studyId: study.studyId,
          frequency,
          sampleCount: study.allSampleCount,
        });
      } catch {
        // Skip studies without mutation data
      }
    }

    return frequencies;
  }

  /**
   * Map cBioPortal mutation to domain model
   */
  private mapCBioMutation(m: CBioMutation): Mutation {
    return {
      id: `${m.studyId}_${m.sampleId}_${m.gene.hugoGeneSymbol}_${m.proteinChange ?? 'unknown'}`,
      geneSymbol: m.gene.hugoGeneSymbol,
      geneId: String(m.gene.entrezGeneId),
      proteinChange: m.proteinChange ? {
        hgvsProtein: m.proteinChange,
      } : undefined,
      coordinates: m.chr ? {
        chromosome: m.chr,
        position: m.startPosition ?? 0,
        referenceAllele: m.referenceAllele ?? '',
        alternateAllele: m.variantAllele ?? '',
        assembly: m.ncbiBuild === 'GRCh38' ? 'GRCh38' : 'GRCh37',
      } : undefined,
      variantType: this.mapVariantType(m.variantType ?? m.mutationType),
      consequence: this.mapConsequence(m.mutationType),
      somaticStatus: m.mutationStatus?.toLowerCase() === 'somatic' ? 'somatic' : 'unknown',
      sampleId: m.sampleId,
      variantAlleleFrequency: m.tumorAltCount && m.tumorRefCount
        ? m.tumorAltCount / (m.tumorAltCount + m.tumorRefCount)
        : undefined,
      mutantReads: m.tumorAltCount,
      referenceReads: m.tumorRefCount,
    };
  }

  /**
   * Map variant type
   */
  private mapVariantType(type: string): VariantType {
    const lower = type.toLowerCase();
    if (lower.includes('snp') || lower.includes('snv')) return 'SNV';
    if (lower.includes('ins')) return 'insertion';
    if (lower.includes('del')) return 'deletion';
    if (lower.includes('indel')) return 'indel';
    return 'SNV';
  }

  /**
   * Map mutation consequence
   */
  private mapConsequence(type: string): VariantConsequence {
    const lower = type.toLowerCase();
    if (lower.includes('frameshift')) return 'frameshift';
    if (lower.includes('nonsense') || lower.includes('stop')) return 'nonsense';
    if (lower.includes('missense')) return 'missense';
    if (lower.includes('silent') || lower.includes('synonymous')) return 'silent';
    if (lower.includes('splice')) return 'splice_site';
    if (lower.includes('inframe_ins')) return 'inframe_insertion';
    if (lower.includes('inframe_del')) return 'inframe_deletion';
    return 'unknown';
  }

  /**
   * Map copy number value
   */
  private mapCopyNumber(value: number): 'amplification' | 'gain' | 'diploid' | 'shallow_deletion' | 'deep_deletion' {
    switch (value) {
      case 2: return 'amplification';
      case 1: return 'gain';
      case 0: return 'diploid';
      case -1: return 'shallow_deletion';
      case -2: return 'deep_deletion';
      default: return 'diploid';
    }
  }

  /**
   * Test connection to cBioPortal
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('/cancer-types');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a cBioPortal client
 */
export function createCBioPortalClient(): CBioPortalClient {
  return new CBioPortalClient();
}
