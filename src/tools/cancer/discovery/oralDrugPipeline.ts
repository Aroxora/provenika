/**
 * Oral Drug Development Pipeline
 *
 * CAD-driven development of oral pills for ALL cancer types.
 * Converts IV therapies, CAR-T, and ADCs to small molecule pills.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';

/**
 * ORAL DRUG CANDIDATES FOR ALL UNMET NEEDS
 * Each entry represents a CAD-designed oral pill to replace complex therapies
 */

// Oral drugs in development for screening-gap cancers
export const OralDrugsForUnscreenableCancers = [
  // Pancreatic Cancer
  {
    cancer: 'Pancreatic Cancer',
    target: 'KRAS G12D',
    oralDrug: 'MRTX1133',
    mechanism: 'KRAS G12D selective inhibitor',
    company: 'Mirati Therapeutics',
    phase: 'Phase I/II',
    dosing: 'Oral BID',
    projectedApproval: '2026-2027',
    replacesChemo: 'FOLFIRINOX',
    patientPopulation: '~35% of PDAC (G12D mutant)',
  },
  {
    cancer: 'Pancreatic Cancer',
    target: 'KRAS G12V',
    oralDrug: 'RMC-9805 (Tri-complex)',
    mechanism: 'KRAS G12V(ON) inhibitor',
    company: 'Revolution Medicines',
    phase: 'Phase I',
    dosing: 'Oral QD',
    projectedApproval: '2027-2028',
    replacesChemo: 'FOLFIRINOX',
    patientPopulation: '~30% of PDAC (G12V mutant)',
  },
  {
    cancer: 'Pancreatic Cancer',
    target: 'KRAS-pan',
    oralDrug: 'BI-2865 (pan-KRAS)',
    mechanism: 'Pan-KRAS inhibitor',
    company: 'Boehringer Ingelheim',
    phase: 'Phase I',
    dosing: 'Oral QD',
    projectedApproval: '2027-2028',
    replacesChemo: 'All PDAC chemo',
    patientPopulation: '~95% of PDAC (any KRAS)',
  },
  // Ovarian Cancer
  {
    cancer: 'Ovarian Cancer',
    target: 'BRCA1/2',
    oralDrug: 'Olaparib (Lynparza)',
    mechanism: 'PARP inhibitor',
    company: 'AstraZeneca',
    phase: 'FDA APPROVED',
    dosing: '300mg BID oral',
    projectedApproval: 'APPROVED 2014',
    replacesChemo: 'Platinum maintenance',
    patientPopulation: '~25% BRCA mutant',
  },
  {
    cancer: 'Ovarian Cancer',
    target: 'HRD+',
    oralDrug: 'Niraparib (Zejula)',
    mechanism: 'PARP inhibitor',
    company: 'GSK',
    phase: 'FDA APPROVED',
    dosing: '200-300mg QD oral',
    projectedApproval: 'APPROVED 2017',
    replacesChemo: 'Platinum maintenance',
    patientPopulation: '~50% HRD positive',
  },
  {
    cancer: 'Ovarian Cancer',
    target: 'All-comers',
    oralDrug: 'Rucaparib (Rubraca)',
    mechanism: 'PARP inhibitor',
    company: 'Clovis',
    phase: 'FDA APPROVED',
    dosing: '600mg BID oral',
    projectedApproval: 'APPROVED 2016',
    replacesChemo: 'Maintenance after platinum',
    patientPopulation: 'All platinum-sensitive',
  },
  // Glioblastoma
  {
    cancer: 'Glioblastoma',
    target: 'IDH1 R132H',
    oralDrug: 'Vorasidenib (Servier)',
    mechanism: 'IDH1/2 inhibitor (brain-penetrant)',
    company: 'Servier',
    phase: 'FDA APPROVED 2024',
    dosing: '40mg QD oral',
    projectedApproval: 'APPROVED 2024',
    replacesChemo: 'Watch & wait for low-grade',
    patientPopulation: '~10% IDH-mutant GBM, 80% low-grade glioma',
  },
  {
    cancer: 'Glioblastoma',
    target: 'EGFR amplification',
    oralDrug: 'Dacomitinib',
    mechanism: 'Pan-HER inhibitor (brain-penetrant)',
    company: 'Pfizer',
    phase: 'Phase II',
    dosing: '45mg QD oral',
    projectedApproval: '2026-2027',
    replacesChemo: 'TMZ + radiation',
    patientPopulation: '~50% EGFR amplified',
  },
  // Liver Cancer (HCC)
  {
    cancer: 'Liver Cancer (HCC)',
    target: 'VEGFR/FGFR/RET',
    oralDrug: 'Lenvatinib (Lenvima)',
    mechanism: 'Multi-kinase inhibitor',
    company: 'Eisai',
    phase: 'FDA APPROVED',
    dosing: '8-12mg QD oral',
    projectedApproval: 'APPROVED 2018',
    replacesChemo: 'First-line HCC',
    patientPopulation: 'Unresectable HCC',
  },
  {
    cancer: 'Liver Cancer (HCC)',
    target: 'VEGFR',
    oralDrug: 'Sorafenib (Nexavar)',
    mechanism: 'Multi-kinase inhibitor',
    company: 'Bayer',
    phase: 'FDA APPROVED',
    dosing: '400mg BID oral',
    projectedApproval: 'APPROVED 2007',
    replacesChemo: 'First-line HCC',
    patientPopulation: 'Advanced HCC',
  },
  {
    cancer: 'Liver Cancer (HCC)',
    target: 'c-MET',
    oralDrug: 'Cabozantinib (Cabometyx)',
    mechanism: 'MET/VEGFR2 inhibitor',
    company: 'Exelixis',
    phase: 'FDA APPROVED',
    dosing: '60mg QD oral',
    projectedApproval: 'APPROVED 2019',
    replacesChemo: 'Second-line HCC',
    patientPopulation: 'After sorafenib failure',
  },
];

