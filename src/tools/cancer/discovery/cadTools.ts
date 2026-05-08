/**
 * Computational-Aided Drug Discovery (CAD) Tools
 *
 * AI-powered discovery of novel curative therapies for cancers
 * without FDA-approved options. Generates FDA submission proposals.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createTavilyClient, type TavilyClient } from '../../../datasources/research/tavilyClient.js';

let tavilyClient: TavilyClient | null = null;

function getClient(apiKey?: string): TavilyClient {
  if (!tavilyClient && apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }
  if (!tavilyClient) {
    throw new Error('Tavily API key required for CAD tools');
  }
  return tavilyClient;
}

/**
 * Cancers without FDA-approved curative biotech
 */
const UNMET_NEED_CANCERS = [
  { type: 'Pancreatic Cancer', survival5yr: 12, currentTx: 'FOLFIRINOX, Gemcitabine', unmetNeed: 'Very High' },
  { type: 'Glioblastoma', survival5yr: 7, currentTx: 'TMZ + Radiation', unmetNeed: 'Very High' },
  { type: 'Triple-Negative Breast Cancer', survival5yr: 77, currentTx: 'Chemo + Immunotherapy', unmetNeed: 'High' },
  { type: 'Small Cell Lung Cancer', survival5yr: 7, currentTx: 'Chemo + Immunotherapy', unmetNeed: 'Very High' },
  { type: 'Ovarian Cancer', survival5yr: 50, currentTx: 'Surgery + Chemo', unmetNeed: 'High' },
  { type: 'Hepatocellular Carcinoma', survival5yr: 21, currentTx: 'Sorafenib, Immunotherapy', unmetNeed: 'High' },
  { type: 'Cholangiocarcinoma', survival5yr: 10, currentTx: 'Gemcitabine + Cisplatin', unmetNeed: 'Very High' },
  { type: 'Mesothelioma', survival5yr: 12, currentTx: 'Chemo + Immunotherapy', unmetNeed: 'Very High' },
  { type: 'Esophageal Cancer', survival5yr: 22, currentTx: 'Chemo + Surgery', unmetNeed: 'High' },
  { type: 'Gastric Cancer', survival5yr: 36, currentTx: 'Chemo + HER2 targeted', unmetNeed: 'High' },
];

/**
 * Known druggable targets by cancer type
 */
