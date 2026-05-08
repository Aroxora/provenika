/**
 * Cancer Screening & Cure Gap Analysis Tools
 *
 * Identifies shortcomings in cancer detection and treatment
 * across ALL cancer types including rare and complex cases.
 * Proposes CAD solutions for unmet needs.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createTavilyClient, type TavilyClient } from '../../../datasources/research/tavilyClient.js';

let tavilyClient: TavilyClient | null = null;

function getClient(apiKey?: string): TavilyClient {
  if (!tavilyClient && apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }
  if (!tavilyClient) {
    throw new Error('Tavily API key required');
  }
  return tavilyClient;
}

/**
 * COMPREHENSIVE GAP ANALYSIS DATABASE
 */

// Cancers with NO approved screening test - WITH CAD-PROPOSED SOLUTIONS
export const NoScreeningCancers = [
  { type: 'Pancreatic Cancer', incidence: 64000, survival5yr: 12, reason: 'No biomarkers, deep location, asymptomatic until late stage',
    cadSolution: 'cfDNA methylation (Galleri) + CA19-9 + EUS for high-risk', technology: 'MCED liquid biopsy', fdaPathway: 'Breakthrough Device', indStatus: 'Phase III PATHFINDER-2' },
  { type: 'Ovarian Cancer', incidence: 19700, survival5yr: 50, reason: 'No reliable screening, CA-125 not specific enough',
    cadSolution: 'HE4 + CA125 + ROMA algorithm + transvaginal ultrasound', technology: 'Multi-marker panel', fdaPathway: 'PMA', indStatus: 'ROCA trial ongoing' },
  { type: 'Brain Tumors (Glioma)', incidence: 25000, survival5yr: 7, reason: 'No blood test, requires imaging, symptoms late',
    cadSolution: 'Serum GFAP + S100B + cfDNA IDH1/TERT mutations', technology: 'Blood biomarker panel', fdaPathway: 'Breakthrough Device', indStatus: 'Pre-IND studies' },
  { type: 'Esophageal Cancer', incidence: 21500, survival5yr: 22, reason: 'Endoscopy invasive, no blood test',
    cadSolution: 'Cytosponge + TFF3 (Barrett screening) + methylation markers', technology: 'Swallowable sponge', fdaPathway: 'De Novo 510(k)', indStatus: 'UK NHS approved, US trials' },
  { type: 'Stomach Cancer', incidence: 26500, survival5yr: 36, reason: 'No screening in Western countries, endoscopy needed',
    cadSolution: 'Pepsinogen I/II ratio + H.pylori + methylation panel', technology: 'Serological panel', fdaPathway: 'PMA', indStatus: 'Japan/Korea standard, US validation' },
  { type: 'Liver Cancer (HCC)', incidence: 41200, survival5yr: 21, reason: 'High-risk screening only, AFP insensitive',
    cadSolution: 'GALAD score (AFP + AFP-L3 + DCP) + ultrasound + ctDNA', technology: 'Multi-marker algorithm', fdaPathway: 'Breakthrough Device', indStatus: 'Phase III GALADUS' },
  { type: 'Kidney Cancer', incidence: 81800, survival5yr: 77, reason: 'Usually incidental finding, no screening',
    cadSolution: 'Urine KIM-1 + NGAL + cfDNA VHL mutations', technology: 'Urine biomarker', fdaPathway: 'De Novo 510(k)', indStatus: 'Early clinical validation' },
  { type: 'Bladder Cancer', incidence: 83200, survival5yr: 77, reason: 'Cytology insensitive, cystoscopy invasive',
    cadSolution: 'Cxbladder (5-gene panel) + UroVysion FISH + methylation', technology: 'Urine genomic test', fdaPathway: 'PMA', indStatus: 'FDA approved (Cxbladder)' },
  { type: 'Sarcomas', incidence: 13500, survival5yr: 65, reason: 'Too rare for population screening, many subtypes',
    cadSolution: 'Fusion gene panel (EWS, SS18, PAX) in cfDNA', technology: 'Targeted cfDNA panel', fdaPathway: 'Orphan Device', indStatus: 'Proof-of-concept' },
  { type: 'Neuroendocrine Tumors', incidence: 12000, survival5yr: 'varies', reason: 'Heterogeneous, no universal marker',
    cadSolution: 'NETest (51-gene blood test) + Chromogranin A', technology: 'Blood mRNA panel', fdaPathway: 'CLIA/LDT → PMA', indStatus: 'Clinically available' },
  { type: 'Cholangiocarcinoma', incidence: 8000, survival5yr: 10, reason: 'Rare, no screening, CA19-9 nonspecific',
    cadSolution: 'CA19-9 + CEA + cfDNA FGFR2/IDH1 + bile duct brushing', technology: 'Multi-modal panel', fdaPathway: 'Orphan Device', indStatus: 'High-risk surveillance trials' },
  { type: 'Mesothelioma', incidence: 3000, survival5yr: 12, reason: 'Asbestos exposure screening only',
    cadSolution: 'Fibulin-3 + mesothelin + SMRP + low-dose CT', technology: 'Blood biomarker + imaging', fdaPathway: 'Breakthrough Device', indStatus: 'Asbestos cohort studies' },
  { type: 'Thyroid Cancer', incidence: 44000, survival5yr: 98, reason: 'Overdiagnosis concerns, ultrasound not routine',
    cadSolution: 'ThyroSeq (genomic classifier) for nodules only', technology: 'Molecular classifier', fdaPathway: 'LDT → PMA', indStatus: 'Reduce unnecessary surgery' },
  { type: 'Head & Neck Cancers', incidence: 66000, survival5yr: 68, reason: 'HPV screening emerging, most found late',
    cadSolution: 'HPV E6/E7 oncoproteins + p16 + oral rinse DNA', technology: 'HPV-based screening', fdaPathway: 'PMA', indStatus: 'HPV+ oropharynx trials' },
];

