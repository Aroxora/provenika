/**
 * Treatment Domain Models
 *
 * Core types for cancer treatment and therapy regimens
 */

/**
 * Treatment modality
 */
export type TreatmentModality =
  | 'surgery'
  | 'chemotherapy'
  | 'radiation'
  | 'targeted_therapy'
  | 'immunotherapy'
  | 'hormone_therapy'
  | 'stem_cell_transplant'
  | 'CAR_T_cell'
  | 'gene_therapy'
  | 'photodynamic'
  | 'ablation'
  | 'embolization'
  | 'supportive_care';

/**
 * Treatment intent
 */
export type TreatmentIntent =
  | 'curative'
  | 'palliative'
  | 'adjuvant'
  | 'neoadjuvant'
  | 'maintenance'
  | 'salvage'
  | 'consolidation';

/**
 * Therapy regimen definition
 */
export interface TherapyRegimen {
  readonly id: string;
  readonly name: string;
  readonly commonName?: string;
  readonly modality: TreatmentModality;
  readonly drugs: readonly RegimenDrug[];
  readonly schedule?: DosingSchedule;
  readonly cycleLength?: number;
  readonly numberOfCycles?: number;
  readonly indication?: string;
  readonly cancerTypes: readonly string[];
  readonly lineOfTherapy?: 'first_line' | 'second_line' | 'third_line_plus';
  readonly approvalStatus?: ApprovalStatus;
  readonly evidenceLevel?: TreatmentEvidenceLevel;
  readonly expectedEfficacy?: EfficacyData;
  readonly toxicityProfile?: ToxicityProfile;
  readonly references?: readonly string[];
}

/**
 * Drug within a regimen
 */
export interface RegimenDrug {
  readonly drugId: string;
  readonly drugName: string;
  readonly genericName?: string;
  readonly role: 'primary' | 'combination' | 'supportive';
  readonly dose?: Dosage;
  readonly route: AdministrationRoute;
  readonly schedule?: string;
}

/**
 * Dosing information
 */
export interface Dosage {
  readonly amount: number;
  readonly unit: 'mg' | 'mg/m2' | 'mg/kg' | 'mcg' | 'units' | 'AUC';
  readonly frequency: string;
  readonly maxDose?: number;
  readonly adjustments?: readonly DoseAdjustment[];
}

/**
 * Dose adjustment rules
 */
export interface DoseAdjustment {
  readonly condition: string;
  readonly adjustment: string;
  readonly parameter?: string;
  readonly threshold?: number;
}

/**
 * Drug administration route
 */
export type AdministrationRoute =
  | 'oral'
  | 'intravenous'
  | 'subcutaneous'
  | 'intramuscular'
  | 'intrathecal'
  | 'topical'
  | 'inhalation'
  | 'transdermal';

/**
 * Dosing schedule
 */
export interface DosingSchedule {
  readonly frequency: string;
  readonly daysOn?: readonly number[];
  readonly daysOff?: number;
  readonly cycleDescription?: string;
}

/**
 * Regulatory approval status
 */
export interface ApprovalStatus {
  readonly fda?: 'approved' | 'breakthrough' | 'accelerated' | 'priority_review' | 'not_approved';
  readonly ema?: 'approved' | 'conditional' | 'not_approved';
  readonly approvalDate?: string;
  readonly indication?: string;
  readonly biomarkerRequired?: string;
}

/**
 * Evidence level for treatment (NCCN categories)
 */
export type TreatmentEvidenceLevel =
  | 'category_1'
  | 'category_2A'
  | 'category_2B'
  | 'category_3';

/**
 * Efficacy data for a treatment
 */
export interface EfficacyData {
  readonly responseRate?: number;
  readonly completeResponseRate?: number;
  readonly medianPFS?: number;
  readonly medianOS?: number;
  readonly oneyearSurvival?: number;
  readonly twoyearSurvival?: number;
  readonly fiveyearSurvival?: number;
  readonly durationOfResponse?: number;
  readonly source?: string;
  readonly trialId?: string;
}

/**
 * Toxicity profile for a treatment
 */