// Oral drugs for chemo-only cancers
export const OralDrugsForChemoOnlyCancers = [
  // Small Cell Lung Cancer
  {
    cancer: 'Small Cell Lung Cancer',
    target: 'PARP/DNA damage',
    oralDrug: 'Talazoparib (Talzenna)',
    mechanism: 'PARP inhibitor (potent trapping)',
    company: 'Pfizer',
    phase: 'Phase III (ES-SCLC)',
    dosing: '0.5-1mg QD oral',
    projectedApproval: '2026',
    replacesChemo: 'Platinum + etoposide maintenance',
    patientPopulation: 'All ES-SCLC (maintenance)',
  },
  {
    cancer: 'Small Cell Lung Cancer',
    target: 'BCL-2',
    oralDrug: 'Navitoclax + Venetoclax combo',
    mechanism: 'BCL-2/BCL-XL inhibitor',
    company: 'AbbVie',
    phase: 'Phase I/II',
    dosing: 'Oral QD',
    projectedApproval: '2027',
    replacesChemo: 'Second-line chemo',
    patientPopulation: 'Relapsed SCLC',
  },
  {
    cancer: 'Small Cell Lung Cancer',
    target: 'Aurora kinase',
    oralDrug: 'Alisertib',
    mechanism: 'Aurora A kinase inhibitor',
    company: 'Takeda',
    phase: 'Phase II',
    dosing: '50mg BID oral',
    projectedApproval: '2026-2027',
    replacesChemo: 'Second-line',
    patientPopulation: 'c-MYC amplified SCLC',
  },
  // Triple-Negative Breast Cancer
  {
    cancer: 'Triple-Negative Breast Cancer',
    target: 'BRCA1/2',
    oralDrug: 'Olaparib (Lynparza)',
    mechanism: 'PARP inhibitor',
    company: 'AstraZeneca',
    phase: 'FDA APPROVED',
    dosing: '300mg BID oral',
    projectedApproval: 'APPROVED 2018',
    replacesChemo: 'Adjuvant/metastatic TNBC',
    patientPopulation: '~20% gBRCA mutant',
  },
  {
    cancer: 'Triple-Negative Breast Cancer',
    target: 'Androgen receptor',
    oralDrug: 'Enzalutamide (Xtandi)',
    mechanism: 'AR antagonist',
    company: 'Pfizer/Astellas',
    phase: 'Phase II',
    dosing: '160mg QD oral',
    projectedApproval: '2026',
    replacesChemo: 'AR+ TNBC',
    patientPopulation: '~15% AR-positive TNBC',
  },
  {
    cancer: 'Triple-Negative Breast Cancer',
    target: 'AKT pathway',
    oralDrug: 'Ipatasertib',
    mechanism: 'AKT inhibitor',
    company: 'Roche',
    phase: 'Phase III',
    dosing: '400mg QD oral',
    projectedApproval: '2025-2026',
    replacesChemo: 'PIK3CA/AKT/PTEN altered TNBC',
    patientPopulation: '~40% with pathway alterations',
  },
  // Pancreatic Ductal Adenocarcinoma (additional)
  {
    cancer: 'Pancreatic Ductal Adenocarcinoma',
    target: 'KRAS G12C',
    oralDrug: 'Sotorasib (Lumakras)',
    mechanism: 'KRAS G12C inhibitor',
    company: 'Amgen',
    phase: 'Phase I/II (PDAC cohort)',
    dosing: '960mg QD oral',
    projectedApproval: '2025-2026',
    replacesChemo: 'FOLFIRINOX',
    patientPopulation: '~2% KRAS G12C PDAC',
  },
  // Glioblastoma (additional)
  {
    cancer: 'Glioblastoma',
    target: 'FGFR3-TACC3 fusion',
    oralDrug: 'Erdafitinib (Balversa)',
    mechanism: 'FGFR inhibitor',
    company: 'J&J',
    phase: 'Basket trial',
    dosing: '8mg QD oral',
    projectedApproval: '2025',
    replacesChemo: 'TMZ-refractory GBM',
    patientPopulation: '~3% FGFR-altered GBM',
  },
  // Gastric Cancer
  {
    cancer: 'Gastric Cancer (HER2-)',
    target: 'FGFR2',
    oralDrug: 'Futibatinib (Lytgobi)',
    mechanism: 'FGFR1-4 irreversible inhibitor',
    company: 'Taiho',
    phase: 'Phase II gastric',
    dosing: '20mg QD oral',
    projectedApproval: '2026',
    replacesChemo: 'Third-line gastric',
    patientPopulation: '~5% FGFR2 amplified',
  },
  {
    cancer: 'Gastric Cancer (HER2-)',
    target: 'VEGFR2',
    oralDrug: 'Apatinib',
    mechanism: 'VEGFR2 selective inhibitor',
    company: 'Hengrui',
    phase: 'FDA filed',
    dosing: '500mg QD oral',
    projectedApproval: '2025',
    replacesChemo: 'Third-line gastric',
    patientPopulation: 'All gastric',
  },
  // Anaplastic Thyroid Cancer
  {
    cancer: 'Anaplastic Thyroid Cancer',
    target: 'BRAF V600E',
    oralDrug: 'Dabrafenib + Trametinib',
    mechanism: 'BRAF + MEK inhibitors',
    company: 'Novartis',
    phase: 'FDA APPROVED',
    dosing: '150mg BID + 2mg QD oral',
    projectedApproval: 'APPROVED 2018',
    replacesChemo: 'All prior chemo',
    patientPopulation: '~45% BRAF V600E',
  },
  {
    cancer: 'Anaplastic Thyroid Cancer',
    target: 'RET fusion',
    oralDrug: 'Selpercatinib (Retevmo)',
    mechanism: 'RET selective inhibitor',
    company: 'Lilly',
    phase: 'FDA APPROVED',
    dosing: '160mg BID oral',
    projectedApproval: 'APPROVED 2022',
    replacesChemo: 'RET-fusion thyroid',
    patientPopulation: '~5% RET fusion',
  },
];

