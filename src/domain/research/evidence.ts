/**
 * Evidence Domain Models
 *
 * Core types for evidence levels and research synthesis
 */

/**
 * Evidence level classification
 */
export type EvidenceLevel =
  | 'level_1a'   // Systematic review of RCTs
  | 'level_1b'   // Individual RCT
  | 'level_2a'   // Systematic review of cohort studies
  | 'level_2b'   // Individual cohort study
  | 'level_3a'   // Systematic review of case-control
  | 'level_3b'   // Individual case-control
  | 'level_4'    // Case series
  | 'level_5'    // Expert opinion
  | 'preclinical' // Preclinical/in vitro
  | 'computational'; // Computational prediction

/**
 * Recommendation grade
 */
export type RecommendationGrade = 'A' | 'B' | 'C' | 'D' | 'I';

/**
 * Evidence direction
 */
export type EvidenceDirection = 'supports' | 'refutes' | 'neutral' | 'mixed';

/**
 * Study design type
 */
export type StudyDesign =
  | 'meta_analysis'
  | 'systematic_review'
  | 'randomized_controlled_trial'
  | 'non_randomized_trial'
  | 'cohort_prospective'
  | 'cohort_retrospective'
  | 'case_control'
  | 'cross_sectional'
  | 'case_series'
  | 'case_report'
  | 'preclinical_in_vivo'
  | 'preclinical_in_vitro'
  | 'computational';

/**
 * Core Evidence entity
 */
export interface Evidence {
  readonly id: string;
  readonly statement: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly direction: EvidenceDirection;
  readonly confidence: 'high' | 'moderate' | 'low' | 'very_low';
  readonly source: EvidenceSource;
  readonly context?: EvidenceContext;
  readonly strength?: EvidenceStrength;
  readonly limitations?: readonly string[];
  readonly applicability?: Applicability;
}

/**
 * Evidence source information
 */
export interface EvidenceSource {
  readonly type: 'publication' | 'clinical_trial' | 'database' | 'guideline' | 'expert';
  readonly id?: string;
  readonly name?: string;
  readonly citation?: string;
  readonly url?: string;
  readonly publicationDate?: string;
  readonly authors?: readonly string[];
}

/**
 * Context for evidence applicability
 */
export interface EvidenceContext {
  readonly cancerType?: string;
  readonly stage?: string;
  readonly biomarker?: string;
  readonly population?: string;
  readonly setting?: 'clinical' | 'preclinical' | 'computational';
  readonly treatmentLine?: string;
}

/**
 * Evidence strength metrics
 */
export interface EvidenceStrength {
  readonly sampleSize?: number;
  readonly effectSize?: number;
  readonly confidenceInterval?: [number, number];
  readonly pValue?: number;
  readonly biasRisk?: 'low' | 'moderate' | 'high' | 'unclear';
  readonly consistency?: 'consistent' | 'inconsistent' | 'limited';
}

/**
 * Applicability of evidence
 */
export interface Applicability {
  readonly populations: readonly string[];
  readonly settings: readonly string[];
  readonly directness: 'direct' | 'indirect';
  readonly generalizability: 'high' | 'moderate' | 'low';
}

/**
 * Evidence synthesis/summary
 */
export interface EvidenceSynthesis {
  readonly id: string;
  readonly topic: string;
  readonly question: string;
  readonly evidence: readonly Evidence[];
  readonly conclusion: string;
  readonly overallLevel: EvidenceLevel;
  readonly overallConfidence: 'high' | 'moderate' | 'low' | 'very_low';
  readonly recommendation?: Recommendation;
  readonly gaps: readonly string[];
  readonly methodology?: string;
  readonly synthesisDate: string;
}

/**
 * Clinical recommendation
 */
export interface Recommendation {
  readonly statement: string;
  readonly grade: RecommendationGrade;
  readonly strength: 'strong' | 'weak' | 'conditional';
  readonly direction: 'for' | 'against';
  readonly rationale: string;
  readonly considerations?: readonly string[];
  readonly source?: string;
}

/**
 * GRADE evidence assessment
 */
export interface GRADEAssessment {
  readonly outcome: string;
  readonly studyDesign: StudyDesign;
  readonly riskOfBias: GRADEFactor;
  readonly inconsistency: GRADEFactor;
  readonly indirectness: GRADEFactor;
  readonly imprecision: GRADEFactor;
  readonly publicationBias: GRADEFactor;
  readonly upgradeFactors?: readonly GRADEUpgrade[];
  readonly finalQuality: 'high' | 'moderate' | 'low' | 'very_low';
  readonly reasoning: string;
}

