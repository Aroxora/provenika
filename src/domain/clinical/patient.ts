/**
 * Patient Domain Models
 *
 * Core types for patient data in clinical cancer research
 * Note: Designed for research contexts, not production clinical systems
 */

/**
 * Patient demographic information
 */
export interface PatientDemographics {
  readonly age?: number;
  readonly ageAtDiagnosis?: number;
  readonly sex?: 'male' | 'female' | 'other' | 'unknown';
  readonly ethnicity?: string;
  readonly race?: string;
}

/**
 * Cancer diagnosis information
 */
export interface CancerDiagnosis {
  readonly id: string;
  readonly cancerType: string;
  readonly cancerTypeCode?: string;
  readonly histology?: string;
  readonly histologyCode?: string;
  readonly stage?: TumorStage;
  readonly grade?: TumorGrade;
  readonly diagnosisDate?: string;
  readonly primarySite?: string;
  readonly laterality?: 'left' | 'right' | 'bilateral' | 'not_applicable';
  readonly metastaticSites?: readonly string[];
  readonly isRecurrent?: boolean;
  readonly isPrimary?: boolean;
}

/**
 * Tumor staging information
 */
export interface TumorStage {
  readonly system: 'AJCC' | 'FIGO' | 'Ann_Arbor' | 'Binet' | 'Rai' | 'other';
  readonly version?: string;
  readonly stage: string;
  readonly tStage?: string;
  readonly nStage?: string;
  readonly mStage?: string;
  readonly clinicalStage?: string;
  readonly pathologicalStage?: string;
}

/**
 * Tumor grade information
 */
export interface TumorGrade {
  readonly system: string;
  readonly grade: string;
  readonly score?: number;
  readonly description?: string;
}

/**
 * Patient performance status
 */
export interface PerformanceStatus {
  readonly scale: 'ECOG' | 'Karnofsky' | 'Lansky';
  readonly score: number;
  readonly assessmentDate?: string;
}

/**
 * Molecular profile of a tumor
 */
export interface MolecularProfile {
  readonly profileId: string;
  readonly sampleId?: string;
  readonly sampleType?: 'tumor' | 'blood' | 'cfDNA' | 'bone_marrow' | 'other';
  readonly collectionDate?: string;
  readonly mutations?: readonly string[];
  readonly copyNumberAlterations?: readonly string[];
  readonly fusions?: readonly string[];
  readonly expressionSignatures?: readonly string[];
  readonly msi?: 'MSI-H' | 'MSI-L' | 'MSS' | 'unknown';
  readonly tmb?: number;
  readonly tmbCategory?: 'high' | 'intermediate' | 'low';
  readonly pdl1Expression?: number;
  readonly hrdScore?: number;
}

/**
 * Treatment history entry
 */
export interface TreatmentHistory {
  readonly treatmentId: string;
  readonly treatmentType: TreatmentType;
  readonly regimen?: string;
  readonly agents?: readonly string[];
  readonly startDate?: string;
  readonly endDate?: string;
  readonly lineOfTherapy?: number;
  readonly response?: TreatmentResponse;
  readonly reasonForDiscontinuation?: string;
  readonly adverseEvents?: readonly AdverseEvent[];
}

/**
 * Treatment type classification
 */
export type TreatmentType =
  | 'chemotherapy'
  | 'targeted_therapy'
  | 'immunotherapy'
  | 'hormone_therapy'
  | 'radiation'
  | 'surgery'
  | 'stem_cell_transplant'
  | 'CAR_T'
  | 'combination'
  | 'supportive_care'
  | 'clinical_trial'
  | 'other';

/**
 * Treatment response assessment
 */
export interface TreatmentResponse {
  readonly criteria: 'RECIST' | 'iRECIST' | 'Lugano' | 'RANO' | 'other';
  readonly response: ResponseCategory;
  readonly assessmentDate?: string;
  readonly durationOfResponse?: number;
  readonly progressionFreeInterval?: number;
}

/**
 * Response category
 */
export type ResponseCategory =
  | 'complete_response'
  | 'partial_response'
  | 'stable_disease'
  | 'progressive_disease'
  | 'not_evaluable'
  | 'not_assessed';

/**
 * Adverse event information
 */
export interface AdverseEvent {
  readonly term: string;
  readonly grade: 1 | 2 | 3 | 4 | 5;
  readonly ctcaeCode?: string;
  readonly onsetDate?: string;
  readonly resolutionDate?: string;
  readonly outcome?: string;
  readonly relatedness?: 'related' | 'possibly_related' | 'unlikely_related' | 'unrelated';
}

/**
 * Core Patient entity
 */
export interface Patient {
  readonly id: string;
  readonly studyId?: string;
  readonly demographics?: PatientDemographics;
  readonly diagnoses: readonly CancerDiagnosis[];
  readonly molecularProfiles?: readonly MolecularProfile[];
  readonly treatmentHistory?: readonly TreatmentHistory[];
  readonly performanceStatus?: PerformanceStatus;
  readonly comorbidities?: readonly string[];
  readonly familyHistory?: FamilyHistory;
  readonly vitalStatus?: VitalStatus;
  readonly biomarkers?: readonly PatientBiomarker[];
}

/**
 * Family history of cancer
 */
export interface FamilyHistory {
  readonly hasFamilyHistory: boolean;
  readonly affectedRelatives?: readonly AffectedRelative[];
  readonly hereditarySyndromes?: readonly string[];
}

/**
 * Affected family member
 */
export interface AffectedRelative {
  readonly relationship: string;
  readonly cancerType: string;
  readonly ageAtDiagnosis?: number;
}

/**
 * Vital status information
 */
export interface VitalStatus {
  readonly status: 'alive' | 'deceased' | 'unknown';
  readonly lastContactDate?: string;
  readonly survivalMonths?: number;
  readonly causeOfDeath?: string;
}

/**
 * Patient biomarker measurement
 */
export interface PatientBiomarker {
  readonly biomarkerId: string;
  readonly biomarkerName: string;
  readonly value: number | string;
  readonly unit?: string;
  readonly referenceRange?: string;
  readonly interpretation?: 'normal' | 'abnormal' | 'high' | 'low' | 'positive' | 'negative';
  readonly measurementDate?: string;
  readonly sampleType?: string;
}

/**
 * Patient cohort for analysis
 */
export interface PatientCohort {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly patients: readonly Patient[];
  readonly inclusionCriteria?: readonly string[];
  readonly exclusionCriteria?: readonly string[];
  readonly size: number;
  readonly createdDate?: string;
}

/**
 * Patient search criteria
 */
export interface PatientSearchCriteria {
  readonly cancerType?: string;
  readonly stage?: string;
  readonly mutation?: string;
  readonly treatmentType?: TreatmentType;
  readonly responseCategory?: ResponseCategory;
  readonly ageMin?: number;
  readonly ageMax?: number;
  readonly sex?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Survival analysis result
 */
export interface SurvivalAnalysis {
  readonly cohortId: string;
  readonly analysisType: 'overall_survival' | 'progression_free_survival' | 'disease_free_survival';
  readonly medianSurvival?: number;
  readonly survivalRate?: number;
  readonly timePoint?: number;
  readonly confidenceInterval?: [number, number];
  readonly kaplanMeierData?: readonly KaplanMeierPoint[];
  readonly hazardRatio?: number;
  readonly pValue?: number;
}

/**
 * Kaplan-Meier curve data point
 */
export interface KaplanMeierPoint {
  readonly time: number;
  readonly survivalProbability: number;
  readonly atRisk: number;
  readonly events: number;
  readonly censored: number;
}