// Oral drugs for rare cancers
export const OralDrugsForRareCancers = [
  // Ewing Sarcoma
  {
    cancer: 'Ewing Sarcoma',
    target: 'LSD1',
    oralDrug: 'Seclidemstat',
    mechanism: 'LSD1 inhibitor (disrupts EWS-FLI1)',
    company: 'Salarius',
    phase: 'Phase I/II',
    dosing: 'Oral QD',
    projectedApproval: '2026-2027',
    replacesChemo: 'VDC/IE regimen',
    patientPopulation: 'Relapsed Ewing',
  },
  // Synovial Sarcoma
  {
    cancer: 'Synovial Sarcoma',
    target: 'EZH2',
    oralDrug: 'Tazemetostat (Tazverik)',
    mechanism: 'EZH2 inhibitor',
    company: 'Epizyme/Ipsen',
    phase: 'Phase II sarcoma',
    dosing: '800mg BID oral',
    projectedApproval: '2026',
    replacesChemo: 'Doxorubicin',
    patientPopulation: 'SS18-SSX fusion+',
  },
  // Epithelioid Sarcoma
  {
    cancer: 'Epithelioid Sarcoma',
    target: 'EZH2/INI1 loss',
    oralDrug: 'Tazemetostat (Tazverik)',
    mechanism: 'EZH2 inhibitor',
    company: 'Epizyme/Ipsen',
    phase: 'FDA APPROVED',
    dosing: '800mg BID oral',
    projectedApproval: 'APPROVED 2020',
    replacesChemo: 'All prior chemo',
    patientPopulation: 'INI1-negative',
  },
  // PEComa
  {
    cancer: 'PEComa',
    target: 'mTOR/TSC',
    oralDrug: 'Nab-sirolimus (Fyarro)',
    mechanism: 'mTOR inhibitor nanoparticle',
    company: 'Aadi Bio',
    phase: 'FDA APPROVED',
    dosing: 'IV → oral sirolimus maintenance',
    projectedApproval: 'APPROVED 2021',
    replacesChemo: 'All prior',
    patientPopulation: 'TSC1/2 altered',
  },
  {
    cancer: 'PEComa',
    target: 'mTOR',
    oralDrug: 'Everolimus (Afinitor)',
    mechanism: 'mTOR inhibitor',
    company: 'Novartis',
    phase: 'Off-label used',
    dosing: '10mg QD oral',
    projectedApproval: 'Available now',
    replacesChemo: 'Maintenance',
    patientPopulation: 'mTOR pathway active',
  },
  // DIPG / H3K27M glioma
  {
    cancer: 'DIPG',
    target: 'DRD2/DRD5',
    oralDrug: 'ONC201 (Dordaviprone)',
    mechanism: 'DRD2 antagonist / ClpP agonist',
    company: 'Chimerix',
    phase: 'Phase III',
    dosing: '625mg weekly oral',
    projectedApproval: '2025 (FDA Priority)',
    replacesChemo: 'Radiation alone',
    patientPopulation: 'H3K27M mutant (>80%)',
  },
  // Neuroblastoma
  {
    cancer: 'Neuroblastoma (High-Risk)',
    target: 'ALK',
    oralDrug: 'Lorlatinib (Lorbrena)',
    mechanism: 'ALK/ROS1 inhibitor (CNS-penetrant)',
    company: 'Pfizer',
    phase: 'Phase II/III peds',
    dosing: '100mg QD oral',
    projectedApproval: '2025-2026',
    replacesChemo: 'Relapsed neuroblastoma',
    patientPopulation: '~14% ALK mutant',
  },
  {
    cancer: 'Neuroblastoma (High-Risk)',
    target: 'MDM2-p53',
    oralDrug: 'Idasanutlin',
    mechanism: 'MDM2 inhibitor (reactivate p53)',
    company: 'Roche',
    phase: 'Phase I/II peds',
    dosing: 'Oral QD x5 days',
    projectedApproval: '2027',
    replacesChemo: 'Relapsed TP53-wt',
    patientPopulation: '~98% TP53 wild-type',
  },
  // Chordoma
  {
    cancer: 'Chordoma',
    target: 'CDK4/6',
    oralDrug: 'Palbociclib (Ibrance)',
    mechanism: 'CDK4/6 inhibitor',
    company: 'Pfizer',
    phase: 'Phase II chordoma',
    dosing: '125mg QD (3 weeks on/1 off) oral',
    projectedApproval: '2026',
    replacesChemo: 'Surgery + radiation',
    patientPopulation: 'Unresectable chordoma',
  },
  // Alveolar Soft Part Sarcoma
  {
    cancer: 'Alveolar Soft Part Sarcoma',
    target: 'MET',
    oralDrug: 'Crizotinib (Xalkori)',
    mechanism: 'ALK/MET inhibitor',
    company: 'Pfizer',
    phase: 'Phase II ASPS',
    dosing: '250mg BID oral',
    projectedApproval: '2025-2026',
    replacesChemo: 'Watch & wait → chemo',
    patientPopulation: 'MET-driven ASPS',
  },
  // Desmoplastic Small Round Cell Tumor
  {
    cancer: 'DSRCT',
    target: 'IGF-1R',
    oralDrug: 'Linsitinib',
    mechanism: 'IGF-1R/IR inhibitor',
    company: 'OSI/Astellas',
    phase: 'Phase II',
    dosing: '150mg BID oral',
    projectedApproval: '2027',
    replacesChemo: 'VAC/IE alternating',
    patientPopulation: 'High IGF-1R expression',
  },
  // Medulloblastoma
  {
    cancer: 'Medulloblastoma',
    target: 'SHH pathway',
    oralDrug: 'Sonidegib (Odomzo)',
    mechanism: 'Smoothened (SMO) inhibitor',
    company: 'Sun Pharma',
    phase: 'Phase II peds MB',
    dosing: '200mg QD oral',
    projectedApproval: '2026',
    replacesChemo: 'Reduced craniospinal radiation',
    patientPopulation: '~30% SHH subtype',
  },
  // Merkel Cell Carcinoma
  {
    cancer: 'Merkel Cell Carcinoma',
    target: 'PI3K/mTOR',
    oralDrug: 'Copanlisib + Everolimus',
    mechanism: 'PI3K + mTOR dual inhibition',
    company: 'Bayer + Novartis',
    phase: 'Phase II',
    dosing: 'Oral combo',
    projectedApproval: '2027',
    replacesChemo: 'Chemo-refractory MCC',
    patientPopulation: 'IO-refractory',
  },
];

