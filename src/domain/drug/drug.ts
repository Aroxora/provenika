/**
 * Drug Domain Models
 *
 * Core types for drug and compound data in cancer drug discovery
 */

/**
 * Drug development status
 */
export type DrugStatus =
  | 'approved'
  | 'investigational'
  | 'experimental'
  | 'withdrawn'
  | 'discontinued';

/**
 * Drug type classification
 */
export type DrugType =
  | 'small_molecule'
  | 'biologic'
  | 'antibody'
  | 'ADC'
  | 'cell_therapy'
  | 'gene_therapy'
  | 'vaccine'
  | 'radiopharmaceutical';

/**
 * Drug classification by mechanism
 */
export type DrugClass =
  | 'kinase_inhibitor'
  | 'checkpoint_inhibitor'
  | 'hormone_therapy'
  | 'antimetabolite'
  | 'alkylating_agent'
  | 'topoisomerase_inhibitor'
  | 'tubulin_inhibitor'
  | 'proteasome_inhibitor'
  | 'PARP_inhibitor'
  | 'CDK_inhibitor'
  | 'BCL2_inhibitor'
  | 'HDAC_inhibitor'
  | 'mTOR_inhibitor'
  | 'PI3K_inhibitor'
  | 'MEK_inhibitor'
  | 'BRAF_inhibitor'
  | 'EGFR_inhibitor'
  | 'HER2_inhibitor'
  | 'ALK_inhibitor'
  | 'BTK_inhibitor'
  | 'JAK_inhibitor'
  | 'FLT3_inhibitor'
  | 'VEGFR_inhibitor'
  | 'monoclonal_antibody'
  | 'bispecific_antibody'
  | 'CAR_T'
  | 'other';

/**
 * Chemical structure information
 */
export interface ChemicalStructure {
  readonly smiles?: string;
  readonly inchi?: string;
  readonly inchiKey?: string;
  readonly molecularFormula?: string;
  readonly molecularWeight?: number;
  readonly canonicalSmiles?: string;
}

/**
 * Drug-likeness properties
 */
export interface DrugLikenessProperties {
  readonly lipinskiViolations?: number;
  readonly logP?: number;
  readonly hbondDonors?: number;
  readonly hbondAcceptors?: number;
  readonly rotableBonds?: number;
  readonly polarSurfaceArea?: number;
  readonly molarRefractivity?: number;
  readonly leadLikeness?: boolean;
  readonly drugLikeness?: boolean;
}

/**
 * ADMET (Absorption, Distribution, Metabolism, Excretion, Toxicity) properties
 */
export interface ADMETProperties {
  readonly absorption?: AbsorptionProperties;
  readonly distribution?: DistributionProperties;
  readonly metabolism?: MetabolismProperties;
  readonly excretion?: ExcretionProperties;
  readonly toxicity?: ToxicityProperties;
}

/**
 * Absorption properties
 */
export interface AbsorptionProperties {
  readonly humanIntestinalAbsorption?: 'high' | 'moderate' | 'low';
  readonly caco2Permeability?: number;
  readonly pgpSubstrate?: boolean;
  readonly pgpInhibitor?: boolean;
  readonly oralBioavailability?: number;
}

/**
 * Distribution properties
 */
export interface DistributionProperties {
  readonly volumeOfDistribution?: number;
  readonly plasmaProteinBinding?: number;
  readonly bloodBrainBarrier?: 'penetrant' | 'non_penetrant' | 'unknown';
  readonly centralNervousSystem?: boolean;
}

/**
 * Metabolism properties
 */
export interface MetabolismProperties {
  readonly cyp450Substrate?: readonly string[];
  readonly cyp450Inhibitor?: readonly string[];
  readonly cyp450Inducer?: readonly string[];
  readonly halfLife?: number;
  readonly halfLifeUnit?: 'hours' | 'days';
}

/**
 * Excretion properties
 */
export interface ExcretionProperties {
  readonly clearance?: number;
  readonly excretionRoute?: 'renal' | 'hepatic' | 'both';
  readonly renalClearance?: number;
}

/**
 * Toxicity prediction properties
 */
export interface ToxicityProperties {
  readonly hergInhibition?: boolean;
  readonly amesTest?: 'positive' | 'negative' | 'unknown';
  readonly hepatotoxicity?: 'likely' | 'unlikely' | 'unknown';
  readonly skinSensitization?: boolean;
  readonly carcinogenicity?: 'likely' | 'unlikely' | 'unknown';
  readonly ld50?: number;
  readonly maxToleratedDose?: number;
}

/**
 * Regulatory approval information
 */
