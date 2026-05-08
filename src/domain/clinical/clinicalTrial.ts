/**
 * Clinical Trial Domain Models
 *
 * Core types for clinical trial data from ClinicalTrials.gov and other sources
 */

/**
 * Clinical trial status
 */
export type TrialStatus =
  | 'not_yet_recruiting'
  | 'recruiting'
  | 'enrolling_by_invitation'
  | 'active_not_recruiting'
  | 'suspended'
  | 'terminated'
  | 'completed'
  | 'withdrawn'
  | 'unknown';

/**
 * Clinical trial phase
 */
export type TrialPhase =
  | 'early_phase_1'
  | 'phase_1'
  | 'phase_1_2'
  | 'phase_2'
  | 'phase_2_3'
  | 'phase_3'
  | 'phase_4'
  | 'not_applicable';

/**
 * Study type classification
 */
export type StudyType =
  | 'interventional'
  | 'observational'
  | 'expanded_access'
  | 'registry';

/**
 * Primary purpose of the trial
 */
export type PrimaryPurpose =
  | 'treatment'
  | 'prevention'
  | 'diagnostic'
  | 'supportive_care'
  | 'screening'
  | 'health_services_research'
  | 'basic_science'
  | 'device_feasibility'
  | 'other';

/**
 * Intervention type
 */
export type InterventionType =
  | 'drug'
  | 'biological'
  | 'device'
  | 'procedure'
  | 'radiation'
  | 'behavioral'
  | 'genetic'
  | 'dietary_supplement'
  | 'combination_product'
  | 'diagnostic_test'
  | 'other';

/**
 * Trial intervention details
 */
export interface TrialIntervention {
  readonly name: string;
  readonly type: InterventionType;
  readonly description?: string;
  readonly armGroupLabels?: readonly string[];
  readonly otherNames?: readonly string[];
}

/**
 * Trial arm/group
 */
export interface TrialArm {
  readonly label: string;
  readonly type: 'experimental' | 'active_comparator' | 'placebo_comparator' | 'sham_comparator' | 'no_intervention' | 'other';
  readonly description?: string;
  readonly interventions?: readonly string[];
}

/**
 * Trial outcome measure
 */
export interface OutcomeMeasure {
  readonly type: 'primary' | 'secondary' | 'other';
  readonly measure: string;
  readonly description?: string;
  readonly timeFrame?: string;
}

/**
 * Eligibility criteria
 */
export interface EligibilityCriteria {
  readonly criteria: string;
  readonly gender: 'all' | 'female' | 'male';
  readonly minimumAge?: string;
  readonly maximumAge?: string;
  readonly healthyVolunteers: boolean;
  readonly inclusionCriteria?: readonly string[];
  readonly exclusionCriteria?: readonly string[];
}

/**
 * Structured eligibility for matching
 */
export interface StructuredEligibility {
  readonly cancerTypes?: readonly string[];
  readonly stages?: readonly string[];
  readonly requiredMutations?: readonly string[];
  readonly excludedMutations?: readonly string[];
  readonly priorTherapies?: readonly string[];
  readonly excludedTherapies?: readonly string[];
  readonly biomarkerRequirements?: readonly BiomarkerRequirement[];
  readonly performanceStatus?: PerformanceStatusRequirement;
  readonly organFunction?: readonly OrganFunctionRequirement[];
}

/**
 * Biomarker eligibility requirement
 */
export interface BiomarkerRequirement {
  readonly biomarker: string;
  readonly requirement: 'positive' | 'negative' | 'high' | 'low' | 'within_range';
  readonly threshold?: number;
  readonly unit?: string;
}

/**
 * Performance status requirement
 */
export interface PerformanceStatusRequirement {
  readonly scale: 'ECOG' | 'Karnofsky';
  readonly minimum?: number;
  readonly maximum?: number;
}

/**
 * Organ function requirement
 */
export interface OrganFunctionRequirement {
  readonly organ: string;
  readonly parameter: string;
  readonly operator: 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
  readonly value: number;
  readonly unit?: string;
}

/**
 * Trial location/site
 */
export interface TrialLocation {
  readonly facility: string;
  readonly city: string;
  readonly state?: string;
  readonly country: string;
  readonly zipCode?: string;
  readonly status?: 'recruiting' | 'not_yet_recruiting' | 'completed' | 'withdrawn';
  readonly contactName?: string;
  readonly contactPhone?: string;
  readonly contactEmail?: string;
  readonly geoLocation?: { latitude: number; longitude: number };
}