// Cancers with NO targeted therapy (chemo only) - WITH CAD-PROPOSED SOLUTIONS
export const NoTargetedTherapyCancers = [
  { type: 'Small Cell Lung Cancer', currentTx: 'Platinum + Etoposide + PD-L1', gap: 'No targetable driver, relapses rapidly', research: 'DLL3-targeting ADCs, PARP inhibitors',
    cadSolution: 'Tarlatamab (DLL3 BiTE) + Rova-T (DLL3 ADC)', target: 'DLL3', modality: 'BiTE/ADC', fdaPathway: 'Accelerated Approval', indStatus: 'Tarlatamab Phase III positive' },
  { type: 'Triple-Negative Breast Cancer', currentTx: 'Chemo + Immunotherapy', gap: 'No hormone/HER2 targets', research: 'TROP2 ADCs, AKT inhibitors, AR targeting',
    cadSolution: 'Sacituzumab govitecan (Trodelvy) + Dato-DXd (TROP2 ADC)', target: 'TROP2', modality: 'ADC', fdaPathway: 'Full Approval', indStatus: 'FDA Approved (Trodelvy)' },
  { type: 'Pancreatic Ductal Adenocarcinoma', currentTx: 'FOLFIRINOX, Gemcitabine', gap: 'KRAS G12D (most common) not yet druggable', research: 'KRAS G12D inhibitors in trials',
    cadSolution: 'MRTX1133 (KRAS G12D) + mRNA-4157 neoantigen vaccine', target: 'KRAS G12D', modality: 'Small molecule + mRNA', fdaPathway: 'Breakthrough Therapy', indStatus: 'MRTX1133 Phase I/II' },
  { type: 'Glioblastoma', currentTx: 'TMZ + Radiation', gap: 'Blood-brain barrier, heterogeneity', research: 'CAR-T, oncolytic virus, tumor treating fields',
    cadSolution: 'EGFRvIII CAR-T + IL13Ra2 CAR-T + CED delivery', target: 'EGFRvIII/IL13Ra2', modality: 'CAR-T', fdaPathway: 'RMAT + Accelerated', indStatus: 'City of Hope Phase I/II' },
  { type: 'Gastric Cancer (HER2-)', currentTx: 'FOLFOX, Immunotherapy', gap: 'Limited targets beyond HER2/PD-1', research: 'CLDN18.2 targeting, FGFR inhibitors',
    cadSolution: 'Zolbetuximab (CLDN18.2 Ab) + FGFR2 inhibitors', target: 'CLDN18.2', modality: 'Monoclonal Ab', fdaPathway: 'Priority Review', indStatus: 'Zolbetuximab FDA submitted' },
  { type: 'Uterine Serous Carcinoma', currentTx: 'Carboplatin + Paclitaxel', gap: 'Aggressive, limited targets', research: 'HER2 targeting, PARP if HRD',
    cadSolution: 'T-DXd (HER2 low ADC) + Olaparib (if HRD+)', target: 'HER2 low/BRCA', modality: 'ADC + PARPi', fdaPathway: 'Accelerated Approval', indStatus: 'Basket trials enrolling' },
  { type: 'Gallbladder Cancer', currentTx: 'Gemcitabine + Cisplatin', gap: 'Rare, poor prognosis', research: 'FGFR, IDH inhibitors if mutated',
    cadSolution: 'Pemigatinib (FGFR2) + Ivosidenib (IDH1)', target: 'FGFR2/IDH1', modality: 'Targeted TKI', fdaPathway: 'Orphan Drug', indStatus: 'Expanded indication trials' },
  { type: 'Anaplastic Thyroid Cancer', currentTx: 'Dabrafenib/Trametinib if BRAF+', gap: 'Most are BRAF wild-type', research: 'Immunotherapy combinations',
    cadSolution: 'Lenvatinib + Pembrolizumab + Radiotherapy', target: 'VEGFR/PD-1', modality: 'TKI + IO', fdaPathway: 'Accelerated Approval', indStatus: 'Phase II combinations' },
  { type: 'Adrenocortical Carcinoma', currentTx: 'Mitotane + Chemo', gap: 'No targeted therapy', research: 'IGF-1R inhibitors, immunotherapy',
    cadSolution: 'Linsitinib (IGF-1R) + Pembrolizumab + CDK4/6i', target: 'IGF-1R/CDK4', modality: 'TKI combo', fdaPathway: 'Orphan Drug', indStatus: 'Phase II trials' },
  { type: 'Merkel Cell Carcinoma', currentTx: 'Immunotherapy', gap: 'Chemo-refractory cases', research: 'Virus-specific T cells if MCPyV+',
    cadSolution: 'MCPyV-specific TCR-T cells + oncolytic virus', target: 'MCPyV T-antigen', modality: 'TCR-T', fdaPathway: 'RMAT', indStatus: 'Phase I/II at NCI' },
];