export interface DrugApproval {
  readonly agency: 'FDA' | 'EMA' | 'PMDA' | 'NMPA' | 'Health_Canada' | 'TGA';
  readonly status: 'approved' | 'breakthrough_therapy' | 'fast_track' | 'accelerated' | 'priority_review' | 'orphan_drug';
  readonly approvalDate?: string;
  readonly indication?: string;
  readonly biomarker?: string;
  readonly labelUrl?: string;
}

/**
 * Drug indication
 */
export interface DrugIndication {
  readonly id: string;
  readonly indication: string;
  readonly cancerType?: string;
  readonly lineOfTherapy?: string;
  readonly biomarkerRequired?: string;
  readonly combinationWith?: readonly string[];
  readonly approvalStatus: DrugApproval;
  readonly evidenceLevel?: string;
}

/**
 * External database reference
 */
export interface DrugReference {
  readonly database: 'DrugBank' | 'ChEMBL' | 'PubChem' | 'KEGG' | 'RxNorm' | 'ATC' | 'NCI_Thesaurus';
  readonly id: string;
  readonly url?: string;
}

/**
 * Core Drug entity
 */
export interface Drug {
  readonly id: string;
  readonly name: string;
  readonly genericName?: string;
  readonly brandNames?: readonly string[];
  readonly synonyms?: readonly string[];
  readonly description?: string;
  readonly type: DrugType;
  readonly drugClass?: DrugClass;
  readonly status: DrugStatus;
  readonly structure?: ChemicalStructure;
  readonly drugLikeness?: DrugLikenessProperties;
  readonly admet?: ADMETProperties;
  readonly targets?: readonly DrugTargetInfo[];
  readonly indications?: readonly DrugIndication[];
  readonly approvals?: readonly DrugApproval[];
  readonly references?: readonly DrugReference[];
  readonly mechanism?: string;
  readonly pharmacodynamics?: string;
  readonly sideEffects?: readonly string[];
  readonly contraindications?: readonly string[];
  readonly warnings?: readonly string[];
}

/**
 * Drug target information within a drug entity
 */
export interface DrugTargetInfo {
  readonly targetId: string;
  readonly targetName: string;
  readonly geneSymbol?: string;
  readonly action: 'inhibitor' | 'agonist' | 'antagonist' | 'modulator' | 'binder' | 'other';
  readonly affinity?: number;
  readonly affinityType?: 'Ki' | 'Kd' | 'IC50' | 'EC50';
  readonly affinityUnit?: 'nM' | 'uM' | 'pM';
  readonly selectivity?: 'selective' | 'multi_target' | 'pan';
}

/**
 * Drug compound for screening
 */
export interface DrugCompound extends Drug {
  readonly compoundId: string;
  readonly library?: string;
  readonly plateId?: string;
  readonly wellPosition?: string;
  readonly concentration?: number;
  readonly concentrationUnit?: string;
  readonly purity?: number;
  readonly batchNumber?: string;
}

/**
 * Drug search criteria
 */
export interface DrugSearchCriteria {
  readonly name?: string;
  readonly type?: DrugType;
  readonly drugClass?: DrugClass;
  readonly status?: DrugStatus;
  readonly targetGene?: string;
  readonly indication?: string;
  readonly isApproved?: boolean;
  readonly hasStructure?: boolean;
  readonly smiles?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Drug similarity result
 */
export interface DrugSimilarityResult {
  readonly queryDrug: string;
  readonly similarDrug: Drug;
  readonly similarity: number;
  readonly similarityMethod: 'tanimoto' | 'dice' | 'cosine' | 'euclidean';
  readonly fingerprintType?: 'ECFP4' | 'MACCS' | 'Morgan' | 'RDKit';
}

/**
 * Drug repurposing candidate
 */
export interface RepurposingCandidate {
  readonly drug: Drug;
  readonly proposedIndication: string;
  readonly rationale: string;
  readonly evidenceType: 'computational' | 'preclinical' | 'clinical' | 'case_report';
  readonly score?: number;
  readonly supportingEvidence?: readonly string[];
  readonly clinicalTrials?: readonly string[];
}

/**
 * Drug combination
 */
export interface DrugCombination {
  readonly id: string;
  readonly name?: string;
  readonly drugs: readonly Drug[];
  readonly indication?: string;
  readonly synergy?: CombinationSynergy;
  readonly clinicalEvidence?: string;
  readonly approvalStatus?: DrugApproval;
}

/**
 * Synergy assessment for drug combination
 */
export interface CombinationSynergy {
  readonly score: number;
  readonly method: 'Bliss' | 'Loewe' | 'HSA' | 'ZIP';
  readonly interpretation: 'synergistic' | 'additive' | 'antagonistic';
  readonly cellLine?: string;
  readonly concentration?: string;
}