const CANCER_TARGETS: Record<string, { gene: string; protein: string; expression: string; rationale: string }[]> = {
  'pancreatic': [
    { gene: 'KRAS', protein: 'KRAS G12D/G12V/G12C', expression: '95% mutated', rationale: 'Driver oncogene, now druggable with G12C/G12D inhibitors' },
    { gene: 'MSLN', protein: 'Mesothelin', expression: '80-90% overexpressed', rationale: 'Surface antigen, CAR-T target in trials' },
    { gene: 'CEACAM5', protein: 'CEA', expression: '90% overexpressed', rationale: 'Surface antigen, ADC and CAR-T target' },
    { gene: 'MUC1', protein: 'Mucin 1', expression: '90% overexpressed', rationale: 'Tumor-associated antigen, vaccine target' },
    { gene: 'HER2', protein: 'ERBB2', expression: '20-30% overexpressed', rationale: 'Established target, ADC approved' },
    { gene: 'CLDN18.2', protein: 'Claudin 18.2', expression: '60% overexpressed', rationale: 'Tight junction protein, CAR-T and ADC target' },
  ],
  'glioblastoma': [
    { gene: 'EGFR', protein: 'EGFRvIII', expression: '30% mutated', rationale: 'Tumor-specific variant, CAR-T target' },
    { gene: 'IL13RA2', protein: 'IL-13 receptor α2', expression: '75% overexpressed', rationale: 'CAR-T target with clinical responses' },
    { gene: 'GD2', protein: 'Disialoganglioside', expression: '80% expressed', rationale: 'Surface glycolipid, CAR-T target' },
    { gene: 'HER2', protein: 'ERBB2', expression: '80% overexpressed', rationale: 'CAR-T target in trials' },
    { gene: 'EphA2', protein: 'Ephrin receptor A2', expression: '90% overexpressed', rationale: 'Receptor tyrosine kinase, CAR-T target' },
    { gene: 'CD133', protein: 'Prominin-1', expression: 'Stem cells', rationale: 'Cancer stem cell marker' },
  ],
  'triple-negative breast': [
    { gene: 'TROP2', protein: 'Trophoblast antigen 2', expression: '90% overexpressed', rationale: 'ADC target (Trodelvy approved)' },
    { gene: 'ROR1', protein: 'Receptor tyrosine kinase-like', expression: '60% overexpressed', rationale: 'CAR-T target in trials' },
    { gene: 'MUC1', protein: 'Mucin 1', expression: '90% overexpressed', rationale: 'CAR-T and vaccine target' },
    { gene: 'EGFR', protein: 'EGF Receptor', expression: '60% overexpressed', rationale: 'Established target' },
    { gene: 'Neoantigens', protein: 'Patient-specific', expression: 'Variable', rationale: 'mRNA vaccine target' },
  ],
  'small cell lung': [
    { gene: 'DLL3', protein: 'Delta-like ligand 3', expression: '80% overexpressed', rationale: 'ADC and T-cell engager target' },
    { gene: 'CD56', protein: 'NCAM', expression: '90% expressed', rationale: 'Neuroendocrine marker, ADC target' },
    { gene: 'ASCL1', protein: 'Achaete-scute homolog 1', expression: '70% expressed', rationale: 'Lineage transcription factor' },
    { gene: 'SLFN11', protein: 'Schlafen 11', expression: '50% expressed', rationale: 'Predicts chemo sensitivity' },
  ],
};

/**
 * Identify novel therapeutic targets for a cancer
 */