// Rare cancers (<6/100,000) with major unmet needs - WITH CAD-PROPOSED SOLUTIONS
export const RareCancersUnmetNeeds = [
  { type: 'Ewing Sarcoma', incidence: 200, age: 'Pediatric/AYA', target: 'EWS-FLI1 fusion', gap: 'Fusion transcription factor, undruggable', proposed: 'LSD1 inhibitors, mithramycin analogs, CAR-T',
    cadSolution: 'Seclidemstat (LSD1i) + GD2 CAR-T', modality: 'Epigenetic + CAR-T', fdaPathway: 'Orphan + RPDD', indStatus: 'Seclidemstat Phase I/II' },
  { type: 'Osteosarcoma', incidence: 1000, age: 'Pediatric/AYA', target: 'Complex karyotype', gap: 'No driver mutation, heterogeneous', proposed: 'HER2 CAR-T, GD2 CAR-T, immunotherapy',
    cadSolution: 'HER2 CAR-T (COH) + Pembrolizumab + Mifamurtide', modality: 'CAR-T + IO', fdaPathway: 'Orphan + RMAT', indStatus: 'NCT03618381 Phase I/II' },
  { type: 'Rhabdomyosarcoma', incidence: 350, age: 'Pediatric', target: 'PAX-FOXO1 fusion', gap: 'Transcription factor fusion', proposed: 'IGF-1R inhibitors, immunotherapy',
    cadSolution: 'FGFR4 inhibitor + CAR-T (ROR1)', modality: 'TKI + CAR-T', fdaPathway: 'Orphan + RPDD', indStatus: 'COG ARST2021 trial' },
  { type: 'DIPG (Diffuse Intrinsic Pontine Glioma)', incidence: 300, age: 'Pediatric', target: 'H3K27M mutation', gap: 'Location inoperable, BBB', proposed: 'ONC201, H3K27M CAR-T, CED delivery',
    cadSolution: 'ONC201 + GD2 CAR-T (CED) + H3K27M peptide vaccine', modality: 'Small molecule + CAR-T + vaccine', fdaPathway: 'RPDD + Breakthrough', indStatus: 'ONC201 expanded access' },
  { type: 'Neuroblastoma (High-Risk)', incidence: 800, age: 'Pediatric', target: 'MYCN amplification', gap: 'MYCN undruggable', proposed: 'GD2 CAR-T, ALK inhibitors, anti-GD2 Ab',
    cadSolution: 'Dinutuximab + GD2 CAR-T + Lorlatinib (ALK)', modality: 'Ab + CAR-T + TKI', fdaPathway: 'Orphan + RPDD', indStatus: 'ANBL2232 Phase III' },
  { type: 'Medulloblastoma', incidence: 500, age: 'Pediatric', target: 'SHH, WNT, Group 3/4', gap: 'Subgroup-specific', proposed: 'SHH inhibitors, GD2 CAR-T',
    cadSolution: 'Sonidegib (SHH) + GD2/B7-H3 CAR-T + Palbociclib', modality: 'SMOi + CAR-T + CDK4/6i', fdaPathway: 'Orphan + RPDD', indStatus: 'SJMB21 adaptive trial' },
  { type: 'Synovial Sarcoma', incidence: 800, age: 'AYA', target: 'SS18-SSX fusion', gap: 'Transcription factor', proposed: 'NY-ESO-1 TCR-T, epigenetic therapy',
    cadSolution: 'Afamitresgene autoleucel (NY-ESO-1 TCR-T)', modality: 'TCR-T', fdaPathway: 'RMAT + Priority Review', indStatus: 'BLA submitted 2024' },
  { type: 'Chordoma', incidence: 300, age: 'Adult', target: 'Brachyury', gap: 'Transcription factor', proposed: 'Brachyury vaccine, CDK4/6 inhibitors',
    cadSolution: 'GI-6301 (Brachyury vaccine) + Palbociclib + EGFR inhibitor', modality: 'Vaccine + TKI', fdaPathway: 'Orphan Drug', indStatus: 'Phase II NCI' },
  { type: 'Desmoplastic Small Round Cell Tumor', incidence: 100, age: 'AYA', target: 'EWSR1-WT1 fusion', gap: 'Very rare, aggressive', proposed: 'Multi-agent chemo, immunotherapy trials',
    cadSolution: 'Trabectedin + Temozolomide + anti-IGF-1R', modality: 'Chemo + TKI', fdaPathway: 'Orphan + RPDD', indStatus: 'NCI MATCH arm' },
  { type: 'Epithelioid Sarcoma', incidence: 200, age: 'AYA', target: 'INI1 loss', gap: 'EZH2 inhibitor approved but limited', proposed: 'Tazemetostat, immunotherapy',
    cadSolution: 'Tazemetostat + Pembrolizumab + Doxorubicin', modality: 'EZH2i + IO', fdaPathway: 'Orphan (approved)', indStatus: 'Tazemetostat FDA approved' },
  { type: 'Alveolar Soft Part Sarcoma', incidence: 100, age: 'AYA', target: 'ASPL-TFE3 fusion', gap: 'Slow growing but metastatic', proposed: 'MET inhibitors, immunotherapy',
    cadSolution: 'Atezolizumab (IO) + Cediranib (VEGFR)', modality: 'IO + TKI', fdaPathway: 'Orphan Drug', indStatus: 'Phase II positive data' },
  { type: 'Clear Cell Sarcoma', incidence: 100, age: 'AYA', target: 'EWSR1-ATF1 fusion', gap: 'Melanoma-like but different', proposed: 'Immunotherapy, crizotinib in some',
    cadSolution: 'Pembrolizumab + Lenvatinib + MET inhibitor', modality: 'IO + TKI', fdaPathway: 'Orphan Drug', indStatus: 'NCI trials' },
  { type: 'PEComa', incidence: 200, age: 'Adult', target: 'TSC1/TSC2 loss', gap: 'mTOR inhibitors help some', proposed: 'Nab-sirolimus (approved 2021)',
    cadSolution: 'Nab-sirolimus (Fyarro)', modality: 'mTORi nanoparticle', fdaPathway: 'Full Approval', indStatus: 'FDA APPROVED 2021' },
  { type: 'Angiosarcoma', incidence: 300, age: 'Elderly', target: 'VEGF pathway', gap: 'Aggressive, chemo-resistant', proposed: 'Paclitaxel, pazopanib, immunotherapy',
    cadSolution: 'Paclitaxel + Pembrolizumab + Bevacizumab', modality: 'Chemo + IO + anti-VEGF', fdaPathway: 'Orphan Drug', indStatus: 'Phase II trials' },
  { type: 'Leiomyosarcoma', incidence: 1500, age: 'Adult', target: 'Complex', gap: 'No driver, heterogeneous', proposed: 'Trabectedin, eribulin, immunotherapy',
    cadSolution: 'Trabectedin + Doxorubicin + Olaratumab', modality: 'Chemo combo', fdaPathway: 'Accelerated Approval', indStatus: 'Standard 2nd line' },
];