/**
 * Trial sponsor information
 */
export interface TrialSponsor {
  readonly name: string;
  readonly type: 'industry' | 'nih' | 'other_gov' | 'network' | 'other';
  readonly collaborators?: readonly string[];
}

/**
 * Trial contact information
 */
export interface TrialContact {
  readonly name?: string;
  readonly role?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly organization?: string;
}

/**
 * Core Clinical Trial entity
 */
export interface ClinicalTrial {
  readonly id: string;
  readonly nctId: string;
  readonly title: string;
  readonly briefTitle?: string;
  readonly officialTitle?: string;
  readonly status: TrialStatus;
  readonly phase: TrialPhase;
  readonly studyType: StudyType;
  readonly primaryPurpose?: PrimaryPurpose;
  readonly briefSummary?: string;
  readonly detailedDescription?: string;
  readonly conditions: readonly string[];
  readonly interventions: readonly TrialIntervention[];
  readonly arms?: readonly TrialArm[];
  readonly outcomeMeasures?: readonly OutcomeMeasure[];
  readonly eligibility: EligibilityCriteria;
  readonly structuredEligibility?: StructuredEligibility;
  readonly locations: readonly TrialLocation[];
  readonly sponsor: TrialSponsor;
  readonly contacts?: readonly TrialContact[];
  readonly startDate?: string;
  readonly completionDate?: string;
  readonly primaryCompletionDate?: string;
  readonly enrollmentCount?: number;
  readonly enrollmentType?: 'actual' | 'anticipated';
  readonly lastUpdateDate?: string;
  readonly resultsFirstPostDate?: string;
  readonly hasResults: boolean;
  readonly url?: string;
}

/**
 * Trial search criteria
 */
export interface TrialSearchCriteria {
  readonly query?: string;
  readonly conditions?: readonly string[];
  readonly interventions?: readonly string[];
  readonly status?: readonly TrialStatus[];
  readonly phase?: readonly TrialPhase[];
  readonly location?: LocationFilter;
  readonly sponsor?: string;
  readonly startDateFrom?: string;
  readonly startDateTo?: string;
  readonly hasResults?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Location filter for trial search
 */
export interface LocationFilter {
  readonly country?: string;
  readonly state?: string;
  readonly city?: string;
  readonly zipCode?: string;
  readonly distance?: number;
  readonly unit?: 'miles' | 'kilometers';
}

/**
 * Trial matching result for a patient
 */
export interface TrialMatchResult {
  readonly trial: ClinicalTrial;
  readonly matchScore: number;
  readonly matchedCriteria: readonly MatchedCriterion[];
  readonly unmatchedCriteria: readonly UnmatchedCriterion[];
  readonly matchStatus: 'eligible' | 'potentially_eligible' | 'likely_ineligible' | 'ineligible';
  readonly reasoning?: string;
  readonly nearestLocation?: TrialLocation;
  readonly distanceToLocation?: number;
}

/**
 * Matched eligibility criterion
 */
export interface MatchedCriterion {
  readonly criterion: string;
  readonly patientValue: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

/**
 * Unmatched eligibility criterion
 */
export interface UnmatchedCriterion {
  readonly criterion: string;
  readonly reason: 'not_met' | 'unknown' | 'missing_data';
  readonly patientValue?: string;
  readonly requiredValue?: string;
  readonly isExclusionary: boolean;
}

/**
 * Trial results summary
 */
export interface TrialResults {
  readonly nctId: string;
  readonly primaryOutcome?: OutcomeResult;
  readonly secondaryOutcomes?: readonly OutcomeResult[];
  readonly adverseEvents?: AdverseEventsSummary;
  readonly publicationLinks?: readonly string[];
}

/**
 * Outcome result data
 */
export interface OutcomeResult {
  readonly measure: string;
  readonly timeFrame: string;
  readonly population: string;
  readonly arms: readonly ArmResult[];
  readonly statisticalAnalysis?: string;
}

/**
 * Arm-specific result
 */
export interface ArmResult {
  readonly armLabel: string;
  readonly value: string;
  readonly spreadType?: string;
  readonly spreadValue?: string;
  readonly participants: number;
}

/**
 * Adverse events summary
 */
export interface AdverseEventsSummary {
  readonly seriousEvents?: number;
  readonly otherEvents?: number;
  readonly deathsReported?: number;
  readonly frequencyThreshold?: string;
}
