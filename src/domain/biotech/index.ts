/**
 * Curative Biotechnology Domain Models
 *
 * Domain models for next-generation cancer treatments including
 * CAR-T cell therapy, mRNA vaccines, CRISPR gene editing,
 * and oncolytic virus therapy.
 */

/**
 * CAR-T Cell Therapy
 */
export interface CARTTherapy {
  readonly id: string;
  readonly name: string;
  readonly tradeName?: string;
  readonly manufacturer: string;
  readonly targetAntigen: string; // CD19, BCMA, CD22, etc.
  readonly generation: '1st' | '2nd' | '3rd' | '4th' | 'next-gen';
  readonly cellSource: 'autologous' | 'allogeneic';
  readonly approvedIndications: readonly CARTIndication[];
  readonly clinicalTrials?: readonly string[];
  readonly completeResponseRate?: number;
  readonly approvalDate?: string;
  readonly approvalAgency?: 'FDA' | 'EMA' | 'PMDA' | 'NMPA';
}

export interface CARTIndication {
  readonly cancerType: string;
  readonly lineOfTherapy: string;
  readonly patientPopulation: string;
  readonly approvalType: 'full' | 'accelerated' | 'breakthrough';
}

/**
 * FDA Approved CAR-T Products (as of 2025)
 */
export const ApprovedCARTProducts: readonly CARTTherapy[] = [
  {
    id: 'tisagenlecleucel',
    name: 'Tisagenlecleucel',
    tradeName: 'Kymriah',
    manufacturer: 'Novartis',
    targetAntigen: 'CD19',
    generation: '2nd',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'B-cell ALL', lineOfTherapy: '2nd+', patientPopulation: 'Pediatric/Young Adult', approvalType: 'full' },
      { cancerType: 'DLBCL', lineOfTherapy: '2nd+', patientPopulation: 'Adult', approvalType: 'full' },
      { cancerType: 'Follicular Lymphoma', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
    ],
    completeResponseRate: 63,
    approvalDate: '2017-08-30',
    approvalAgency: 'FDA',
  },
  {
    id: 'axicabtagene-ciloleucel',
    name: 'Axicabtagene ciloleucel',
    tradeName: 'Yescarta',
    manufacturer: 'Kite/Gilead',
    targetAntigen: 'CD19',
    generation: '2nd',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'DLBCL', lineOfTherapy: '2nd+', patientPopulation: 'Adult', approvalType: 'full' },
      { cancerType: 'Follicular Lymphoma', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
    ],
    completeResponseRate: 58,
    approvalDate: '2017-10-18',
    approvalAgency: 'FDA',
  },
  {
    id: 'lisocabtagene-maraleucel',
    name: 'Lisocabtagene maraleucel',
    tradeName: 'Breyanzi',
    manufacturer: 'Bristol Myers Squibb',
    targetAntigen: 'CD19',
    generation: '2nd',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'DLBCL', lineOfTherapy: '2nd+', patientPopulation: 'Adult', approvalType: 'full' },
      { cancerType: 'CLL/SLL', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'full' },
      { cancerType: 'Follicular Lymphoma', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
      { cancerType: 'Mantle Cell Lymphoma', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
      { cancerType: 'Marginal Zone Lymphoma', lineOfTherapy: '3rd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
    ],
    completeResponseRate: 94, // In FL
    approvalDate: '2021-02-05',
    approvalAgency: 'FDA',
  },
  {
    id: 'idecabtagene-vicleucel',
    name: 'Idecabtagene vicleucel',
    tradeName: 'Abecma',
    manufacturer: 'Bristol Myers Squibb',
    targetAntigen: 'BCMA',
    generation: '2nd',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'Multiple Myeloma', lineOfTherapy: '4th+', patientPopulation: 'Adult', approvalType: 'full' },
    ],
    completeResponseRate: 39,
    approvalDate: '2021-03-26',
    approvalAgency: 'FDA',
  },
  {
    id: 'ciltacabtagene-autoleucel',
    name: 'Ciltacabtagene autoleucel',
    tradeName: 'Carvykti',
    manufacturer: 'Janssen/Legend',
    targetAntigen: 'BCMA',
    generation: '2nd',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'Multiple Myeloma', lineOfTherapy: '4th+', patientPopulation: 'Adult', approvalType: 'full' },
    ],
    completeResponseRate: 83,
    approvalDate: '2022-02-28',
    approvalAgency: 'FDA',
  },
  {
    id: 'obecabtagene-autoleucel',
    name: 'Obecabtagene autoleucel',
    tradeName: 'Aucatzyl',
    manufacturer: 'Autolus',
    targetAntigen: 'CD19',
    generation: 'next-gen',
    cellSource: 'autologous',
    approvedIndications: [
      { cancerType: 'B-cell ALL', lineOfTherapy: '2nd+', patientPopulation: 'Adult', approvalType: 'accelerated' },
    ],
    completeResponseRate: 63,
    approvalDate: '2024-12-06',
    approvalAgency: 'FDA',
  },
];