// Emerging screening technologies
export const EmergingScreeningTech = [
  {
    name: 'Multi-Cancer Early Detection (MCED)',
    examples: ['Galleri (Grail)', 'CancerSEEK', 'PATHFINDER'],
    method: 'cfDNA methylation patterns',
    cancersDetected: 50,
    sensitivity: '51.5% overall, 90%+ for late stage',
    specificity: '99.5%',
    status: 'FDA Breakthrough, studies ongoing',
    cost: '$949',
    gap: 'Low sensitivity for early stage, signal of origin imperfect',
  },
  {
    name: 'Circulating Tumor DNA (ctDNA)',
    examples: ['Guardant360', 'FoundationOne Liquid CDx'],
    method: 'Tumor mutation detection in blood',
    cancersDetected: 'Any with mutations',
    sensitivity: '70-90% for advanced',
    specificity: '95%+',
    status: 'FDA approved for therapy selection',
    cost: '$3000-5000',
    gap: 'Poor for early stage, false negatives common',
  },
  {
    name: 'Circulating Tumor Cells (CTCs)',
    examples: ['CellSearch'],
    method: 'Intact tumor cells in blood',
    cancersDetected: 'Breast, Prostate, Colorectal',
    sensitivity: '30-70%',
    specificity: '95%+',
    status: 'FDA approved for prognosis',
    cost: '$500-1000',
    gap: 'Low sensitivity, cells rare in early cancer',
  },
  {
    name: 'Exosome/Extracellular Vesicle Analysis',
    examples: ['ExoDx Prostate', 'Exosome Diagnostics'],
    method: 'Tumor-derived vesicles with RNA/protein',
    cancersDetected: 'Prostate, Lung, Pancreas (research)',
    sensitivity: '70-80%',
    specificity: '85-90%',
    status: 'One FDA approved (prostate)',
    cost: '$500-2000',
    gap: 'Limited validation, complex isolation',
  },
  {
    name: 'Proteomics/Protein Biomarkers',
    examples: ['Olink', 'SomaLogic'],
    method: 'Multi-protein panels',
    cancersDetected: 'Multiple',
    sensitivity: 'Varies by cancer',
    specificity: 'Varies',
    status: 'Research/clinical trials',
    cost: '$500-3000',
    gap: 'No approved multi-cancer panel yet',
  },
  {
    name: 'Breath Analysis (Volatile Organic Compounds)',
    examples: ['Owlstone Medical', 'Breath Biopsy'],
    method: 'VOC patterns from metabolism',
    cancersDetected: 'Lung, Colorectal, others',
    sensitivity: '70-85%',
    specificity: '80-90%',
    status: 'Clinical trials',
    cost: '$100-500 (projected)',
    gap: 'Standardization needed, early research',
  },
  {
    name: 'AI-Enhanced Imaging',
    examples: ['Paige AI (pathology)', 'Lunit (radiology)'],
    method: 'Deep learning on CT/MRI/pathology',
    cancersDetected: 'Lung, Breast, Prostate, others',
    sensitivity: '90-95%',
    specificity: '85-95%',
    status: 'Multiple FDA approvals',
    cost: 'Integrated into imaging',
    gap: 'Requires imaging, not blood test',
  },
  {
    name: 'Methylation Arrays',
    examples: ['EPIC array', 'Methylation classifiers'],
    method: 'Genome-wide methylation',
    cancersDetected: 'Brain tumors, many others',
    sensitivity: '95%+ for classification',
    specificity: '95%+',
    status: 'Research/clinical use for CNS tumors',
    cost: '$500-1500',
    gap: 'Requires tissue, not screening',
  },
];

