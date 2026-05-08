/**
 * Drug Interaction Domain Models
 *
 * Core types for drug interactions and adverse effects
 */

/**
 * Interaction severity level
 */
export type InteractionSeverity = 'major' | 'moderate' | 'minor';

/**
 * Interaction evidence level
 */
export type InteractionEvidenceLevel = 'established' | 'probable' | 'suspected' | 'possible' | 'unlikely';

/**
 * Drug-Drug Interaction
 */
export interface DrugInteraction {
  readonly id: string;
  readonly drugA: InteractionDrugReference;
  readonly drugB: InteractionDrugReference;
  readonly severity: InteractionSeverity;
  readonly evidence: InteractionEvidenceLevel;
  readonly description: string;
  readonly mechanism?: InteractionMechanism;
  readonly clinicalConsequence?: string;
  readonly management: string;
  readonly onsetTime?: 'immediate' | 'rapid' | 'delayed';
  readonly references?: readonly string[];
}

/**
 * Drug reference in interaction
 */
export interface InteractionDrugReference {
  readonly drugId: string;
  readonly drugName: string;
  readonly role?: 'perpetrator' | 'victim' | 'both';
}

/**
 * Interaction mechanism
 */
export interface InteractionMechanism {
  readonly type: 'pharmacokinetic' | 'pharmacodynamic' | 'mixed' | 'unknown';
  readonly subtype?: PKMechanismType | PDMechanismType;
  readonly affectedPathway?: string;
  readonly affectedEnzyme?: string;
  readonly affectedTransporter?: string;
  readonly description?: string;
}

/**
 * Pharmacokinetic mechanism type
 */
export type PKMechanismType =
  | 'absorption_altered'
  | 'distribution_altered'
  | 'cyp_inhibition'
  | 'cyp_induction'
  | 'transporter_inhibition'
  | 'transporter_induction'
  | 'protein_binding_displacement'
  | 'renal_excretion_altered';

/**
 * Pharmacodynamic mechanism type
 */
export type PDMechanismType =
  | 'additive_effect'
  | 'synergistic_effect'
  | 'antagonistic_effect'
  | 'receptor_competition'
  | 'signaling_pathway'
  | 'electrolyte_imbalance'
  | 'QT_prolongation';

/**
 * Adverse effect/event
 */
export interface AdverseEffect {
  readonly id: string;
  readonly name: string;
  readonly meddraCode?: string;
  readonly severity?: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  readonly frequency?: AdverseEffectFrequency;
  readonly organSystem?: string;
  readonly onsetTime?: string;
  readonly duration?: string;
  readonly reversible?: boolean;
  readonly mechanism?: string;
  readonly riskFactors?: readonly string[];
  readonly management?: string;
}

/**
 * Adverse effect frequency
 */
export interface AdverseEffectFrequency {
  readonly category: 'very_common' | 'common' | 'uncommon' | 'rare' | 'very_rare' | 'unknown';
  readonly percentage?: number;
  readonly incidencePerThousand?: number;
}

/**
 * Drug adverse effect association
 */
export interface DrugAdverseEffect {
  readonly drugId: string;
  readonly drugName: string;
  readonly adverseEffect: AdverseEffect;
  readonly frequency: AdverseEffectFrequency;
  readonly blackBoxWarning?: boolean;
  readonly contraindicationLevel?: 'absolute' | 'relative';
  readonly evidenceSource: 'clinical_trial' | 'post_marketing' | 'case_report' | 'label';
  readonly references?: readonly string[];
}

/**
 * Drug-Food Interaction
 */
export interface DrugFoodInteraction {
  readonly drugId: string;
  readonly drugName: string;
  readonly food: string;
  readonly effect: string;
  readonly mechanism?: string;
  readonly severity: InteractionSeverity;
  readonly recommendation: string;
  readonly timingAdvice?: string;
}

/**
 * Drug-Gene Interaction (Pharmacogenomics)
 */
export interface DrugGeneInteraction {
  readonly drugId: string;
  readonly drugName: string;
  readonly gene: string;
  readonly variant?: string;
  readonly rsId?: string;
  readonly phenotype: string;
  readonly clinicalAnnotation: string;
  readonly doseRecommendation?: string;
  readonly evidenceLevel: 'A' | 'B' | 'C' | 'D';
  readonly source: 'CPIC' | 'DPWG' | 'FDA' | 'PharmGKB';
  readonly references?: readonly string[];
}

