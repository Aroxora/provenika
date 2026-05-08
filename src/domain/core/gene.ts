/**
 * Gene Domain Models
 *
 * Core types for gene-related data in cancer research
 */

/**
 * Reference to an external gene database
 */
export interface GeneReference {
  readonly database: 'NCBI' | 'Ensembl' | 'HGNC' | 'UniProt' | 'COSMIC';
  readonly id: string;
  readonly url?: string;
}

/**
 * Chromosome location of a gene
 */
export interface ChromosomeLocation {
  readonly chromosome: string;
  readonly startPosition?: number;
  readonly endPosition?: number;
  readonly strand?: '+' | '-';
  readonly cytoband?: string;
}

/**
 * Gene expression measurement
 */
export interface GeneExpression {
  readonly geneId: string;
  readonly geneSymbol: string;
  readonly expressionLevel: number;
  readonly unit: 'TPM' | 'FPKM' | 'RPKM' | 'counts' | 'log2';
  readonly sampleId?: string;
  readonly tissueType?: string;
  readonly condition?: 'normal' | 'tumor' | 'treated' | 'control';
  readonly foldChange?: number;
  readonly pValue?: number;
  readonly adjustedPValue?: number;
}

/**
 * Gene expression profile across multiple samples
 */
export interface ExpressionProfile {
  readonly geneId: string;
  readonly geneSymbol: string;
  readonly expressions: readonly GeneExpression[];
  readonly meanExpression?: number;
  readonly medianExpression?: number;
  readonly standardDeviation?: number;
}

/**
 * Gene functional annotation
 */
export interface GeneFunction {
  readonly category: 'molecular_function' | 'biological_process' | 'cellular_component';
  readonly goId: string;
  readonly term: string;
  readonly evidenceCode?: string;
}

/**
 * Gene-disease association
 */
export interface GeneDiseaseAssociation {
  readonly diseaseId: string;
  readonly diseaseName: string;
  readonly associationType: 'causal' | 'susceptibility' | 'biomarker' | 'therapeutic_target';
  readonly evidenceLevel: 'strong' | 'moderate' | 'weak';
  readonly source: string;
  readonly pubmedIds?: readonly string[];
}

/**
 * Core Gene entity
 */
export interface Gene {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly description?: string;
  readonly geneType: 'protein_coding' | 'ncRNA' | 'pseudogene' | 'other';
  readonly location?: ChromosomeLocation;
  readonly references?: readonly GeneReference[];
  readonly functions?: readonly GeneFunction[];
  readonly diseaseAssociations?: readonly GeneDiseaseAssociation[];
  readonly oncogene?: boolean;
  readonly tumorSuppressor?: boolean;
}

/**
 * Gene panel for targeted analysis
 */
export interface GenePanel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly genes: readonly Gene[];
  readonly cancerTypes?: readonly string[];
  readonly version?: string;
  readonly source?: string;
}

/**
 * Gene search criteria
 */
export interface GeneSearchCriteria {
  readonly symbol?: string;
  readonly name?: string;
  readonly chromosome?: string;
  readonly cancerType?: string;
  readonly isOncogene?: boolean;
  readonly isTumorSuppressor?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}