// Emerging curative technologies
export const EmergingCureTech = [
  {
    name: 'Bispecific T-cell Engagers (BiTEs)',
    target: 'CD3 x tumor antigen',
    examples: ['Blinatumomab (CD19)', 'Tarlatamab (DLL3)', 'Teclistamab (BCMA)'],
    cancers: ['ALL', 'SCLC', 'Myeloma'],
    advantage: 'Off-the-shelf, no manufacturing delay',
    gap: 'CRS risk, short half-life, solid tumor penetration',
  },
  {
    name: 'Antibody-Drug Conjugates (ADCs)',
    target: 'Surface antigen + cytotoxic payload',
    examples: ['Enhertu (HER2)', 'Trodelvy (TROP2)', 'Padcev (Nectin-4)', 'Elahere (FRα)'],
    cancers: ['Breast', 'Bladder', 'Ovarian', 'Lung'],
    advantage: 'Targeted chemo delivery, proven efficacy',
    gap: 'Still has toxicity, resistance develops',
  },
  {
    name: 'Allogeneic CAR-T',
    target: 'Various (CD19, BCMA, CD70)',
    examples: ['CTX110', 'UCART19', 'ALLO-501'],
    cancers: ['Blood cancers', 'Solid tumors (research)'],
    advantage: 'Off-the-shelf, no patient manufacturing',
    gap: 'GVHD risk, rejection, less persistence',
  },
  {
    name: 'CAR-NK Cells',
    target: 'Various',
    examples: ['FT516', 'FT596'],
    cancers: ['Blood cancers', 'Solid tumors'],
    advantage: 'Off-the-shelf, less CRS/neurotoxicity',
    gap: 'Less persistence than CAR-T',
  },
  {
    name: 'Tumor-Infiltrating Lymphocytes (TIL)',
    target: 'Patient tumor neoantigens',
    examples: ['Lifileucel (Amtagvi)'],
    cancers: ['Melanoma (approved)', 'NSCLC, cervical (trials)'],
    advantage: 'Polyclonal, targets multiple antigens',
    gap: 'Manufacturing complex, tumor access needed',
  },
  {
    name: 'TCR-T Cell Therapy',
    target: 'Intracellular antigens via HLA',
    examples: ['Afami-cel (MAGE-A4)', 'Tebentafusp (gp100)'],
    cancers: ['Synovial sarcoma', 'Uveal melanoma'],
    advantage: 'Can target intracellular proteins',
    gap: 'HLA-restricted, off-target toxicity',
  },
  {
    name: 'KRAS G12D Inhibitors',
    target: 'KRAS G12D mutation',
    examples: ['MRTX1133', 'RMC-9805'],
    cancers: ['Pancreatic (30%)', 'Colorectal (10%)'],
    advantage: 'Most common KRAS mutation',
    gap: 'Still in early trials, G12D harder than G12C',
  },
  {
    name: 'Degraders (PROTACs/Molecular Glues)',
    target: 'Undruggable proteins',
    examples: ['ARV-471 (ER)', 'CFT8634 (BRD9)', 'KT-474 (IRAK4)'],
    cancers: ['Breast', 'Synovial sarcoma', 'Various'],
    advantage: 'Degrades rather than inhibits',
    gap: 'Oral bioavailability, specificity',
  },
  {
    name: 'Radioligand Therapy',
    target: 'Surface receptors + radiation',
    examples: ['Pluvicto (PSMA)', 'Lutathera (SSTR)'],
    cancers: ['Prostate (approved)', 'NETs (approved)', 'Others (trials)'],
    advantage: 'Targeted radiation delivery',
    gap: 'Limited targets, radiation exposure',
  },
  {
    name: 'In Situ Vaccination/Oncolytic Virus',
    target: 'Tumor microenvironment',
    examples: ['T-VEC', 'RP1', 'CAN-2409'],
    cancers: ['Melanoma', 'Solid tumors'],
    advantage: 'Converts cold tumors to hot',
    gap: 'Intratumoral injection needed, systemic delivery hard',
  },
];

/**
 * Generate comprehensive gap analysis
 */
