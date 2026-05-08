/**
 * Drug Target Domain Models
 *
 * Core types for drug targets and target identification
 */

/**
 * Target type classification
 */
export type TargetType =
  | 'protein'
  | 'enzyme'
  | 'receptor'
  | 'ion_channel'
  | 'transporter'
  | 'kinase'
  | 'phosphatase'
  | 'protease'
  | 'epigenetic'
  | 'transcription_factor'
  | 'nucleic_acid'
  | 'other';

/**
 * Target validation level
 */
export type TargetValidationLevel =
  | 'clinical'
  | 'preclinical'
  | 'genetic'
  | 'biochemical'
  | 'computational'
  | 'literature';

/**
 * Target druggability assessment
 */
export interface TargetDruggability {
  readonly score: number;
  readonly category: 'highly_druggable' | 'druggable' | 'challenging' | 'undruggable';
  readonly smallMolecule?: boolean;
  readonly antibody?: boolean;
  readonly peptide?: boolean;
  readonly protac?: boolean;
  readonly bindingSites?: readonly BindingSiteAssessment[];
  readonly assessment?: string;
}

/**
 * Binding site assessment for druggability
 */
export interface BindingSiteAssessment {
  readonly siteId: string;
  readonly siteName: string;
  readonly type: 'active_site' | 'allosteric' | 'protein_protein_interface' | 'cryptic';
  readonly druggabilityScore: number;
  readonly volume?: number;
  readonly hydrophobicity?: number;
  readonly accessibility?: number;
}

/**
 * Target expression profile
 */
export interface TargetExpressionProfile {
  readonly tissueExpression: readonly TissueExpressionLevel[];
  readonly cancerExpression?: readonly CancerExpressionLevel[];
  readonly selectivityRatio?: number;
  readonly normalTissueRisk?: 'low' | 'moderate' | 'high';
}

/**
 * Tissue expression level
 */
export interface TissueExpressionLevel {
  readonly tissue: string;
  readonly level: number;
  readonly unit: 'TPM' | 'nTPM' | 'pTPM';
  readonly reliability?: 'high' | 'medium' | 'low';
}

/**
 * Cancer expression level
 */
export interface CancerExpressionLevel {
  readonly cancerType: string;
  readonly level: number;
  readonly foldChangeVsNormal?: number;
  readonly sampleCount?: number;
}

/**
 * Genetic evidence for target
 */
export interface GeneticEvidence {
  readonly type: 'GWAS' | 'somatic_mutation' | 'amplification' | 'deletion' | 'fusion' | 'expression_change';
  readonly cancerType: string;
  readonly frequency?: number;
  readonly effectSize?: number;
  readonly pValue?: number;
  readonly source?: string;
  readonly pubmedId?: string;
}

/**
 * Target safety profile
 */
export interface TargetSafetyProfile {
  readonly essentialGene?: boolean;
  readonly embryonicLethal?: boolean;
  readonly knockoutPhenotypes?: readonly string[];
  readonly tissueDistribution?: string;
  readonly safetyRisk: 'low' | 'moderate' | 'high';
  readonly concernAreas?: readonly string[];
}

/**
 * Core Drug Target entity
 */
export interface DrugTarget {
  readonly id: string;
  readonly name: string;
  readonly geneSymbol: string;
  readonly geneId?: string;
  readonly uniprotId?: string;
  readonly targetType: TargetType;
  readonly description?: string;
  readonly function?: string;
  readonly pathways?: readonly string[];
  readonly cancerRelevance?: TargetCancerRelevance;
  readonly druggability?: TargetDruggability;
  readonly expressionProfile?: TargetExpressionProfile;
  readonly geneticEvidence?: readonly GeneticEvidence[];
  readonly safetyProfile?: TargetSafetyProfile;
  readonly knownDrugs?: readonly TargetDrug[];
  readonly structuralInfo?: TargetStructure;
  readonly validationLevel?: TargetValidationLevel;
}

/**
 * Cancer relevance for a target
 */
export interface TargetCancerRelevance {
  readonly isOncogene?: boolean;
  readonly isTumorSuppressor?: boolean;
  readonly cancerTypes: readonly string[];
  readonly hallmarks?: readonly string[];
  readonly mechanismOfAction?: string;
}