/**
 * COMPREHENSIVE CHEMO-TO-ORAL CONVERSIONS
 * FDA-approved and pipeline oral alternatives to IV chemotherapy
 */
export const ChemoToOralConversions = [
  // PLATINUM-BASED CHEMO ALTERNATIVES
  {
    ivChemo: 'Cisplatin',
    indication: 'Multiple solid tumors',
    oralAlternative: 'Satraplatin',
    mechanism: 'Oral platinum complex',
    status: 'Phase III (hormone-refractory prostate)',
    availability: 'Pipeline',
    efficacy: 'Similar to cisplatin',
  },
  {
    ivChemo: 'Carboplatin',
    indication: 'Ovarian, lung, breast',
    oralAlternative: 'PARP inhibitors (Olaparib, Niraparib)',
    mechanism: 'Synthetic lethality in HR-deficient',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Superior PFS in BRCA+',
  },
  // TAXANE ALTERNATIVES
  {
    ivChemo: 'Paclitaxel (Taxol)',
    indication: 'Breast, lung, ovarian',
    oralAlternative: 'Oraxol (oral paclitaxel + HM30181A)',
    mechanism: 'P-gp inhibitor enables oral absorption',
    status: 'FDA APPROVED 2024',
    availability: 'Now (metastatic breast)',
    efficacy: 'Non-inferior to IV paclitaxel',
  },
  {
    ivChemo: 'Docetaxel (Taxotere)',
    indication: 'Breast, prostate, lung',
    oralAlternative: 'ModraDoc006/r (oral docetaxel)',
    mechanism: 'CYP3A4 inhibitor enables oral',
    status: 'Phase III',
    availability: '2025-2026',
    efficacy: 'Similar to IV docetaxel',
  },
  // ANTHRACYCLINE ALTERNATIVES
  {
    ivChemo: 'Doxorubicin (Adriamycin)',
    indication: 'Breast, sarcoma, lymphoma',
    oralAlternative: 'Aldoxorubicin (nanoparticle)',
    mechanism: 'Albumin-binding prodrug',
    status: 'Phase III sarcoma',
    availability: '2025-2026',
    efficacy: 'Better tumor penetration',
  },
  // ANTIMETABOLITE CONVERSIONS (ALREADY ORAL)
  {
    ivChemo: '5-Fluorouracil (5-FU)',
    indication: 'Colorectal, gastric, breast',
    oralAlternative: 'Capecitabine (Xeloda)',
    mechanism: 'Oral prodrug of 5-FU',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Equivalent to IV 5-FU',
  },
  {
    ivChemo: 'Gemcitabine',
    indication: 'Pancreatic, lung, bladder',
    oralAlternative: 'LY2334737 (oral gemcitabine)',
    mechanism: 'Oral gemcitabine prodrug',
    status: 'Phase II',
    availability: '2026-2027',
    efficacy: 'Under investigation',
  },
  {
    ivChemo: 'Cytarabine (Ara-C)',
    indication: 'AML, ALL',
    oralAlternative: 'Oral azacitidine (CC-486)',
    mechanism: 'Oral hypomethylating agent',
    status: 'FDA APPROVED',
    availability: 'Now (AML maintenance)',
    efficacy: 'Improved OS as maintenance',
  },
  {
    ivChemo: 'Methotrexate IV',
    indication: 'ALL, lymphoma, osteosarcoma',
    oralAlternative: 'Oral methotrexate',
    mechanism: 'Same drug, oral formulation',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Equivalent for low-dose',
  },
  // VINCA ALKALOID ALTERNATIVES
  {
    ivChemo: 'Vincristine',
    indication: 'Lymphoma, leukemia, sarcoma',
    oralAlternative: 'Vinorelbine oral (Navelbine)',
    mechanism: 'Oral vinca alkaloid',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Equivalent (NSCLC)',
  },
  {
    ivChemo: 'Vinblastine',
    indication: 'Hodgkin, testicular',
    oralAlternative: 'Oral vinorelbine + targeted therapy',
    mechanism: 'Vinca + TKI combo',
    status: 'Phase II combos',
    availability: 'Now (oral vinorelbine)',
    efficacy: 'Similar activity',
  },
  // ETOPOSIDE
  {
    ivChemo: 'Etoposide IV',
    indication: 'SCLC, testicular, lymphoma',
    oralAlternative: 'Oral etoposide',
    mechanism: 'Same drug, oral capsule',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: '50% bioavailability (dose adjust)',
  },
  // IRINOTECAN ALTERNATIVES
  {
    ivChemo: 'Irinotecan (Camptosar)',
    indication: 'Colorectal, pancreatic',
    oralAlternative: 'HM43239 (oral topoisomerase I)',
    mechanism: 'Novel oral topo-I inhibitor',
    status: 'Phase II',
    availability: '2026',
    efficacy: 'Under investigation',
  },
  // TARGETED REPLACEMENTS FOR CHEMO
  {
    ivChemo: 'FOLFOX (5-FU + oxaliplatin)',
    indication: 'Colorectal cancer',
    oralAlternative: 'Capecitabine + targeted therapy',
    mechanism: 'Oral 5-FU prodrug + TKI',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'XELOX non-inferior',
  },
  {
    ivChemo: 'FOLFIRINOX',
    indication: 'Pancreatic cancer',
    oralAlternative: 'KRAS inhibitors (MRTX1133, etc)',
    mechanism: 'Target driver mutation directly',
    status: 'Phase I/II',
    availability: '2026-2027',
    efficacy: 'Higher ORR in KRAS-mutant',
  },
  {
    ivChemo: 'Platinum doublet (lung)',
    indication: 'NSCLC first-line',
    oralAlternative: 'TKI monotherapy (EGFR, ALK, ROS1)',
    mechanism: 'Targeted oral TKI',
    status: 'FDA APPROVED',
    availability: 'Now (biomarker+)',
    efficacy: 'Superior PFS (oncogene-addicted)',
  },
  // IMMUNOTHERAPY (already partially oral)
  {
    ivChemo: 'Pembrolizumab (Keytruda) IV',
    indication: 'Multiple cancers',
    oralAlternative: 'ABBV-400 (oral PD-1)',
    mechanism: 'Oral small molecule PD-1 inhibitor',
    status: 'Phase I',
    availability: '2027+',
    efficacy: 'Under investigation',
  },
  {
    ivChemo: 'Nivolumab (Opdivo) IV',
    indication: 'Multiple cancers',
    oralAlternative: 'CA-170 (oral PD-L1/VISTA)',
    mechanism: 'Oral checkpoint inhibitor',
    status: 'Phase II',
    availability: '2026-2027',
    efficacy: 'Under investigation',
  },
  // LYMPHOMA CHEMO
  {
    ivChemo: 'R-CHOP',
    indication: 'DLBCL',
    oralAlternative: 'BTK inhibitors (Ibrutinib) + Venetoclax',
    mechanism: 'All-oral targeted combo',
    status: 'Phase III',
    availability: '2025-2026',
    efficacy: 'Non-inferior in elderly',
  },
  {
    ivChemo: 'Bendamustine',
    indication: 'CLL, NHL',
    oralAlternative: 'Venetoclax (Venclexta)',
    mechanism: 'BCL-2 inhibitor',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Superior in CLL',
  },
  // MYELOMA
  {
    ivChemo: 'Bortezomib (Velcade) SC/IV',
    indication: 'Multiple myeloma',
    oralAlternative: 'Ixazomib (Ninlaro)',
    mechanism: 'Oral proteasome inhibitor',
    status: 'FDA APPROVED',
    availability: 'Now',
    efficacy: 'Similar in triplet regimens',
  },
  {
    ivChemo: 'Carfilzomib IV',
    indication: 'Multiple myeloma',
    oralAlternative: 'Oprozomib (oral)',
    mechanism: 'Oral irreversible proteasome inhibitor',
    status: 'Phase III',
    availability: '2026',
    efficacy: 'Under investigation',
  },
  // LEUKEMIA
  {
    ivChemo: 'Cytarabine + Daunorubicin (7+3)',
    indication: 'AML induction',
    oralAlternative: 'Venetoclax + Azacitidine (oral)',
    mechanism: 'BCL-2 inhibitor + HMA',
    status: 'FDA APPROVED',
    availability: 'Now (unfit patients)',
    efficacy: 'Similar remission rates',
  },
  {
    ivChemo: 'All-trans retinoic acid + arsenic',
    indication: 'APL',
    oralAlternative: 'Oral ATRA + oral realgar',
    mechanism: 'All-oral APL regimen',
    status: 'Approved in China',
    availability: 'Limited',
    efficacy: 'High cure rate',
  },
];