async function analyzeGaps(params: { apiKey?: string }): Promise<string> {
  const output: string[] = [];
  output.push('# COMPREHENSIVE CANCER SCREENING & CURE GAP ANALYSIS\n');
  output.push(`Generated: ${new Date().toISOString()}\n`);

  // Section 1: No Screening
  output.push('## 1. CANCERS WITH NO APPROVED SCREENING TEST\n');
  output.push(`**${NoScreeningCancers.length} cancers have NO population screening**\n`);
  output.push('| Cancer | Annual Cases | 5-yr Survival | Gap |');
  output.push('|--------|--------------|---------------|-----|');
  for (const c of NoScreeningCancers) {
    output.push(`| ${c.type} | ${c.incidence.toLocaleString()} | ${c.survival5yr}% | ${c.reason} |`);
  }

  // Section 2: No Targeted Therapy
  output.push('\n## 2. CANCERS WITH NO EFFECTIVE TARGETED THERAPY\n');
  output.push(`**${NoTargetedTherapyCancers.length} cancers rely primarily on chemotherapy**\n`);
  output.push('| Cancer | Current Treatment | Gap | Research |');
  output.push('|--------|-------------------|-----|----------|');
  for (const c of NoTargetedTherapyCancers) {
    output.push(`| ${c.type} | ${c.currentTx} | ${c.gap} | ${c.research} |`);
  }

  // Section 3: Rare Cancers
  output.push('\n## 3. RARE CANCERS WITH MAJOR UNMET NEEDS\n');
  output.push(`**${RareCancersUnmetNeeds.length} rare cancers (<6/100,000) need solutions**\n`);
  output.push('| Cancer | Cases/yr | Age Group | Target | Gap | Proposed Solution |');
  output.push('|--------|----------|-----------|--------|-----|-------------------|');
  for (const c of RareCancersUnmetNeeds) {
    output.push(`| ${c.type} | ${c.incidence} | ${c.age} | ${c.target} | ${c.gap} | ${c.proposed} |`);
  }

  // Section 4: Emerging Screening
  output.push('\n## 4. EMERGING SCREENING TECHNOLOGIES\n');
  for (const t of EmergingScreeningTech) {
    output.push(`### ${t.name}`);
    output.push(`- **Examples:** ${t.examples.join(', ')}`);
    output.push(`- **Method:** ${t.method}`);
    output.push(`- **Sensitivity/Specificity:** ${t.sensitivity} / ${t.specificity}`);
    output.push(`- **Status:** ${t.status}`);
    output.push(`- **Gap:** ${t.gap}`);
    output.push('');
  }

  // Section 5: Emerging Cures
  output.push('\n## 5. EMERGING CURATIVE TECHNOLOGIES\n');
  for (const t of EmergingCureTech) {
    output.push(`### ${t.name}`);
    output.push(`- **Target:** ${t.target}`);
    output.push(`- **Examples:** ${t.examples.join(', ')}`);
    output.push(`- **Cancers:** ${t.cancers.join(', ')}`);
    output.push(`- **Advantage:** ${t.advantage}`);
    output.push(`- **Gap:** ${t.gap}`);
    output.push('');
  }

  return output.join('\n');
}

/**
 * Propose CAD solution for a specific gap
 */