/**
 * Drug information for a target
 */
export interface TargetDrug {
  readonly drugId: string;
  readonly drugName: string;
  readonly status: 'approved' | 'clinical' | 'preclinical';
  readonly action: string;
  readonly affinity?: number;
  readonly affinityUnit?: string;
}

/**
 * Structural information for a target
 */
export interface TargetStructure {
  readonly hasStructure: boolean;
  readonly pdbIds?: readonly string[];
  readonly alphafoldId?: string;
  readonly coverage?: number;
  readonly resolution?: number;
  readonly bindingSites?: readonly StructuralBindingSite[];
}

/**
 * Binding site from structural analysis
 */
export interface StructuralBindingSite {
  readonly id: string;
  readonly name?: string;
  readonly residues: readonly string[];
  readonly volume?: number;
  readonly type: 'catalytic' | 'allosteric' | 'substrate' | 'cofactor' | 'interface';
  readonly knownLigands?: readonly string[];
}

/**
 * Target identification hit
 */
export interface TargetIdentificationHit {
  readonly target: DrugTarget;
  readonly score: number;
  readonly evidence: readonly TargetEvidence[];
  readonly ranking: number;
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Evidence supporting target identification
 */
export interface TargetEvidence {
  readonly type: 'genetic' | 'expression' | 'essentiality' | 'pathway' | 'literature' | 'drug_response';
  readonly description: string;
  readonly score?: number;
  readonly source?: string;
  readonly pubmedId?: string;
}

/**
 * Target prioritization result
 */
export interface TargetPrioritization {
  readonly targets: readonly PrioritizedTarget[];
  readonly criteria: readonly PrioritizationCriterion[];
  readonly methodology?: string;
  readonly date: string;
}

/**
 * Prioritized target with scores
 */
export interface PrioritizedTarget {
  readonly target: DrugTarget;
  readonly overallScore: number;
  readonly rank: number;
  readonly criteriaScores: readonly CriterionScore[];
  readonly recommendation?: string;
}

/**
 * Prioritization criterion
 */
export interface PrioritizationCriterion {
  readonly name: string;
  readonly weight: number;
  readonly description?: string;
}

/**
 * Score for a criterion
 */
export interface CriterionScore {
  readonly criterion: string;
  readonly score: number;
  readonly evidence?: string;
}

/**
 * Target search criteria
 */
export interface TargetSearchCriteria {
  readonly name?: string;
  readonly geneSymbol?: string;
  readonly targetType?: TargetType;
  readonly cancerType?: string;
  readonly isDruggable?: boolean;
  readonly hasApprovedDrug?: boolean;
  readonly pathwayId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Off-target prediction
 */
export interface OffTargetPrediction {
  readonly primaryTarget: string;
  readonly offTarget: DrugTarget;
  readonly similarity: number;
  readonly predictedAffinity?: number;
  readonly predictedAction?: string;
  readonly safetyImplication?: 'beneficial' | 'neutral' | 'concerning';
  readonly basis: 'structural' | 'sequence' | 'pharmacophore' | 'machine_learning';
}

/**
 * Synthetic lethality partner
 */
export interface SyntheticLethalPartner {
  readonly gene1: string;
  readonly gene2: string;
  readonly cancerType?: string;
  readonly evidenceType: 'experimental' | 'computational' | 'clinical';
  readonly confidenceScore?: number;
  readonly therapeuticImplication?: string;
  readonly source?: string;
}

/**
 * Target deconvolution result
 */
export interface TargetDeconvolution {
  readonly compound: string;
  readonly identifiedTargets: readonly DeconvolutionHit[];
  readonly method: 'chemoproteomics' | 'affinity_pulldown' | 'thermal_profiling' | 'computational';
  readonly confidence: string;
}

/**
 * Hit from target deconvolution
 */
export interface DeconvolutionHit {
  readonly target: DrugTarget;
  readonly score: number;
  readonly bindingAffinity?: number;
  readonly directBinding?: boolean;
  readonly functionalValidation?: boolean;
}