/**
 * GRADE factor assessment
 */
export interface GRADEFactor {
  readonly level: 'none' | 'serious' | 'very_serious';
  readonly reason?: string;
  readonly downgrade: 0 | 1 | 2;
}

/**
 * GRADE upgrade factor
 */
export interface GRADEUpgrade {
  readonly factor: 'large_effect' | 'dose_response' | 'confounders_minimized';
  readonly upgrade: 1 | 2;
  readonly reason: string;
}

/**
 * Biomarker evidence
 */
export interface BiomarkerEvidence extends Evidence {
  readonly biomarker: string;
  readonly biomarkerType: 'predictive' | 'prognostic' | 'diagnostic';
  readonly drug?: string;
  readonly cancerType: string;
  readonly actionability: 'FDA_approved' | 'guideline' | 'clinical_trial' | 'preclinical';
  readonly tierLevel?: 'I' | 'II' | 'III' | 'IV';
}

/**
 * Therapy evidence
 */
export interface TherapyEvidence extends Evidence {
  readonly therapy: string;
  readonly comparator?: string;
  readonly endpoint: string;
  readonly effectMeasure?: string;
  readonly effectSize?: number;
  readonly hazardRatio?: number;
  readonly responseRate?: number;
  readonly medianPFS?: number;
  readonly medianOS?: number;
}

/**
 * Evidence search criteria
 */
export interface EvidenceSearchCriteria {
  readonly topic?: string;
  readonly evidenceLevel?: EvidenceLevel;
  readonly cancerType?: string;
  readonly biomarker?: string;
  readonly therapy?: string;
  readonly minConfidence?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Evidence gap analysis
 */
export interface EvidenceGapAnalysis {
  readonly topic: string;
  readonly gaps: readonly EvidenceGap[];
  readonly researchPriorities: readonly ResearchPriority[];
  readonly analysisDate: string;
}

/**
 * Identified evidence gap
 */
export interface EvidenceGap {
  readonly description: string;
  readonly importance: 'high' | 'medium' | 'low';
  readonly domain: 'efficacy' | 'safety' | 'population' | 'comparator' | 'outcome' | 'setting';
  readonly suggestedStudies?: readonly string[];
}

/**
 * Research priority
 */
export interface ResearchPriority {
  readonly question: string;
  readonly rationale: string;
  readonly priority: 1 | 2 | 3;
  readonly feasibility: 'high' | 'medium' | 'low';
  readonly suggestedDesign?: StudyDesign;
}

/**
 * Conflicting evidence assessment
 */
export interface ConflictingEvidence {
  readonly topic: string;
  readonly conflictingStatements: readonly Evidence[];
  readonly possibleReasons: readonly string[];
  readonly resolution?: string;
  readonly recommendation?: string;
}

/**
 * Evidence timeline
 */
export interface EvidenceTimeline {
  readonly topic: string;
  readonly events: readonly EvidenceEvent[];
  readonly trends?: string;
}

/**
 * Event in evidence timeline
 */
export interface EvidenceEvent {
  readonly date: string;
  readonly description: string;
  readonly type: 'publication' | 'approval' | 'guideline_update' | 'trial_result' | 'safety_alert';
  readonly significance: 'major' | 'minor';
  readonly source?: string;
}

/**
 * Comparative evidence summary
 */
export interface ComparativeEvidence {
  readonly interventionA: string;
  readonly interventionB: string;
  readonly outcome: string;
  readonly directComparison?: DirectComparison;
  readonly indirectComparison?: IndirectComparison;
  readonly conclusion: string;
  readonly confidence: string;
}

/**
 * Direct head-to-head comparison
 */
export interface DirectComparison {
  readonly source: EvidenceSource;
  readonly result: string;
  readonly effectSize?: number;
  readonly confidence?: string;
}

/**
 * Indirect comparison (network meta-analysis)
 */
export interface IndirectComparison {
  readonly method: 'network_meta_analysis' | 'matching_adjusted' | 'simulated_treatment';
  readonly source: EvidenceSource;
  readonly result: string;
  readonly effectSize?: number;
  readonly confidence?: string;
  readonly limitations: readonly string[];
}