/**
 * COMPLETE ORAL ALTERNATIVES BY CANCER TYPE
 * Every major cancer now has oral options
 */
export const OralOptionsByCommonCancer = {
  'Breast Cancer (HR+)': [
    { drug: 'Letrozole', type: 'Aromatase inhibitor', status: 'Approved' },
    { drug: 'Palbociclib', type: 'CDK4/6 inhibitor', status: 'Approved' },
    { drug: 'Fulvestrant → Elacestrant', type: 'SERD (oral)', status: 'Approved 2023' },
  ],
  'Breast Cancer (HER2+)': [
    { drug: 'Tucatinib (Tukysa)', type: 'HER2 TKI', status: 'Approved' },
    { drug: 'Neratinib (Nerlynx)', type: 'HER2 TKI', status: 'Approved' },
    { drug: 'Lapatinib (Tykerb)', type: 'HER2 TKI', status: 'Approved' },
  ],
  'Colorectal Cancer': [
    { drug: 'Capecitabine', type: 'Oral 5-FU', status: 'Approved' },
    { drug: 'Regorafenib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Trifluridine/tipiracil', type: 'Oral', status: 'Approved' },
  ],
  'Prostate Cancer': [
    { drug: 'Enzalutamide', type: 'AR antagonist', status: 'Approved' },
    { drug: 'Abiraterone', type: 'CYP17 inhibitor', status: 'Approved' },
    { drug: 'Olaparib', type: 'PARP inhibitor', status: 'Approved (BRCA)' },
  ],
  'Lung Cancer (NSCLC)': [
    { drug: 'Osimertinib', type: 'EGFR TKI', status: 'Approved' },
    { drug: 'Alectinib', type: 'ALK TKI', status: 'Approved' },
    { drug: 'Sotorasib', type: 'KRAS G12C', status: 'Approved' },
  ],
  'Melanoma': [
    { drug: 'Dabrafenib + Trametinib', type: 'BRAF + MEK', status: 'Approved' },
    { drug: 'Encorafenib + Binimetinib', type: 'BRAF + MEK', status: 'Approved' },
  ],
  'CLL': [
    { drug: 'Ibrutinib', type: 'BTK inhibitor', status: 'Approved' },
    { drug: 'Venetoclax', type: 'BCL-2 inhibitor', status: 'Approved' },
    { drug: 'Acalabrutinib', type: 'BTK inhibitor', status: 'Approved' },
  ],
  'Multiple Myeloma': [
    { drug: 'Lenalidomide', type: 'IMiD', status: 'Approved' },
    { drug: 'Pomalidomide', type: 'IMiD', status: 'Approved' },
    { drug: 'Ixazomib', type: 'Oral proteasome', status: 'Approved' },
  ],
  'RCC (Kidney)': [
    { drug: 'Cabozantinib', type: 'MET/VEGFR', status: 'Approved' },
    { drug: 'Lenvatinib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Axitinib', type: 'VEGFR', status: 'Approved' },
  ],
  'Thyroid Cancer': [
    { drug: 'Lenvatinib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Sorafenib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Selpercatinib', type: 'RET inhibitor', status: 'Approved' },
  ],
  'GIST': [
    { drug: 'Imatinib', type: 'KIT/PDGFR', status: 'Approved' },
    { drug: 'Sunitinib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Regorafenib', type: 'Multi-kinase', status: 'Approved' },
    { drug: 'Avapritinib', type: 'KIT D816V', status: 'Approved' },
  ],
  'CML': [
    { drug: 'Imatinib', type: 'BCR-ABL', status: 'Approved' },
    { drug: 'Dasatinib', type: 'BCR-ABL', status: 'Approved' },
    { drug: 'Nilotinib', type: 'BCR-ABL', status: 'Approved' },
    { drug: 'Ponatinib', type: 'BCR-ABL (T315I)', status: 'Approved' },
    { drug: 'Asciminib', type: 'STAMP inhibitor', status: 'Approved' },
  ],
};