async function identifyTargets(params: {
  cancerType: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const cancer = params.cancerType.toLowerCase();

  // Find matching targets
  let targets: typeof CANCER_TARGETS['pancreatic'] = [];
  for (const [key, value] of Object.entries(CANCER_TARGETS)) {
    if (cancer.includes(key)) {
      targets = value;
      break;
    }
  }

  // Search for emerging targets
  const searchResult = await client.search(
    `${params.cancerType} novel therapeutic target druggable surface antigen CAR-T 2024 2025`,
    { searchDepth: 'advanced', maxResults: 5 }
  );

  const output: string[] = [];
  output.push(`# Therapeutic Target Analysis: ${params.cancerType}\n`);

  if (targets.length > 0) {
    output.push('## Known Druggable Targets\n');
    output.push('| Gene | Protein | Expression | Rationale |');
    output.push('|------|---------|------------|-----------|');
    for (const t of targets) {
      output.push(`| ${t.gene} | ${t.protein} | ${t.expression} | ${t.rationale} |`);
    }
  }

  output.push('\n## Emerging Targets from Literature\n');
  if (searchResult.answer) {
    output.push(searchResult.answer);
  }

  output.push('\n## Recommended Curative Approaches\n');
  if (targets.length > 0) {
    const surfaceTargets = targets.filter(t =>
      t.rationale.toLowerCase().includes('car-t') ||
      t.rationale.toLowerCase().includes('surface')
    );
    if (surfaceTargets.length > 0) {
      output.push('### CAR-T Therapy Candidates');
      for (const t of surfaceTargets) {
        output.push(`- **${t.gene}** (${t.protein}): ${t.expression}`);
      }
    }

    const vaccineTargets = targets.filter(t =>
      t.rationale.toLowerCase().includes('vaccine') ||
      t.rationale.toLowerCase().includes('neoantigen')
    );
    if (vaccineTargets.length > 0) {
      output.push('\n### mRNA Vaccine Candidates');
      for (const t of vaccineTargets) {
        output.push(`- **${t.gene}** (${t.protein}): ${t.expression}`);
      }
    }
  }

  return output.join('\n');
}

/**
 * Design a novel CAR-T therapy
 */
function designCARTTherapy(params: {
  cancerType: string;
  targetAntigen: string;
  generation?: '2nd' | '3rd' | '4th' | 'armored';
}): string {
  const generation = params.generation || '2nd';

  const designs: Record<string, { costim: string; features: string[]; safety: string[] }> = {
    '2nd': {
      costim: 'CD28 or 4-1BB',
      features: ['Single costimulatory domain', 'Proven clinical efficacy'],
      safety: ['Standard CRS risk', 'Neurotoxicity possible'],
    },
    '3rd': {
      costim: 'CD28 + 4-1BB',
      features: ['Dual costimulatory domains', 'Enhanced persistence'],
      safety: ['Higher activation risk', 'Need careful monitoring'],
    },
    '4th': {
      costim: 'CD28 + 4-1BB + IL-12/IL-15 secretion',
      features: ['Armored CAR', 'Cytokine secretion', 'TME modulation'],
      safety: ['Cytokine storm risk', 'Requires safety switch'],
    },
    'armored': {
      costim: 'CD28 + 4-1BB + checkpoint knockout',
      features: ['PD-1 knockout', 'Dominant negative TGF-β', 'Enhanced tumor infiltration'],
      safety: ['Requires CRISPR editing', 'Long-term safety TBD'],
    },
  };

  const design = designs[generation];

  const output: string[] = [];
  output.push(`# CAR-T Design: Anti-${params.targetAntigen} for ${params.cancerType}\n`);

  output.push('## Construct Design\n');
  output.push('```');
  output.push(`┌─────────────────────────────────────────────────────────────┐`);
  output.push(`│  Signal     scFv           Hinge    TM     Costim    CD3ζ  │`);
  output.push(`│  Peptide   (Anti-${params.targetAntigen.padEnd(6)})   CD8α    CD8α   ${design.costim.padEnd(10)} Act   │`);
  output.push(`└─────────────────────────────────────────────────────────────┘`);
  output.push('```\n');

  output.push('## Specifications\n');
  output.push(`- **Target Antigen:** ${params.targetAntigen}`);
  output.push(`- **Cancer Type:** ${params.cancerType}`);
  output.push(`- **Generation:** ${generation}`);
  output.push(`- **Costimulatory Domain:** ${design.costim}`);
  output.push(`- **Vector:** Lentiviral (self-inactivating)`);
  output.push(`- **Cell Source:** Autologous T cells`);

  output.push('\n## Features');
  for (const f of design.features) {
    output.push(`- ${f}`);
  }

  output.push('\n## Safety Considerations');
  for (const s of design.safety) {
    output.push(`- ${s}`);
  }

  output.push('\n## Manufacturing Process');
  output.push('1. Leukapheresis (Day 0)');
  output.push('2. T cell isolation and activation (Day 1-2)');
  output.push('3. Lentiviral transduction (Day 2-3)');
  output.push('4. Expansion (Day 3-10)');
  output.push('5. Quality control (Day 10-12)');
  output.push('6. Cryopreservation and release (Day 12-14)');

  output.push('\n## Preclinical Requirements');
  output.push('- In vitro cytotoxicity assays');
  output.push('- Xenograft mouse models');
  output.push('- Biodistribution studies');
  output.push('- Off-tumor/on-target toxicity assessment');

  return output.join('\n');
}

/**
 * Design a personalized mRNA vaccine
 */
function designmRNAVaccine(params: {
  cancerType: string;
  neoantigenCount?: number;
  deliverySystem?: 'LNP' | 'lipoplex' | 'protamine';
}): string {
  const neoantigenCount = params.neoantigenCount || 20;
  const deliverySystem = params.deliverySystem || 'LNP';

  const output: string[] = [];
  output.push(`# Personalized mRNA Cancer Vaccine: ${params.cancerType}\n`);

  output.push('## Vaccine Design\n');
  output.push('```');
  output.push(`┌────────────────────────────────────────────────────────────────┐`);
  output.push(`│  5' Cap ─ 5' UTR ─ [Neoantigen 1-${neoantigenCount}] ─ 3' UTR ─ Poly(A)  │`);
  output.push(`│                                                                │`);
  output.push(`│  Encapsulated in: ${deliverySystem} (Lipid Nanoparticle)              │`);
  output.push(`└────────────────────────────────────────────────────────────────┘`);
  output.push('```\n');

  output.push('## Neoantigen Selection Pipeline\n');
  output.push('1. **Tumor Sequencing**');
  output.push('   - Whole exome sequencing (WES)');
  output.push('   - RNA sequencing for expression validation');
  output.push('   - HLA typing (Class I and II)');
  output.push('');
  output.push('2. **Neoantigen Prediction**');
  output.push('   - Somatic mutation calling');
  output.push('   - HLA binding prediction (NetMHCpan)');
  output.push('   - Expression filtering (TPM > 1)');
  output.push('   - Clonality assessment');
  output.push('');
  output.push('3. **Ranking Criteria**');
  output.push('   - HLA binding affinity < 500 nM');
  output.push('   - Expression level > 10 TPM');
  output.push('   - Clonal mutations prioritized');
  output.push('   - Driver mutations included');

  output.push('\n## Specifications\n');
  output.push(`- **Cancer Type:** ${params.cancerType}`);
  output.push(`- **Neoantigens:** Up to ${neoantigenCount} patient-specific`);
  output.push(`- **mRNA Modifications:** N1-methylpseudouridine`);
  output.push(`- **Delivery:** ${deliverySystem}`);
  output.push('- **Route:** Intramuscular');
  output.push('- **Combination:** Checkpoint inhibitor (anti-PD-1)');

  output.push('\n## Dosing Schedule');
  output.push('- **Priming:** Weekly x 4 doses');
  output.push('- **Boosting:** Biweekly x 5 doses');
  output.push('- **Maintenance:** Monthly');

  output.push('\n## Monitoring');
  output.push('- Neoantigen-specific T cell responses (ELISpot)');
  output.push('- ctDNA for molecular response');
  output.push('- Imaging (RECIST 1.1)');

  return output.join('\n');
}

/**
 * Generate FDA IND submission proposal
 */
async function generateFDAProposal(params: {
  therapyType: 'CAR-T' | 'mRNA_vaccine' | 'CRISPR' | 'oncolytic_virus';
  cancerType: string;
  targetAntigen: string;
  preclinicalData?: {
    efficacy: string;
    safety: string;
    mechanism: string;
  };
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);

  // Search for regulatory precedents
  const searchResult = await client.search(
    `FDA IND ${params.therapyType} ${params.cancerType} approval requirements 2024`,
    { searchDepth: 'advanced', maxResults: 5 }
  );

  const output: string[] = [];
  output.push('# FDA IND Application Proposal\n');
  output.push(`## Investigational New Drug: Anti-${params.targetAntigen} ${params.therapyType}`);
  output.push(`## Indication: ${params.cancerType}\n`);

  output.push('---\n');

  output.push('## 1. EXECUTIVE SUMMARY\n');
  output.push(`This IND application proposes a novel ${params.therapyType.replace(/_/g, ' ')} targeting ${params.targetAntigen} for the treatment of ${params.cancerType}. Based on preclinical evidence demonstrating efficacy and acceptable safety, we request authorization to initiate Phase 1 clinical trials.\n`);

  output.push('## 2. INTRODUCTION AND RATIONALE\n');
  output.push(`### 2.1 Unmet Medical Need`);
  const unmet = UNMET_NEED_CANCERS.find(c =>
    params.cancerType.toLowerCase().includes(c.type.toLowerCase().split(' ')[0])
  );
  if (unmet) {
    output.push(`- 5-year survival rate: ${unmet.survival5yr}%`);
    output.push(`- Current standard of care: ${unmet.currentTx}`);
    output.push(`- Unmet need level: ${unmet.unmetNeed}`);
  }

  output.push(`\n### 2.2 Scientific Rationale`);
  output.push(`${params.targetAntigen} is expressed in the majority of ${params.cancerType} tumors and represents a validated therapeutic target. ${params.therapyType.replace(/_/g, ' ')} approaches have demonstrated proof-of-concept in similar indications.\n`);

  output.push('## 3. PRECLINICAL STUDIES\n');
  if (params.preclinicalData) {
    output.push(`### 3.1 Efficacy`);
    output.push(params.preclinicalData.efficacy);
    output.push(`\n### 3.2 Safety`);
    output.push(params.preclinicalData.safety);
    output.push(`\n### 3.3 Mechanism of Action`);
    output.push(params.preclinicalData.mechanism);
  } else {
    output.push('### 3.1 Required Studies');
    output.push('- In vitro cytotoxicity (required)');
    output.push('- In vivo xenograft models (required)');
    output.push('- Biodistribution (required)');
    output.push('- GLP toxicology (required)');
    output.push('- Off-target binding assessment (required)');
  }

  output.push('\n## 4. CHEMISTRY, MANUFACTURING, AND CONTROLS (CMC)\n');
  if (params.therapyType === 'CAR-T') {
    output.push('### 4.1 Manufacturing Process');
    output.push('- Leukapheresis collection');
    output.push('- T cell isolation (CliniMACS)');
    output.push('- Activation (anti-CD3/CD28 beads)');
    output.push('- Lentiviral transduction');
    output.push('- Expansion (G-Rex or WAVE)');
    output.push('- Formulation and cryopreservation');
    output.push('\n### 4.2 Quality Control');
    output.push('- Sterility testing');
    output.push('- Endotoxin (< 5 EU/kg)');
    output.push('- Mycoplasma (negative)');
    output.push('- CAR expression (> 20%)');
    output.push('- Cell viability (> 70%)');
    output.push('- Vector copy number (< 5 copies/cell)');
    output.push('- RCL testing (negative)');
  } else if (params.therapyType === 'mRNA_vaccine') {
    output.push('### 4.1 Manufacturing Process');
    output.push('- In vitro transcription');
    output.push('- Purification (HPLC)');
    output.push('- LNP encapsulation');
    output.push('- Sterile filtration');
    output.push('\n### 4.2 Quality Control');
    output.push('- mRNA integrity (> 80%)');
    output.push('- Encapsulation efficiency (> 90%)');
    output.push('- Particle size (80-100 nm)');
    output.push('- Endotoxin (< 10 EU/mL)');
  }

  output.push('\n## 5. CLINICAL PROTOCOL SYNOPSIS\n');
  output.push('### 5.1 Study Design');
  output.push('- Phase 1, open-label, dose-escalation');
  output.push('- 3+3 design');
  output.push('- Primary endpoint: Safety (DLTs)');
  output.push('- Secondary endpoints: ORR, PFS, DOR');
  output.push('\n### 5.2 Eligibility Criteria');
  output.push(`- Histologically confirmed ${params.cancerType}`);
  output.push('- Relapsed/refractory after ≥2 prior lines');
  output.push('- ECOG PS 0-1');
  output.push('- Adequate organ function');
  output.push(`- ${params.targetAntigen} expression confirmed`);

  output.push('\n## 6. REGULATORY CONSIDERATIONS\n');
  if (searchResult.answer) {
    output.push(searchResult.answer);
  }
  output.push('\n### 6.1 Regulatory Pathway');
  output.push('- Breakthrough Therapy Designation (if applicable)');
  output.push('- Regenerative Medicine Advanced Therapy (RMAT) for cell therapies');
  output.push('- Fast Track Designation');
  output.push('- Accelerated Approval pathway');

  output.push('\n## 7. APPENDICES\n');
  output.push('- Appendix A: Investigator Brochure');
  output.push('- Appendix B: Clinical Protocol');
  output.push('- Appendix C: CMC Documentation');
  output.push('- Appendix D: Preclinical Study Reports');
  output.push('- Appendix E: FDA Form 1571');

  output.push('\n---');
  output.push('\n*This proposal was generated by the Cancer Core Agentic Framework CAD Module.*');
  output.push('*All submissions require review by regulatory affairs professionals.*');

  return output.join('\n');
}

/**
 * Create CAD tools
 */
export function createCADTools(apiKey?: string): ToolDefinition[] {
  if (apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }

  return [
    {
      name: 'IdentifyTherapeuticTargets',
      description: 'Identify novel therapeutic targets for cancers without FDA-approved curative options. Combines known targets with real-time literature search.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type to analyze' },
        },
        required: ['cancerType'],
      },
      handler: async (params) => identifyTargets(params as Parameters<typeof identifyTargets>[0]),
    },
    {
      name: 'DesignCARTTherapy',
      description: 'Design a novel CAR-T cell therapy construct for a specific cancer target. Generates full construct specifications.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type' },
          targetAntigen: { type: 'string', description: 'Target surface antigen (e.g., MSLN, EGFR, HER2)' },
          generation: { type: 'string', enum: ['2nd', '3rd', '4th', 'armored'], description: 'CAR generation' },
        },
        required: ['cancerType', 'targetAntigen'],
      },
      handler: async (params) => designCARTTherapy(params as Parameters<typeof designCARTTherapy>[0]),
    },
    {
      name: 'DesignmRNAVaccine',
      description: 'Design a personalized mRNA cancer vaccine for a specific cancer type. Includes neoantigen selection pipeline.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type' },
          neoantigenCount: { type: 'number', description: 'Number of neoantigens to include (default 20)' },
          deliverySystem: { type: 'string', enum: ['LNP', 'lipoplex', 'protamine'], description: 'Delivery system' },
        },
        required: ['cancerType'],
      },
      handler: async (params) => designmRNAVaccine(params as Parameters<typeof designmRNAVaccine>[0]),
    },
    {
      name: 'GenerateFDAProposal',
      description: 'Generate an FDA IND application proposal for a novel curative therapy. Includes regulatory pathway guidance.',
      parameters: {
        type: 'object',
        properties: {
          therapyType: { type: 'string', enum: ['CAR-T', 'mRNA_vaccine', 'CRISPR', 'oncolytic_virus'] },
          cancerType: { type: 'string', description: 'Cancer indication' },
          targetAntigen: { type: 'string', description: 'Target antigen/molecule' },
          preclinicalData: {
            type: 'object',
            properties: {
              efficacy: { type: 'string' },
              safety: { type: 'string' },
              mechanism: { type: 'string' },
            },
          },
        },
        required: ['therapyType', 'cancerType', 'targetAntigen'],
      },
      handler: async (params) => generateFDAProposal(params as Parameters<typeof generateFDAProposal>[0]),
    },
    {
      name: 'ListUnmetNeedCancers',
      description: 'List cancers with highest unmet need for curative therapies (no FDA-approved curative biotech).',
      parameters: { type: 'object', properties: {} },
      handler: async () => {
        const output: string[] = [];
        output.push('# Cancers with Highest Unmet Need for Curative Therapies\n');
        output.push('| Cancer Type | 5-Year Survival | Current Treatment | Unmet Need |');
        output.push('|-------------|-----------------|-------------------|------------|');
        for (const c of UNMET_NEED_CANCERS) {
          output.push(`| ${c.type} | ${c.survival5yr}% | ${c.currentTx} | ${c.unmetNeed} |`);
        }
        output.push('\n*These cancers lack FDA-approved curative biotechnologies (CAR-T, mRNA vaccines, etc.)*');
        return output.join('\n');
      },
    },
  ];
}

export function setCADToolsApiKey(apiKey: string): void {
  tavilyClient = createTavilyClient(apiKey);
}
