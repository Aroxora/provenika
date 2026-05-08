/**
 * Mutation Domain Models
 *
 * Core types for mutation and variant data in cancer genomics
 */

/**
 * Clinical significance classification
 */
export type ClinicalSignificance =
  | 'pathogenic'
  | 'likely_pathogenic'
  | 'uncertain_significance'
  | 'likely_benign'
  | 'benign'
  | 'drug_response'
  | 'risk_factor'
  | 'protective'
  | 'not_provided';

/**
 * Variant consequence/effect type
 */
export type VariantConsequence =
  | 'frameshift'
  | 'nonsense'
  | 'missense'
  | 'silent'
  | 'splice_site'
  | 'splice_region'
  | 'start_lost'
  | 'stop_lost'
  | 'inframe_insertion'
  | 'inframe_deletion'
  | 'intron_variant'
  | 'upstream_gene_variant'
  | 'downstream_gene_variant'
  | '3_prime_UTR_variant'
  | '5_prime_UTR_variant'
  | 'regulatory_region_variant'
  | 'copy_number_gain'
  | 'copy_number_loss'
  | 'fusion'
  | 'unknown';

/**
 * Variant type classification
 */
export type VariantType =
  | 'SNV'
  | 'insertion'
  | 'deletion'
  | 'indel'
  | 'MNV'
  | 'CNV'
  | 'structural'
  | 'fusion';

/**
 * Genomic coordinates of a variant
 */
export interface VariantCoordinates {
  readonly chromosome: string;
  readonly position: number;
  readonly referenceAllele: string;
  readonly alternateAllele: string;
  readonly assembly?: 'GRCh37' | 'GRCh38';
}

/**
 * Protein-level variant notation
 */
export interface ProteinChange {
  readonly hgvsProtein: string;
  readonly referenceAminoAcid?: string;
  readonly position?: number;
  readonly alternateAminoAcid?: string;
}

/**
 * External database reference for a variant
 */
export interface VariantReference {
  readonly database: 'dbSNP' | 'ClinVar' | 'COSMIC' | 'gnomAD' | 'OncoKB' | 'CIViC';
  readonly id: string;
  readonly url?: string;
}

/**
 * Population frequency data
 */
export interface PopulationFrequency {
  readonly population: string;
  readonly alleleFrequency: number;
  readonly alleleCount?: number;
  readonly alleleNumber?: number;
  readonly source: 'gnomAD' | '1000Genomes' | 'ExAC' | 'ESP';
}

/**
 * Functional prediction scores
 */
export interface FunctionalPrediction {
  readonly tool: 'SIFT' | 'PolyPhen2' | 'CADD' | 'REVEL' | 'MutationTaster' | 'FATHMM';
  readonly score: number;
  readonly prediction: 'deleterious' | 'tolerated' | 'damaging' | 'benign' | 'neutral';
  readonly confidence?: 'high' | 'medium' | 'low';
}

/**
 * Core Variant entity
 */
export interface Variant {
  readonly id: string;
  readonly geneSymbol: string;
  readonly geneId?: string;
  readonly coordinates?: VariantCoordinates;
  readonly hgvsCoding?: string;
  readonly proteinChange?: ProteinChange;
  readonly variantType: VariantType;
  readonly consequence: VariantConsequence;
  readonly clinicalSignificance?: ClinicalSignificance;
  readonly references?: readonly VariantReference[];
  readonly populationFrequencies?: readonly PopulationFrequency[];
  readonly functionalPredictions?: readonly FunctionalPrediction[];
  readonly somaticStatus?: 'somatic' | 'germline' | 'unknown';
  readonly oncogenicity?: 'oncogenic' | 'likely_oncogenic' | 'uncertain' | 'likely_benign' | 'benign';
}

/**
 * Extended mutation entity with clinical annotations
 */
export interface Mutation extends Variant {
  readonly sampleId?: string;
  readonly tumorType?: string;
  readonly variantAlleleFrequency?: number;
  readonly readDepth?: number;
  readonly mutantReads?: number;
  readonly referenceReads?: number;
  readonly callerConfidence?: number;
  readonly actionability?: MutationActionability;
}

/**
 * Actionability information for a mutation
 */
export interface MutationActionability {
  readonly level: 'FDA_approved' | 'clinical_trial' | 'preclinical' | 'case_report' | 'none';
  readonly therapies?: readonly TherapyAssociation[];
  readonly clinicalTrials?: readonly string[];
}

/**
 * Association between a mutation and a therapy
 */
export interface TherapyAssociation {
  readonly therapyName: string;
  readonly therapyType: 'targeted' | 'immunotherapy' | 'chemotherapy' | 'hormone';
  readonly responseType: 'sensitive' | 'resistant' | 'unknown';
  readonly evidenceLevel: 'A' | 'B' | 'C' | 'D';
  readonly source: string;
  readonly pubmedIds?: readonly string[];
}

/**
 * Mutation signature pattern
 */
export interface MutationSignature {
  readonly id: string;
  readonly name: string;
  readonly etiology?: string;
  readonly contribution: number;
  readonly confidence?: number;
}

/**
 * Mutation search criteria
 */
export interface MutationSearchCriteria {
  readonly geneSymbol?: string;
  readonly variantType?: VariantType;
  readonly consequence?: VariantConsequence;
  readonly clinicalSignificance?: ClinicalSignificance;
  readonly tumorType?: string;
  readonly minAlleleFrequency?: number;
  readonly maxAlleleFrequency?: number;
  readonly isActionable?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Variant classification result
 */
export interface VariantClassification {
  readonly variant: Variant;
  readonly classification: ClinicalSignificance;
  readonly evidence: readonly ClassificationEvidence[];
  readonly guidelines: 'ACMG' | 'AMP' | 'ClinGen' | 'other';
  readonly classifiedDate: string;
  readonly reviewer?: string;
}

/**
 * Evidence supporting a variant classification
 */
export interface ClassificationEvidence {
  readonly criteriaCode: string;
  readonly criteriaDescription: string;
  readonly strength: 'very_strong' | 'strong' | 'moderate' | 'supporting';
  readonly direction: 'pathogenic' | 'benign';
  readonly source?: string;
}