async function proposeCADSolution(params: {
  cancerType: string;
  gapType: 'screening' | 'treatment' | 'both';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const cancer = params.cancerType.toLowerCase();

  // Search for latest research
  const searchResult = await client.search(
    `${params.cancerType} ${params.gapType === 'screening' ? 'early detection blood test liquid biopsy' : 'novel therapy target CAR-T ADC'} breakthrough 2024 2025`,
    { searchDepth: 'advanced', maxResults: 8 }
  );

  const output: string[] = [];
  output.push(`# CAD SOLUTION PROPOSAL: ${params.cancerType.toUpperCase()}\n`);
  output.push(`## Gap Type: ${params.gapType === 'screening' ? 'No Screening Test' : params.gapType === 'treatment' ? 'No Targeted Therapy' : 'Both'}\n`);

  // Find relevant data
  const noScreen = NoScreeningCancers.find(c => c.type.toLowerCase().includes(cancer));
  const noTx = NoTargetedTherapyCancers.find(c => c.type.toLowerCase().includes(cancer));
  const rare = RareCancersUnmetNeeds.find(c => c.type.toLowerCase().includes(cancer));

  if (noScreen || params.gapType === 'screening' || params.gapType === 'both') {
    output.push('## SCREENING SOLUTION\n');
    output.push('### Current Problem');
    if (noScreen) {
      output.push(`- 5-year survival: ${noScreen.survival5yr}%`);
      output.push(`- Annual cases: ${noScreen.incidence.toLocaleString()}`);
      output.push(`- Gap: ${noScreen.reason}`);
    }

    output.push('\n### Proposed Solution: Multi-Analyte Blood Test');
    output.push('```');
    output.push('┌─────────────────────────────────────────────────────────────┐');
    output.push('│  PROPOSED SCREENING PANEL                                   │');
    output.push('├─────────────────────────────────────────────────────────────┤');
    output.push('│  1. cfDNA methylation patterns (tissue of origin)          │');
    output.push('│  2. Circulating tumor DNA mutations                        │');
    output.push('│  3. Protein biomarker panel (cancer-specific)              │');
    output.push('│  4. Exosome RNA signatures                                 │');
    output.push('│  5. Immune signature (inflammatory markers)                │');
    output.push('└─────────────────────────────────────────────────────────────┘');
    output.push('```');

    output.push('\n### Development Plan');
    output.push('1. **Discovery Phase:** Identify cancer-specific methylation/mutation/protein signatures');
    output.push('2. **Validation Phase:** Test in retrospective cohorts (n=1000+)');
    output.push('3. **Clinical Trial:** Prospective screening trial (n=10,000+)');
    output.push('4. **FDA Submission:** Breakthrough Device Designation');
  }

  if (noTx || rare || params.gapType === 'treatment' || params.gapType === 'both') {
    output.push('\n## TREATMENT SOLUTION\n');
    output.push('### Current Problem');
    if (noTx) {
      output.push(`- Current treatment: ${noTx.currentTx}`);
      output.push(`- Gap: ${noTx.gap}`);
      output.push(`- Research: ${noTx.research}`);
    }
    if (rare) {
      output.push(`- Incidence: ${rare.incidence} cases/year`);
      output.push(`- Target: ${rare.target}`);
      output.push(`- Gap: ${rare.gap}`);
    }

    output.push('\n### Proposed Solutions');
    output.push('');
    output.push('#### Option 1: CAR-T/TCR-T Cell Therapy');
    output.push('```');
    output.push('Target Selection:');
    output.push('  1. Surface antigens (MSLN, GD2, HER2, EGFR)');
    output.push('  2. Tumor-associated antigens (NY-ESO-1, MAGE-A4)');
    output.push('  3. Neoantigens (personalized)');
    output.push('');
    output.push('CAR Design: 4th generation with:');
    output.push('  - Dual costimulation (CD28 + 4-1BB)');
    output.push('  - Armored with IL-15/IL-21');
    output.push('  - PD-1 knockout (CRISPR)');
    output.push('  - Safety switch (iCasp9)');
    output.push('```');

    output.push('\n#### Option 2: mRNA Vaccine + Checkpoint Inhibitor');
    output.push('```');
    output.push('Vaccine Design:');
    output.push('  - WES/RNAseq of tumor');
    output.push('  - Identify 20-34 neoantigens');
    output.push('  - LNP-encapsulated mRNA');
    output.push('  - Combine with anti-PD-1');
    output.push('```');

    output.push('\n#### Option 3: ADC or Bispecific Antibody');
    output.push('```');
    output.push('ADC Design:');
    output.push('  - Target: Overexpressed surface protein');
    output.push('  - Payload: Topoisomerase I inhibitor or MMAE');
    output.push('  - Linker: Cleavable (tumor-specific)');
    output.push('  - DAR: 4-8');
    output.push('```');
  }

  output.push('\n## LATEST RESEARCH\n');
  if (searchResult.answer) {
    output.push(searchResult.answer);
  }

  output.push('\n## SOURCES');
  for (const r of searchResult.results.slice(0, 5)) {
    output.push(`- ${r.title}: ${r.url}`);
  }

  return output.join('\n');
}

/**
 * Search for emerging solutions to gaps
 */
async function searchEmergingSolutions(params: {
  gapType: 'screening' | 'rare_cancer' | 'undruggable_target' | 'resistance';
  specificQuery?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);

  const queries: Record<string, string> = {
    screening: 'multi-cancer early detection blood test liquid biopsy MCED Galleri sensitivity 2024 2025',
    rare_cancer: 'rare pediatric cancer sarcoma neuroblastoma DIPG orphan drug breakthrough therapy 2024 2025',
    undruggable_target: 'undruggable target KRAS MYC transcription factor degrader PROTAC molecular glue 2024 2025',
    resistance: 'cancer drug resistance mechanism overcome acquired mutation combination therapy 2024 2025',
  };

  const query = params.specificQuery || queries[params.gapType];
  const searchResult = await client.search(query, { searchDepth: 'advanced', maxResults: 10 });

  const output: string[] = [];
  output.push(`# EMERGING SOLUTIONS: ${params.gapType.toUpperCase().replace('_', ' ')}\n`);
  output.push(`Query: ${query}\n`);

  if (searchResult.answer) {
    output.push('## AI SUMMARY\n');
    output.push(searchResult.answer);
  }

  output.push('\n## DETAILED FINDINGS\n');
  for (const r of searchResult.results.slice(0, 8)) {
    output.push(`### ${r.title}`);
    output.push(`URL: ${r.url}`);
    output.push(`Relevance: ${(r.score * 100).toFixed(0)}%`);
    output.push(`\n${r.content.slice(0, 500)}...\n`);
    output.push('---\n');
  }

  return output.join('\n');
}

/**
 * Get statistics on unmet needs
 */
function getUnmetNeedStats(): string {
  const totalNoScreening = NoScreeningCancers.reduce((sum, c) => sum + c.incidence, 0);
  const totalRare = RareCancersUnmetNeeds.reduce((sum, c) => sum + c.incidence, 0);

  const output: string[] = [];
  output.push('# CANCER UNMET NEEDS STATISTICS\n');

  output.push('## Summary');
  output.push(`- **${NoScreeningCancers.length} cancers** have no approved screening test`);
  output.push(`- **${NoTargetedTherapyCancers.length} cancers** have no effective targeted therapy (chemo only)`);
  output.push(`- **${RareCancersUnmetNeeds.length} rare cancers** have major unmet treatment needs`);
  output.push(`- **${EmergingScreeningTech.length} screening technologies** in development`);
  output.push(`- **${EmergingCureTech.length} curative technologies** emerging`);
  output.push('');
  output.push('## Impact');
  output.push(`- ~${totalNoScreening.toLocaleString()} patients/year diagnosed with unscreenable cancers`);
  output.push(`- ~${totalRare.toLocaleString()} patients/year with rare cancers lacking treatments`);
  output.push('');
  output.push('## Highest Priority Gaps');
  output.push('1. **Pancreatic Cancer**: 12% survival, no screening, KRAS undruggable');
  output.push('2. **Glioblastoma**: 7% survival, no screening, BBB limits treatment');
  output.push('3. **Small Cell Lung Cancer**: 7% survival, no targeted therapy, rapid relapse');
  output.push('4. **DIPG**: 0% survival, pediatric, inoperable location');
  output.push('5. **Cholangiocarcinoma**: 10% survival, rare, limited targets');

  return output.join('\n');
}

/**
 * Create gap analysis tools
 */
export function createGapAnalysisTools(apiKey?: string): ToolDefinition[] {
  if (apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }

  return [
    {
      name: 'AnalyzeAllGaps',
      description: 'Generate comprehensive gap analysis of all cancers lacking screening or effective treatment.',
      parameters: { type: 'object', properties: {} },
      handler: async (params) => analyzeGaps(params as Parameters<typeof analyzeGaps>[0]),
    },
    {
      name: 'ProposeCADSolution',
      description: 'Propose CAD-designed screening test or treatment for a specific cancer gap.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type with unmet need' },
          gapType: { type: 'string', enum: ['screening', 'treatment', 'both'], description: 'Type of gap to address' },
        },
        required: ['cancerType', 'gapType'],
      },
      handler: async (params) => proposeCADSolution(params as Parameters<typeof proposeCADSolution>[0]),
    },
    {
      name: 'SearchEmergingSolutions',
      description: 'Search for emerging technologies addressing specific cancer gaps.',
      parameters: {
        type: 'object',
        properties: {
          gapType: { type: 'string', enum: ['screening', 'rare_cancer', 'undruggable_target', 'resistance'], description: 'Gap category' },
          specificQuery: { type: 'string', description: 'Optional specific search query' },
        },
        required: ['gapType'],
      },
      handler: async (params) => searchEmergingSolutions(params as Parameters<typeof searchEmergingSolutions>[0]),
    },
    {
      name: 'GetUnmetNeedStats',
      description: 'Get statistics on cancers with unmet screening and treatment needs.',
      parameters: { type: 'object', properties: {} },
      handler: async () => getUnmetNeedStats(),
    },
    {
      name: 'ListNoScreeningCancers',
      description: 'List all cancers that have no approved population screening test.',
      parameters: { type: 'object', properties: {} },
      handler: async () => {
        const output: string[] = [];
        output.push('# Cancers With No Approved Screening Test\n');
        output.push('| Cancer | Cases/yr | Survival | Reason |');
        output.push('|--------|----------|----------|--------|');
        for (const c of NoScreeningCancers) {
          output.push(`| ${c.type} | ${c.incidence.toLocaleString()} | ${c.survival5yr}% | ${c.reason} |`);
        }
        return output.join('\n');
      },
    },
    {
      name: 'ListRareCancers',
      description: 'List rare cancers with major unmet treatment needs and proposed solutions.',
      parameters: { type: 'object', properties: {} },
      handler: async () => {
        const output: string[] = [];
        output.push('# Rare Cancers With Unmet Treatment Needs\n');
        for (const c of RareCancersUnmetNeeds) {
          output.push(`## ${c.type}`);
          output.push(`- **Incidence:** ${c.incidence} cases/year`);
          output.push(`- **Age Group:** ${c.age}`);
          output.push(`- **Target:** ${c.target}`);
          output.push(`- **Gap:** ${c.gap}`);
          output.push(`- **Proposed Solution:** ${c.proposed}`);
          output.push('');
        }
        return output.join('\n');
      },
    },
    {
      name: 'ListEmergingTech',
      description: 'List all emerging screening and curative technologies in development.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['screening', 'treatment', 'both'], description: 'Technology category' },
        },
      },
      handler: async (params: { category?: string }) => {
        const output: string[] = [];
        const category = params?.category || 'both';

        if (category === 'screening' || category === 'both') {
          output.push('# Emerging Screening Technologies\n');
          for (const t of EmergingScreeningTech) {
            output.push(`## ${t.name}`);
            output.push(`- Examples: ${t.examples.join(', ')}`);
            output.push(`- Sensitivity: ${t.sensitivity}`);
            output.push(`- Status: ${t.status}`);
            output.push(`- Gap: ${t.gap}`);
            output.push('');
          }
        }

        if (category === 'treatment' || category === 'both') {
          output.push('# Emerging Curative Technologies\n');
          for (const t of EmergingCureTech) {
            output.push(`## ${t.name}`);
            output.push(`- Examples: ${t.examples.join(', ')}`);
            output.push(`- Cancers: ${t.cancers.join(', ')}`);
            output.push(`- Advantage: ${t.advantage}`);
            output.push(`- Gap: ${t.gap}`);
            output.push('');
          }
        }

        return output.join('\n');
      },
    },
  ];
}

export function setGapAnalysisToolsApiKey(apiKey: string): void {
  tavilyClient = createTavilyClient(apiKey);
}