/**
 * mRNA Cancer Vaccine
 */
export interface mRNAVaccine {
  readonly id: string;
  readonly name: string;
  readonly developer: string;
  readonly type: 'personalized_neoantigen' | 'shared_antigen' | 'tumor_lysate';
  readonly targetAntigens: readonly string[];
  readonly deliverySystem: string;
  readonly cancerTypes: readonly string[];
  readonly phase: 'preclinical' | 'phase_1' | 'phase_2' | 'phase_3' | 'approved';
  readonly combinationPartner?: string;
  readonly clinicalTrialId?: string;
  readonly efficacyData?: VaccineEfficacy;
}

export interface VaccineEfficacy {
  readonly responseRate?: number;
  readonly recurrenceFreeRate?: number;
  readonly medianFollowUp?: number; // months
  readonly durableResponseRate?: number;
}

/**
 * Key mRNA Vaccine Programs
 */
export const KeymRNAVaccinePrograms: readonly mRNAVaccine[] = [
  {
    id: 'mrna-4157',
    name: 'mRNA-4157 (V940)',
    developer: 'Moderna/Merck',
    type: 'personalized_neoantigen',
    targetAntigens: ['Up to 34 patient-specific neoantigens'],
    deliverySystem: 'Lipid nanoparticle',
    cancerTypes: ['Melanoma', 'NSCLC', 'Bladder Cancer'],
    phase: 'phase_3',
    combinationPartner: 'Pembrolizumab',
    clinicalTrialId: 'NCT05933577',
    efficacyData: {
      recurrenceFreeRate: 44, // reduction vs pembro alone
      medianFollowUp: 36,
    },
  },
  {
    id: 'autogene-cevumeran',
    name: 'Autogene cevumeran',
    developer: 'BioNTech/Genentech',
    type: 'personalized_neoantigen',
    targetAntigens: ['Up to 20 patient-specific neoantigens'],
    deliverySystem: 'Lipid nanoparticle',
    cancerTypes: ['Pancreatic Cancer', 'Colorectal Cancer'],
    phase: 'phase_2',
    combinationPartner: 'Atezolizumab',
    clinicalTrialId: 'NCT04161755',
    efficacyData: {
      responseRate: 50,
      medianFollowUp: 48,
    },
  },
];

/**
 * CRISPR Gene Editing Therapy
 */
export interface CRISPRTherapy {
  readonly id: string;
  readonly name: string;
  readonly developer: string;
  readonly editingSystem: 'CRISPR-Cas9' | 'CRISPR-Cas12' | 'Base Editing' | 'Prime Editing';
  readonly targetGenes: readonly string[];
  readonly approach: 'ex_vivo' | 'in_vivo';
  readonly cellType?: string;
  readonly cancerTypes: readonly string[];
  readonly phase: 'preclinical' | 'phase_1' | 'phase_2' | 'phase_3' | 'approved';
  readonly clinicalTrialId?: string;
  readonly completeResponseRate?: number;
}

/**
 * Key CRISPR Cancer Programs
 */
export const KeyCRISPRPrograms: readonly CRISPRTherapy[] = [
  {
    id: 'ctx110',
    name: 'CTX110',
    developer: 'CRISPR Therapeutics',
    editingSystem: 'CRISPR-Cas9',
    targetGenes: ['TRAC', 'B2M'],
    approach: 'ex_vivo',
    cellType: 'Allogeneic CAR-T',
    cancerTypes: ['B-cell Malignancies'],
    phase: 'phase_1',
    clinicalTrialId: 'NCT04035434',
  },
  {
    id: 'cish-til',
    name: 'CISH-knockout TIL',
    developer: 'University of Minnesota',
    editingSystem: 'CRISPR-Cas9',
    targetGenes: ['CISH'],
    approach: 'ex_vivo',
    cellType: 'Tumor-infiltrating lymphocytes',
    cancerTypes: ['GI Cancers', 'Colorectal Cancer', 'Pancreatic Cancer'],
    phase: 'phase_1',
    completeResponseRate: 8, // 1 of 12 patients
  },
  {
    id: 'cb-010',
    name: 'CB-010',
    developer: 'Caribou Biosciences',
    editingSystem: 'CRISPR-Cas12',
    targetGenes: ['B2M', 'PD-1'],
    approach: 'ex_vivo',
    cellType: 'Allogeneic CAR-T',
    cancerTypes: ['B-cell NHL'],
    phase: 'phase_1',
    clinicalTrialId: 'NCT04637763',
    completeResponseRate: 69,
  },
];