/**
 * Drug-Disease Interaction (Contraindication)
 */
export interface DrugDiseaseInteraction {
  readonly drugId: string;
  readonly drugName: string;
  readonly disease: string;
  readonly icdCode?: string;
  readonly severity: InteractionSeverity;
  readonly type: 'contraindication' | 'precaution' | 'monitoring_required';
  readonly description: string;
  readonly mechanism?: string;
  readonly alternatives?: readonly string[];
  readonly references?: readonly string[];
}

/**
 * Interaction check result
 */
export interface InteractionCheckResult {
  readonly checkedDrugs: readonly string[];
  readonly checkDate: string;
  readonly interactions: readonly DrugInteraction[];
  readonly summary: InteractionSummary;
  readonly recommendations: readonly string[];
}

/**
 * Summary of interaction check
 */
export interface InteractionSummary {
  readonly totalInteractions: number;
  readonly majorInteractions: number;
  readonly moderateInteractions: number;
  readonly minorInteractions: number;
  readonly highestSeverity?: InteractionSeverity;
  readonly requiresIntervention: boolean;
}

/**
 * Polypharmacy risk assessment
 */
export interface PolypharmacyRisk {
  readonly patientId?: string;
  readonly medications: readonly string[];
  readonly medicationCount: number;
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  readonly riskFactors: readonly PolypharmacyRiskFactor[];
  readonly interactions: readonly DrugInteraction[];
  readonly recommendations: readonly string[];
}

/**
 * Polypharmacy risk factor
 */
export interface PolypharmacyRiskFactor {
  readonly factor: string;
  readonly description: string;
  readonly contribution: 'major' | 'minor';
}

/**
 * Toxicity prediction
 */
export interface ToxicityPrediction {
  readonly compoundId: string;
  readonly endpoint: ToxicityEndpoint;
  readonly prediction: 'toxic' | 'non_toxic' | 'borderline';
  readonly probability?: number;
  readonly confidence?: 'high' | 'medium' | 'low';
  readonly model?: string;
  readonly features?: readonly ToxicityFeature[];
}

/**
 * Toxicity endpoint
 */
export type ToxicityEndpoint =
  | 'hepatotoxicity'
  | 'cardiotoxicity'
  | 'nephrotoxicity'
  | 'neurotoxicity'
  | 'hematotoxicity'
  | 'mutagenicity'
  | 'carcinogenicity'
  | 'teratogenicity'
  | 'skin_sensitization'
  | 'respiratory_toxicity';

/**
 * Toxicity feature contribution
 */
export interface ToxicityFeature {
  readonly feature: string;
  readonly value: number | string;
  readonly contribution: number;
  readonly alert?: boolean;
  readonly structuralFragment?: string;
}

/**
 * Structural alert for toxicity
 */
export interface StructuralAlert {
  readonly id: string;
  readonly name: string;
  readonly smarts: string;
  readonly toxicityEndpoint: ToxicityEndpoint;
  readonly severity: 'high' | 'medium' | 'low';
  readonly description: string;
  readonly examples?: readonly string[];
  readonly mitigation?: string;
}

/**
 * Safety profile summary
 */
export interface SafetyProfileSummary {
  readonly drugId: string;
  readonly drugName: string;
  readonly overallSafetyRating: 'favorable' | 'acceptable' | 'concerning' | 'unfavorable';
  readonly blackBoxWarnings: readonly string[];
  readonly majorAdverseEffects: readonly AdverseEffect[];
  readonly drugInteractions: readonly DrugInteraction[];
  readonly contraindications: readonly DrugDiseaseInteraction[];
  readonly pharmacogenomicConsiderations: readonly DrugGeneInteraction[];
  readonly monitoringRequirements: readonly string[];
  readonly specialPopulations?: SpecialPopulationConsiderations;
}

/**
 * Special population considerations
 */
export interface SpecialPopulationConsiderations {
  readonly pregnancy: string;
  readonly pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X';
  readonly lactation: string;
  readonly pediatric: string;
  readonly geriatric: string;
  readonly renalImpairment: string;
  readonly hepaticImpairment: string;
}

/**
 * Interaction search criteria
 */
export interface InteractionSearchCriteria {
  readonly drugId?: string;
  readonly drugName?: string;
  readonly severity?: InteractionSeverity;
  readonly mechanismType?: string;
  readonly limit?: number;
  readonly offset?: number;
}