export interface ToxicityProfile {
  readonly commonAdverseEvents: readonly AdverseEventProfile[];
  readonly seriousAdverseEvents?: readonly AdverseEventProfile[];
  readonly blackBoxWarnings?: readonly string[];
  readonly contraindicationsAbsolute?: readonly string[];
  readonly contraindicationsRelative?: readonly string[];
  readonly monitoringRequired?: readonly MonitoringRequirement[];
}

/**
 * Adverse event profile
 */
export interface AdverseEventProfile {
  readonly event: string;
  readonly frequency: 'very_common' | 'common' | 'uncommon' | 'rare' | 'very_rare';
  readonly percentageAllGrades?: number;
  readonly percentageGrade3Plus?: number;
  readonly management?: string;
}

/**
 * Monitoring requirement during treatment
 */
export interface MonitoringRequirement {
  readonly parameter: string;
  readonly frequency: string;
  readonly rationale?: string;
  readonly actionThreshold?: string;
}

/**
 * Treatment recommendation
 */
export interface TreatmentRecommendation {
  readonly id: string;
  readonly patientId?: string;
  readonly regimens: readonly RecommendedRegimen[];
  readonly reasoning: string;
  readonly evidenceSummary?: string;
  readonly guidelineSource?: string;
  readonly generatedDate: string;
  readonly disclaimer?: string;
}

/**
 * Recommended regimen with ranking
 */
export interface RecommendedRegimen {
  readonly regimen: TherapyRegimen;
  readonly rank: number;
  readonly score?: number;
  readonly rationale: string;
  readonly considerations?: readonly string[];
  readonly clinicalTrials?: readonly string[];
  readonly contraindications?: readonly string[];
}

/**
 * Risk stratification result
 */
export interface RiskStratification {
  readonly patientId?: string;
  readonly model: string;
  readonly version?: string;
  readonly riskCategory: 'low' | 'intermediate' | 'high' | 'very_high';
  readonly riskScore?: number;
  readonly survivalEstimate?: SurvivalEstimate;
  readonly factors: readonly RiskFactor[];
  readonly calculatedDate: string;
}

/**
 * Survival estimate
 */
export interface SurvivalEstimate {
  readonly oneyear?: number;
  readonly twoyear?: number;
  readonly fiveyear?: number;
  readonly median?: number;
  readonly unit: 'months' | 'years';
  readonly confidence?: number;
}

/**
 * Risk factor in stratification
 */
export interface RiskFactor {
  readonly name: string;
  readonly value: string | number;
  readonly contribution: 'favorable' | 'unfavorable' | 'neutral';
  readonly weight?: number;
}

/**
 * Drug-drug interaction
 */
export interface DrugDrugInteraction {
  readonly drugA: string;
  readonly drugB: string;
  readonly severity: 'major' | 'moderate' | 'minor';
  readonly effect: string;
  readonly mechanism?: string;
  readonly management: string;
  readonly evidence: 'established' | 'theoretical' | 'suspected';
}

/**
 * Treatment search criteria
 */
export interface TreatmentSearchCriteria {
  readonly cancerType?: string;
  readonly modality?: TreatmentModality;
  readonly lineOfTherapy?: string;
  readonly biomarker?: string;
  readonly drugName?: string;
  readonly isApproved?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Pharmacogenomic consideration
 */
export interface PharmacogenomicConsideration {
  readonly drug: string;
  readonly gene: string;
  readonly variant: string;
  readonly phenotype: 'poor_metabolizer' | 'intermediate_metabolizer' | 'normal_metabolizer' | 'rapid_metabolizer' | 'ultrarapid_metabolizer';
  readonly recommendation: string;
  readonly doseAdjustment?: string;
  readonly evidenceLevel: string;
  readonly source: 'CPIC' | 'DPWG' | 'FDA' | 'other';
}

/**
 * Combination therapy assessment
 */
export interface CombinationAssessment {
  readonly drugs: readonly string[];
  readonly synergy?: 'synergistic' | 'additive' | 'antagonistic' | 'unknown';
  readonly rationale: string;
  readonly toxicityOverlap?: readonly string[];
  readonly dosingConsiderations?: string;
  readonly clinicalEvidence?: string;
}
