/**
 * ClinicalTrials.gov API Client
 *
 * Provides access to clinical trial data via the ClinicalTrials.gov API v2.
 * API Documentation: https://clinicaltrials.gov/data-api/api
 */

import { BaseClient, DataSourceConfig, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type {
  ClinicalTrial,
  TrialSearchCriteria,
  TrialStatus,
  TrialPhase,
  TrialIntervention,
  TrialLocation,
  EligibilityCriteria,
  TrialSponsor,
  OutcomeMeasure,
} from '../../domain/clinical/clinicalTrial.js';

/**
 * ClinicalTrials.gov client configuration
 */
export interface ClinicalTrialsConfig extends Partial<DataSourceConfig> {
  readonly version?: 'v2';
}

/**
 * API response structure for study search
 */
interface CTGSearchResponse {
  studies: CTGStudy[];
  totalCount: number;
  nextPageToken?: string;
}

/**
 * API study structure
 */
interface CTGStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      orgStudyIdInfo?: { id: string };
      briefTitle: string;
      officialTitle?: string;
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: { date: string };
      completionDateStruct?: { date: string };
      primaryCompletionDateStruct?: { date: string };
      lastUpdatePostDateStruct?: { date: string };
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions: string[];
    };
    designModule?: {
      studyType: string;
      phases?: string[];
      designInfo?: {
        primaryPurpose?: string;
        allocation?: string;
        interventionModel?: string;
        masking?: { masking: string };
      };
      enrollmentInfo?: {
        count: number;
        type: string;
      };
    };
    armsInterventionsModule?: {
      armGroups?: Array<{
        label: string;
        type: string;
        description?: string;
        interventionNames?: string[];
      }>;
      interventions?: Array<{
        type: string;
        name: string;
        description?: string;
        armGroupLabels?: string[];
        otherNames?: string[];
      }>;
    };
    outcomesModule?: {
      primaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
      secondaryOutcomes?: Array<{
        measure: string;
        description?: string;
        timeFrame?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      sex: string;
      minimumAge?: string;
      maximumAge?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
        status?: string;
        contacts?: Array<{
          name?: string;
          phone?: string;
          email?: string;
        }>;
        geoPoint?: { lat: number; lon: number };
      }>;
      centralContacts?: Array<{
        name?: string;
        role?: string;
        phone?: string;
        email?: string;
      }>;
    };
    sponsorCollaboratorsModule?: {
      leadSponsor: {
        name: string;
        class: string;
      };
      collaborators?: Array<{ name: string }>;
    };
  };
  hasResults: boolean;
  resultsSection?: object;
}

/**
 * ClinicalTrials.gov API client
 */
export class ClinicalTrialsClient extends BaseClient {
  constructor(config: ClinicalTrialsConfig = {}) {
    super(
      {
        baseUrl: 'https://clinicaltrials.gov/api/v2',
        rateLimitPerSecond: 3,
        cacheTtlMs: 300000, // 5 minutes
        ...config,
      },
      'ClinicalTrials.gov'
    );
  }

  /**
   * Search for clinical trials
   */
  async search(
    criteria: TrialSearchCriteria
  ): Promise<PaginatedResponse<ClinicalTrial>> {
    const params = this.buildSearchParams(criteria);

    const response = await this.request<CTGSearchResponse>('/studies', {
      params,
    });

    const trials = response.data.studies.map(study => this.mapStudyToTrial(study));
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;

    return createPaginatedResponse(trials, response.data.totalCount, offset, limit);
  }