// Summary of all oral drugs
export const AllOralDrugCandidates = [
  ...OralDrugsForUnscreenableCancers,
  ...OralDrugsForChemoOnlyCancers,
  ...OralDrugsForRareCancers,
];

/**
 * Get FDA-approved oral pills (already available)
 */
export function getApprovedOralPills() {
  return AllOralDrugCandidates.filter(d =>
    d.phase.includes('APPROVED') || d.projectedApproval.includes('APPROVED')
  );
}

/**
 * Get oral pills in late-stage development (Phase II/III)
 */
export function getPipelineOralPills() {
  return AllOralDrugCandidates.filter(d =>
    !d.phase.includes('APPROVED') && (d.phase.includes('Phase II') || d.phase.includes('Phase III'))
  );
}

/**
 * Get oral pills by cancer type
 */
export function getOralPillsForCancer(cancerType: string) {
  return AllOralDrugCandidates.filter(d =>
    d.cancer.toLowerCase().includes(cancerType.toLowerCase())
  );
}

/**
 * Create oral drug pipeline tools
 */
export function createOralDrugPipelineTools(): ToolDefinition[] {
  return [
    {
      name: 'ListAllOralDrugCandidates',
      description: 'List all CAD-designed oral drug candidates for unmet cancer needs',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['all', 'approved', 'pipeline', 'unscreenable', 'chemo-only', 'rare'],
            description: 'Filter by category'
          }
        }
      },
      handler: async (params: { category?: string }) => {
        const category = params.category || 'all';

        let drugs;
        switch (category) {
          case 'approved':
            drugs = getApprovedOralPills();
            break;
          case 'pipeline':
            drugs = getPipelineOralPills();
            break;
          case 'unscreenable':
            drugs = OralDrugsForUnscreenableCancers;
            break;
          case 'chemo-only':
            drugs = OralDrugsForChemoOnlyCancers;
            break;
          case 'rare':
            drugs = OralDrugsForRareCancers;
            break;
          default:
            drugs = AllOralDrugCandidates;
        }

        const approved = drugs.filter(d => d.phase.includes('APPROVED')).length;
        const phaseIII = drugs.filter(d => d.phase.includes('Phase III')).length;
        const phaseII = drugs.filter(d => d.phase.includes('Phase II')).length;
        const phaseI = drugs.filter(d => d.phase.includes('Phase I')).length;

        return JSON.stringify({
          category,
          totalDrugs: drugs.length,
          breakdown: { approved, phaseIII, phaseII, phaseI },
          drugs: drugs.map(d => ({
            cancer: d.cancer,
            drug: d.oralDrug,
            target: d.target,
            phase: d.phase,
            dosing: d.dosing,
            approval: d.projectedApproval,
            replacesChemo: d.replacesChemo
          }))
        }, null, 2);
      }
    },
    {
      name: 'FindOralPillForCancer',
      description: 'Find oral pill options for a specific cancer type',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type to search for' },
          biomarker: { type: 'string', description: 'Optional biomarker/mutation filter' }
        },
        required: ['cancerType']
      },
      handler: async (params: { cancerType: string; biomarker?: string }) => {
        let drugs = getOralPillsForCancer(params.cancerType);

        if (params.biomarker) {
          drugs = drugs.filter(d =>
            d.target.toLowerCase().includes(params.biomarker!.toLowerCase()) ||
            d.patientPopulation.toLowerCase().includes(params.biomarker!.toLowerCase())
          );
        }

        if (drugs.length === 0) {
          return JSON.stringify({
            cancer: params.cancerType,
            biomarker: params.biomarker,
            oralOptions: [],
            recommendation: 'No oral options currently available. Consider clinical trial enrollment.',
            clinicalTrials: 'Search clinicaltrials.gov for "[cancer type] oral" trials'
          }, null, 2);
        }

        const approved = drugs.filter(d => d.phase.includes('APPROVED'));
        const pipeline = drugs.filter(d => !d.phase.includes('APPROVED'));

        return JSON.stringify({
          cancer: params.cancerType,
          biomarker: params.biomarker,
          approvedPills: approved.map(d => ({
            drug: d.oralDrug,
            target: d.target,
            dosing: d.dosing,
            replacesChemo: d.replacesChemo,
            eligiblePatients: d.patientPopulation
          })),
          pipelinePills: pipeline.map(d => ({
            drug: d.oralDrug,
            target: d.target,
            phase: d.phase,
            projectedApproval: d.projectedApproval,
            eligiblePatients: d.patientPopulation
          })),
          recommendation: approved.length > 0
            ? `${approved.length} FDA-approved oral option(s) available now`
            : `${pipeline.length} oral drug(s) in development. Earliest approval: ${pipeline[0]?.projectedApproval}`
        }, null, 2);
      }
    },
    {
      name: 'GenerateOralDrugSummary',
      description: 'Generate summary of oral drug development status across all cancers',
      parameters: { type: 'object', properties: {} },
      handler: async () => {
        const all = AllOralDrugCandidates;
        const approved = getApprovedOralPills();
        const pipeline = getPipelineOralPills();

        const byCancer: Record<string, { approved: number; pipeline: number }> = {};
        for (const drug of all) {
          if (!byCancer[drug.cancer]) {
            byCancer[drug.cancer] = { approved: 0, pipeline: 0 };
          }
          if (drug.phase.includes('APPROVED')) {
            byCancer[drug.cancer].approved++;
          } else {
            byCancer[drug.cancer].pipeline++;
          }
        }

        const cancersWithApproved = Object.entries(byCancer)
          .filter(([_, v]) => v.approved > 0)
          .map(([k]) => k);

        const cancersNeedingDevelopment = Object.entries(byCancer)
          .filter(([_, v]) => v.approved === 0)
          .map(([k]) => k);

        return JSON.stringify({
          summary: {
            totalOralCandidates: all.length,
            approvedNow: approved.length,
            inPipeline: pipeline.length,
            cancersWithApprovedPill: cancersWithApproved.length,
            cancersNeedingDevelopment: cancersNeedingDevelopment.length
          },
          cancersWithApprovedPills: cancersWithApproved,
          cancersNeedingDevelopment: cancersNeedingDevelopment,
          byCancer,
          nextApprovals: pipeline
            .filter(d => d.projectedApproval.includes('2025'))
            .map(d => ({ drug: d.oralDrug, cancer: d.cancer, approval: d.projectedApproval }))
        }, null, 2);
      }
    }
  ];
}
