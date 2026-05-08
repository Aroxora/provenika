/**
 * Biomarker Domain Models
 *
 * Core types for cancer biomarkers and diagnostic panels
 */

/**
 * Biomarker type classification
 */
export type BiomarkerType =
  | 'protein'
  | 'genetic'
  | 'epigenetic'
  | 'transcriptomic'
  | 'metabolic'
  | 'imaging'
  | 'circulating_tumor_cells'
  | 'circulating_tumor_dna'
  | 'exosome'
  | 'microbiome'
  | 'composite';

/**
 * Biomarker clinical utility
 */
export type BiomarkerUtility =
  | 'diagnostic'
  | 'prognostic'
  | 'predictive'
  | 'monitoring'
  | 'screening'
  | 'pharmacodynamic'
  | 'risk_assessment';

/**
 * FDA approval status for a biomarker
 */
export interface BiomarkerApproval {
  readonly status: 'FDA_approved' | 'FDA_cleared' | 'CE_marked' | 'CLIA_validated' | 'research_use_only';
  readonly indication?: string;
  readonly approvalDate?: string;
  readonly approvalDocument?: string;
}

/**
 * Biomarker measurement method
 */
export interface MeasurementMethod {
  readonly technique: string;
  readonly platform?: string;
  readonly assayName?: string;
  readonly manufacturer?: string;
  readonly sensitivity?: number;
  readonly specificity?: number;
  readonly turnaroundTime?: string;
}

/**
 * Clinical validation evidence for a biomarker
 */
export interface ClinicalValidation {
  readonly studyType: 'prospective' | 'retrospective' | 'meta_analysis' | 'case_control';
  readonly sampleSize: number;
  readonly endpoint?: string;
  readonly sensitivity?: number;
  readonly specificity?: number;
  readonly auc?: number;
  readonly hazardRatio?: number;
  readonly pValue?: number;
  readonly pubmedId?: string;
  readonly level: 'A' | 'B' | 'C' | 'D';
}

/**
 * Drug association for a predictive biomarker
 */
export interface BiomarkerDrugAssociation {
  readonly drugName: string;
  readonly drugClass?: string;
  readonly responseType: 'sensitivity' | 'resistance';
  readonly evidenceLevel: 'FDA_approved' | 'guideline' | 'clinical_trial' | 'preclinical';
  readonly indication?: string;
  readonly pubmedIds?: readonly string[];
}

/**
 * Core Biomarker entity
 */
export interface Biomarker {
  readonly id: string;
  readonly name: string;
  readonly symbol?: string;
  readonly aliases?: readonly string[];
  readonly type: BiomarkerType;
  readonly utilities: readonly BiomarkerUtility[];
  readonly description?: string;
  readonly geneSymbol?: string;
  readonly proteinName?: string;
  readonly cancerTypes: readonly string[];
  readonly normalRange?: BiomarkerRange;
  readonly cutoffs?: readonly BiomarkerCutoff[];
  readonly measurementMethods?: readonly MeasurementMethod[];
  readonly approval?: BiomarkerApproval;
  readonly validations?: readonly ClinicalValidation[];
  readonly drugAssociations?: readonly BiomarkerDrugAssociation[];
  readonly references?: readonly string[];
}

/**
 * Normal range for a biomarker
 */
export interface BiomarkerRange {
  readonly min?: number;
  readonly max?: number;
  readonly unit: string;
  readonly population?: string;
}

/**
 * Clinical cutoff for biomarker interpretation
 */
export interface BiomarkerCutoff {
  readonly value: number;
  readonly unit: string;
  readonly interpretation: string;
  readonly utility: BiomarkerUtility;
  readonly cancerType?: string;
  readonly source?: string;
}

/**
 * Biomarker test result
 */
export interface BiomarkerResult {
  readonly biomarkerId: string;
  readonly biomarkerName: string;
  readonly value: number | string | boolean;
  readonly unit?: string;
  readonly qualitativeResult?: 'positive' | 'negative' | 'equivocal' | 'indeterminate';
  readonly percentile?: number;
  readonly interpretation?: string;
  readonly isAbnormal?: boolean;
  readonly testDate: string;
  readonly method?: string;
  readonly labName?: string;
  readonly notes?: string;
}

/**
 * Panel of biomarkers for comprehensive testing
 */
export interface BiomarkerPanel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly biomarkers: readonly Biomarker[];
  readonly indication: string;
  readonly cancerTypes?: readonly string[];
  readonly sampleRequirements?: SampleRequirements;
  readonly turnaroundTime?: string;
  readonly manufacturer?: string;
  readonly approval?: BiomarkerApproval;
  readonly cost?: number;
}

/**
 * Sample requirements for a biomarker panel
 */
export interface SampleRequirements {
  readonly sampleType: 'blood' | 'tissue' | 'urine' | 'saliva' | 'csf' | 'other';
  readonly minimumVolume?: string;
  readonly preservationMethod?: string;
  readonly specialInstructions?: string;
}

/**
 * Biomarker panel result
 */
export interface PanelResult {
  readonly panelId: string;
  readonly panelName: string;
  readonly patientId?: string;
  readonly testDate: string;
  readonly results: readonly BiomarkerResult[];
  readonly overallInterpretation?: string;
  readonly recommendations?: readonly string[];
  readonly reportUrl?: string;
}

/**
 * Liquid biopsy specific result
 */
export interface LiquidBiopsyResult {
  readonly sampleId: string;
  readonly sampleType: 'ctDNA' | 'CTC' | 'exosome';
  readonly collectionDate: string;
  readonly ctdnaFraction?: number;
  readonly ctcCount?: number;
  readonly mutations?: readonly LiquidBiopsyMutation[];
  readonly copyNumberAlterations?: readonly string[];
  readonly msi?: 'MSI-H' | 'MSI-L' | 'MSS';
  readonly tmb?: number;
  readonly qualityMetrics?: LiquidBiopsyQuality;
}

/**
 * Mutation detected in liquid biopsy
 */
export interface LiquidBiopsyMutation {
  readonly gene: string;
  readonly mutation: string;
  readonly vaf: number;
  readonly isActionable: boolean;
  readonly therapyImplications?: readonly string[];
}

/**
 * Quality metrics for liquid biopsy
 */
export interface LiquidBiopsyQuality {
  readonly inputDna?: number;
  readonly uniqueMolecules?: number;
  readonly meanCoverage?: number;
  readonly qcStatus: 'pass' | 'fail' | 'borderline';
}

/**
 * Biomarker search criteria
 */
export interface BiomarkerSearchCriteria {
  readonly name?: string;
  readonly type?: BiomarkerType;
  readonly utility?: BiomarkerUtility;
  readonly cancerType?: string;
  readonly isApproved?: boolean;
  readonly hasDrugAssociation?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Biomarker trend analysis
 */
export interface BiomarkerTrend {
  readonly biomarkerId: string;
  readonly biomarkerName: string;
  readonly measurements: readonly BiomarkerMeasurement[];
  readonly trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  readonly percentChange?: number;
  readonly clinicalSignificance?: string;
}

/**
 * Individual biomarker measurement in a trend
 */
export interface BiomarkerMeasurement {
  readonly date: string;
  readonly value: number;
  readonly unit: string;
}