  /**
   * Get a single trial by NCT ID
   */
  async getByNctId(nctId: string): Promise<ClinicalTrial | null> {
    try {
      const response = await this.request<CTGStudy>(`/studies/${nctId}`);
      return this.mapStudyToTrial(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Search trials by condition/disease
   */
  async searchByCondition(
    condition: string,
    options: { status?: TrialStatus[]; limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<ClinicalTrial>> {
    return this.search({
      conditions: [condition],
      status: options.status,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Search trials by intervention/drug
   */
  async searchByIntervention(
    intervention: string,
    options: { status?: TrialStatus[]; limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<ClinicalTrial>> {
    return this.search({
      interventions: [intervention],
      status: options.status,
      limit: options.limit,
      offset: options.offset,
    });
  }

  /**
   * Find trials recruiting near a location
   */
  async findRecruitingNearby(
    condition: string,
    location: { country: string; state?: string; city?: string },
    limit: number = 20
  ): Promise<ClinicalTrial[]> {
    const result = await this.search({
      conditions: [condition],
      status: ['recruiting'],
      location: {
        country: location.country,
        state: location.state,
        city: location.city,
      },
      limit,
    });

    return [...result.items];
  }

  /**
   * Build search parameters
   */
  private buildSearchParams(
    criteria: TrialSearchCriteria
  ): Record<string, string> {
    const params: Record<string, string> = {
      format: 'json',
      pageSize: String(criteria.limit ?? 20),
    };

    // Build query terms
    const queryParts: string[] = [];

    if (criteria.query) {
      queryParts.push(criteria.query);
    }

    if (criteria.conditions?.length) {
      const conditionQuery = criteria.conditions.join(' OR ');
      queryParts.push(`AREA[Condition](${conditionQuery})`);
    }

    if (criteria.interventions?.length) {
      const interventionQuery = criteria.interventions.join(' OR ');
      queryParts.push(`AREA[Intervention](${interventionQuery})`);
    }

    if (criteria.sponsor) {
      queryParts.push(`AREA[LeadSponsor](${criteria.sponsor})`);
    }

    if (queryParts.length > 0) {
      params['query.term'] = queryParts.join(' AND ');
    }

    // Status filter
    if (criteria.status?.length) {
      params['filter.overallStatus'] = criteria.status
        .map(s => this.mapStatusToApi(s))
        .join(',');
    }

    // Phase filter
    if (criteria.phase?.length) {
      params['filter.phase'] = criteria.phase
        .map(p => this.mapPhaseToApi(p))
        .join(',');
    }

    // Location filter
    if (criteria.location) {
      if (criteria.location.country) {
        params['filter.geo'] = `distance(${criteria.location.country},${criteria.location.distance ?? 100}mi)`;
      }
    }

    // Date filters
    if (criteria.startDateFrom) {
      params['filter.advanced'] = `AREA[StartDate]RANGE[${criteria.startDateFrom},MAX]`;
    }

    // Results filter
    if (criteria.hasResults !== undefined) {
      params['filter.results'] = criteria.hasResults ? 'WITH' : 'WITHOUT';
    }

    return params;
  }

  /**
   * Map API study to ClinicalTrial domain model
   */
  private mapStudyToTrial(study: CTGStudy): ClinicalTrial {
    const protocol = study.protocolSection;
    const id = protocol.identificationModule;
    const status = protocol.statusModule;
    const desc = protocol.descriptionModule;
    const conditions = protocol.conditionsModule;
    const design = protocol.designModule;
    const arms = protocol.armsInterventionsModule;
    const outcomes = protocol.outcomesModule;
    const eligibility = protocol.eligibilityModule;
    const contacts = protocol.contactsLocationsModule;
    const sponsor = protocol.sponsorCollaboratorsModule;

    return {
      id: id.nctId,
      nctId: id.nctId,
      title: id.briefTitle,
      briefTitle: id.briefTitle,
      officialTitle: id.officialTitle,
      status: this.mapApiToStatus(status.overallStatus),
      phase: this.mapApiToPhase(design?.phases?.[0]),
      studyType: this.mapStudyType(design?.studyType ?? 'Interventional'),
      primaryPurpose: this.mapPrimaryPurpose(design?.designInfo?.primaryPurpose),
      briefSummary: desc?.briefSummary,
      detailedDescription: desc?.detailedDescription,
      conditions: conditions?.conditions ?? [],
      interventions: this.mapInterventions(arms?.interventions),
      arms: arms?.armGroups?.map(arm => ({
        label: arm.label,
        type: this.mapArmType(arm.type),
        description: arm.description,
        interventions: arm.interventionNames,
      })),
      outcomeMeasures: this.mapOutcomes(outcomes),
      eligibility: this.mapEligibility(eligibility),
      locations: this.mapLocations(contacts?.locations),
      sponsor: this.mapSponsor(sponsor),
      contacts: contacts?.centralContacts?.map(c => ({
        name: c.name,
        role: c.role,
        phone: c.phone,
        email: c.email,
      })),
      startDate: status.startDateStruct?.date,
      completionDate: status.completionDateStruct?.date,
      primaryCompletionDate: status.primaryCompletionDateStruct?.date,
      enrollmentCount: design?.enrollmentInfo?.count,
      enrollmentType: design?.enrollmentInfo?.type === 'ACTUAL' ? 'actual' : 'anticipated',
      lastUpdateDate: status.lastUpdatePostDateStruct?.date,
      hasResults: study.hasResults,
      url: `https://clinicaltrials.gov/study/${id.nctId}`,
    };
  }

  /**
   * Map interventions
   */
  private mapInterventions(
    interventions?: CTGStudy['protocolSection']['armsInterventionsModule']['interventions']
  ): TrialIntervention[] {
    if (!interventions) return [];

    return interventions.map(int => ({
      name: int.name,
      type: this.mapInterventionType(int.type),
      description: int.description,
      armGroupLabels: int.armGroupLabels,
      otherNames: int.otherNames,
    }));
  }

  /**
   * Map outcomes
   */
  private mapOutcomes(
    outcomes?: CTGStudy['protocolSection']['outcomesModule']
  ): OutcomeMeasure[] {
    if (!outcomes) return [];

    const result: OutcomeMeasure[] = [];

    for (const primary of outcomes.primaryOutcomes ?? []) {
      result.push({
        type: 'primary',
        measure: primary.measure,
        description: primary.description,
        timeFrame: primary.timeFrame,
      });
    }

    for (const secondary of outcomes.secondaryOutcomes ?? []) {
      result.push({
        type: 'secondary',
        measure: secondary.measure,
        description: secondary.description,
        timeFrame: secondary.timeFrame,
      });
    }

    return result;
  }

  /**
   * Map eligibility
   */
  private mapEligibility(
    elig?: CTGStudy['protocolSection']['eligibilityModule']
  ): EligibilityCriteria {
    return {
      criteria: elig?.eligibilityCriteria ?? '',
      gender: this.mapGender(elig?.sex ?? 'ALL'),
      minimumAge: elig?.minimumAge,
      maximumAge: elig?.maximumAge,
      healthyVolunteers: elig?.healthyVolunteers ?? false,
    };
  }

  /**
   * Map locations
   */
  private mapLocations(
    locations?: CTGStudy['protocolSection']['contactsLocationsModule']['locations']
  ): TrialLocation[] {
    if (!locations) return [];

    return locations.map(loc => ({
      facility: loc.facility ?? 'Unknown',
      city: loc.city ?? '',
      state: loc.state,
      country: loc.country ?? '',
      zipCode: loc.zip,
      status: this.mapLocationStatus(loc.status),
      contactName: loc.contacts?.[0]?.name,
      contactPhone: loc.contacts?.[0]?.phone,
      contactEmail: loc.contacts?.[0]?.email,
      geoLocation: loc.geoPoint ? { latitude: loc.geoPoint.lat, longitude: loc.geoPoint.lon } : undefined,
    }));
  }

  /**
   * Map sponsor
   */
  private mapSponsor(
    sponsor?: CTGStudy['protocolSection']['sponsorCollaboratorsModule']
  ): TrialSponsor {
    return {
      name: sponsor?.leadSponsor?.name ?? 'Unknown',
      type: this.mapSponsorType(sponsor?.leadSponsor?.class ?? 'OTHER'),
      collaborators: sponsor?.collaborators?.map(c => c.name),
    };
  }

  // Status mapping helpers
  private mapStatusToApi(status: TrialStatus): string {
    const map: Record<TrialStatus, string> = {
      not_yet_recruiting: 'NOT_YET_RECRUITING',
      recruiting: 'RECRUITING',
      enrolling_by_invitation: 'ENROLLING_BY_INVITATION',
      active_not_recruiting: 'ACTIVE_NOT_RECRUITING',
      suspended: 'SUSPENDED',
      terminated: 'TERMINATED',
      completed: 'COMPLETED',
      withdrawn: 'WITHDRAWN',
      unknown: 'UNKNOWN',
    };
    return map[status] ?? status.toUpperCase();
  }

  private mapApiToStatus(status: string): TrialStatus {
    const map: Record<string, TrialStatus> = {
      NOT_YET_RECRUITING: 'not_yet_recruiting',
      RECRUITING: 'recruiting',
      ENROLLING_BY_INVITATION: 'enrolling_by_invitation',
      ACTIVE_NOT_RECRUITING: 'active_not_recruiting',
      SUSPENDED: 'suspended',
      TERMINATED: 'terminated',
      COMPLETED: 'completed',
      WITHDRAWN: 'withdrawn',
    };
    return map[status] ?? 'unknown';
  }

  private mapPhaseToApi(phase: TrialPhase): string {
    const map: Record<TrialPhase, string> = {
      early_phase_1: 'EARLY_PHASE1',
      phase_1: 'PHASE1',
      phase_1_2: 'PHASE1_PHASE2',
      phase_2: 'PHASE2',
      phase_2_3: 'PHASE2_PHASE3',
      phase_3: 'PHASE3',
      phase_4: 'PHASE4',
      not_applicable: 'NA',
    };
    return map[phase] ?? phase.toUpperCase();
  }

  private mapApiToPhase(phase?: string): TrialPhase {
    if (!phase) return 'not_applicable';
    const map: Record<string, TrialPhase> = {
      EARLY_PHASE1: 'early_phase_1',
      PHASE1: 'phase_1',
      PHASE1_PHASE2: 'phase_1_2',
      PHASE2: 'phase_2',
      PHASE2_PHASE3: 'phase_2_3',
      PHASE3: 'phase_3',
      PHASE4: 'phase_4',
      NA: 'not_applicable',
    };
    return map[phase] ?? 'not_applicable';
  }

  private mapStudyType(type: string): 'interventional' | 'observational' | 'expanded_access' | 'registry' {
    const map: Record<string, 'interventional' | 'observational' | 'expanded_access' | 'registry'> = {
      INTERVENTIONAL: 'interventional',
      OBSERVATIONAL: 'observational',
      EXPANDED_ACCESS: 'expanded_access',
    };
    return map[type] ?? 'interventional';
  }

  private mapPrimaryPurpose(purpose?: string): 'treatment' | 'prevention' | 'diagnostic' | 'supportive_care' | 'screening' | 'health_services_research' | 'basic_science' | 'device_feasibility' | 'other' | undefined {
    if (!purpose) return undefined;
    const map: Record<string, 'treatment' | 'prevention' | 'diagnostic' | 'supportive_care' | 'screening' | 'health_services_research' | 'basic_science' | 'device_feasibility' | 'other'> = {
      TREATMENT: 'treatment',
      PREVENTION: 'prevention',
      DIAGNOSTIC: 'diagnostic',
      SUPPORTIVE_CARE: 'supportive_care',
      SCREENING: 'screening',
      HEALTH_SERVICES_RESEARCH: 'health_services_research',
      BASIC_SCIENCE: 'basic_science',
      DEVICE_FEASIBILITY: 'device_feasibility',
    };
    return map[purpose] ?? 'other';
  }

  private mapInterventionType(type: string): 'drug' | 'biological' | 'device' | 'procedure' | 'radiation' | 'behavioral' | 'genetic' | 'dietary_supplement' | 'combination_product' | 'diagnostic_test' | 'other' {
    const map: Record<string, 'drug' | 'biological' | 'device' | 'procedure' | 'radiation' | 'behavioral' | 'genetic' | 'dietary_supplement' | 'combination_product' | 'diagnostic_test' | 'other'> = {
      DRUG: 'drug',
      BIOLOGICAL: 'biological',
      DEVICE: 'device',
      PROCEDURE: 'procedure',
      RADIATION: 'radiation',
      BEHAVIORAL: 'behavioral',
      GENETIC: 'genetic',
      DIETARY_SUPPLEMENT: 'dietary_supplement',
      COMBINATION_PRODUCT: 'combination_product',
      DIAGNOSTIC_TEST: 'diagnostic_test',
    };
    return map[type] ?? 'other';
  }

  private mapArmType(type: string): 'experimental' | 'active_comparator' | 'placebo_comparator' | 'sham_comparator' | 'no_intervention' | 'other' {
    const map: Record<string, 'experimental' | 'active_comparator' | 'placebo_comparator' | 'sham_comparator' | 'no_intervention' | 'other'> = {
      EXPERIMENTAL: 'experimental',
      ACTIVE_COMPARATOR: 'active_comparator',
      PLACEBO_COMPARATOR: 'placebo_comparator',
      SHAM_COMPARATOR: 'sham_comparator',
      NO_INTERVENTION: 'no_intervention',
    };
    return map[type] ?? 'other';
  }

  private mapGender(sex: string): 'all' | 'female' | 'male' {
    return sex.toLowerCase() as 'all' | 'female' | 'male';
  }

  private mapLocationStatus(status?: string): 'recruiting' | 'not_yet_recruiting' | 'completed' | 'withdrawn' | undefined {
    if (!status) return undefined;
    const map: Record<string, 'recruiting' | 'not_yet_recruiting' | 'completed' | 'withdrawn'> = {
      RECRUITING: 'recruiting',
      NOT_YET_RECRUITING: 'not_yet_recruiting',
      COMPLETED: 'completed',
      WITHDRAWN: 'withdrawn',
    };
    return map[status];
  }

  private mapSponsorType(type: string): 'industry' | 'nih' | 'other_gov' | 'network' | 'other' {
    const map: Record<string, 'industry' | 'nih' | 'other_gov' | 'network' | 'other'> = {
      INDUSTRY: 'industry',
      NIH: 'nih',
      FED: 'other_gov',
      NETWORK: 'network',
    };
    return map[type] ?? 'other';
  }

  /**
   * Test connection to ClinicalTrials.gov
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<CTGSearchResponse>('/studies', {
        params: { 'query.term': 'cancer', pageSize: '1', format: 'json' },
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a ClinicalTrials.gov client
 */
export function createClinicalTrialsClient(): ClinicalTrialsClient {
  return new ClinicalTrialsClient();
}