/**
 * Oncolytic Virus Therapy
 */
export interface OncolyticVirusTherapy {
  readonly id: string;
  readonly name: string;
  readonly tradeName?: string;
  readonly developer: string;
  readonly virusType: 'HSV-1' | 'Adenovirus' | 'Vaccinia' | 'Reovirus' | 'Measles' | 'VSV' | 'Coxsackie';
  readonly modifications: readonly string[];
  readonly deliveryRoute: 'intratumoral' | 'intravenous' | 'intracavitary';
  readonly cancerTypes: readonly string[];
  readonly phase: 'preclinical' | 'phase_1' | 'phase_2' | 'phase_3' | 'approved';
  readonly combinationPartner?: string;
  readonly responseRate?: number;
  readonly approvalDate?: string;
}

/**
 * Key Oncolytic Virus Programs
 */
export const KeyOncolyticVirusPrograms: readonly OncolyticVirusTherapy[] = [
  {
    id: 't-vec',
    name: 'Talimogene laherparepvec',
    tradeName: 'Imlygic',
    developer: 'Amgen',
    virusType: 'HSV-1',
    modifications: ['GM-CSF expression', 'ICP34.5 deletion', 'ICP47 deletion'],
    deliveryRoute: 'intratumoral',
    cancerTypes: ['Melanoma'],
    phase: 'approved',
    responseRate: 26,
    approvalDate: '2015-10-27',
  },
  {
    id: 'rp1',
    name: 'RP1 (Vusolimogene oderparepvec)',
    developer: 'Replimune',
    virusType: 'HSV-1',
    modifications: ['GM-CSF expression', 'GALV-GP R- fusogenic protein'],
    deliveryRoute: 'intratumoral',
    cancerTypes: ['Melanoma', 'NMSC', 'HNSCC'],
    phase: 'phase_3',
    combinationPartner: 'Nivolumab',
    responseRate: 34, // In anti-PD-1 resistant melanoma
  },
  {
    id: 'g47delta',
    name: 'Teserpaturev (G47Δ)',
    tradeName: 'Delytact',
    developer: 'Daiichi Sankyo',
    virusType: 'HSV-1',
    modifications: ['Triple mutation'],
    deliveryRoute: 'intratumoral',
    cancerTypes: ['Glioblastoma'],
    phase: 'approved',
    approvalDate: '2021-06-11', // Japan
  },
];

/**
 * Treatment outcome tracking
 */
export interface CurativeOutcome {
  readonly therapyType: 'CAR-T' | 'mRNA_Vaccine' | 'CRISPR' | 'Oncolytic_Virus';
  readonly therapyId: string;
  readonly responseCategory: 'complete_response' | 'partial_response' | 'stable_disease' | 'progressive_disease';
  readonly durationOfResponse?: number; // months
  readonly minimalResidualDisease?: boolean;
  readonly relapseFree?: boolean;
  readonly followUpMonths: number;
}

/**
 * Curative potential assessment
 */
export interface CurativePotentialAssessment {
  readonly cancerType: string;
  readonly stage: string;
  readonly biomarkers: Record<string, string>;
  readonly eligibleTherapies: readonly EligibleCurativeTherapy[];
  readonly bestApproach: string;
  readonly rationale: string;
}

export interface EligibleCurativeTherapy {
  readonly therapyType: 'CAR-T' | 'mRNA_Vaccine' | 'CRISPR' | 'Oncolytic_Virus';
  readonly therapyName: string;
  readonly eligibilityStatus: 'approved' | 'clinical_trial' | 'compassionate_use';
  readonly expectedCompleteResponseRate?: number;
  readonly clinicalTrialId?: string;
  readonly considerations: readonly string[];
}
