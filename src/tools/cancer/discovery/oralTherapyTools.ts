/**
 * Oral Targeted Therapy Tools
 *
 * Pills that replace chemotherapy - FDA approved and emerging
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
 * FDA-Approved Oral Targeted Therapies (Pills) That Replace Chemo
 */
export const OralTargetedTherapies = [
  // KRAS Inhibitors - Revolutionary
  {
    name: 'Sotorasib',
    brand: 'Lumakras',
    target: 'KRAS G12C',
    cancers: ['NSCLC', 'Colorectal'],
    approval: '2021-05',
    dosing: '960mg once daily',
    responseRate: 37,
    medianPFS: 6.8,
    sideEffects: ['Diarrhea', 'Nausea', 'Fatigue', 'Liver enzyme elevation'],
    replacesChemo: true,
  },
  {
    name: 'Adagrasib',
    brand: 'Krazati',
    target: 'KRAS G12C',
    cancers: ['NSCLC', 'Colorectal'],
    approval: '2022-12',
    dosing: '600mg twice daily',
    responseRate: 43,
    medianPFS: 6.5,
    sideEffects: ['Nausea', 'Diarrhea', 'Vomiting', 'Fatigue'],
    replacesChemo: true,
  },
  // EGFR Inhibitors
  {
    name: 'Osimertinib',
    brand: 'Tagrisso',
    target: 'EGFR (T790M, exon 19 del, L858R)',
    cancers: ['NSCLC'],
    approval: '2015-11',
    dosing: '80mg once daily',
    responseRate: 80,
    medianPFS: 18.9,
    sideEffects: ['Diarrhea', 'Rash', 'Dry skin', 'Paronychia'],
    replacesChemo: true,
  },
  {
    name: 'Erlotinib',
    brand: 'Tarceva',
    target: 'EGFR',
    cancers: ['NSCLC', 'Pancreatic'],
    approval: '2004-11',
    dosing: '150mg once daily',
    responseRate: 60,
    medianPFS: 10.4,
    sideEffects: ['Rash', 'Diarrhea', 'Anorexia'],
    replacesChemo: true,
  },
  // ALK Inhibitors
  {
    name: 'Alectinib',
    brand: 'Alecensa',
    target: 'ALK',
    cancers: ['NSCLC'],
    approval: '2015-12',
    dosing: '600mg twice daily',
    responseRate: 83,
    medianPFS: 34.8,
    sideEffects: ['Constipation', 'Edema', 'Myalgia'],
    replacesChemo: true,
  },
  {
    name: 'Lorlatinib',
    brand: 'Lorbrena',
    target: 'ALK, ROS1',
    cancers: ['NSCLC'],
    approval: '2018-11',
    dosing: '100mg once daily',
    responseRate: 76,
    medianPFS: 36.7,
    sideEffects: ['Hyperlipidemia', 'Edema', 'Cognitive effects'],
    replacesChemo: true,
  },
  // BRAF/MEK Inhibitors
  {
    name: 'Dabrafenib + Trametinib',
    brand: 'Tafinlar + Mekinist',
    target: 'BRAF V600E + MEK',
    cancers: ['Melanoma', 'NSCLC', 'Thyroid', 'All solid tumors with BRAF V600E'],
    approval: '2022-06',
    dosing: '150mg BID + 2mg QD',
    responseRate: 68,
    medianPFS: 10.9,
    sideEffects: ['Pyrexia', 'Fatigue', 'Nausea', 'Rash'],
    replacesChemo: true,
  },
  {
    name: 'Encorafenib + Binimetinib',
    brand: 'Braftovi + Mektovi',
    target: 'BRAF V600E + MEK',
    cancers: ['Melanoma', 'Colorectal'],
    approval: '2018-06',
    dosing: '450mg QD + 45mg BID',
    responseRate: 63,
    medianPFS: 14.9,
    sideEffects: ['Fatigue', 'Nausea', 'Diarrhea'],
    replacesChemo: true,
  },
  // HER2 Inhibitors
  {
    name: 'Tucatinib',
    brand: 'Tukysa',
    target: 'HER2',
    cancers: ['Breast', 'Colorectal'],
    approval: '2020-04',
    dosing: '300mg twice daily',
    responseRate: 41,
    medianPFS: 7.8,
    sideEffects: ['Diarrhea', 'PPE', 'Nausea'],
    replacesChemo: true,
  },
  {
    name: 'Neratinib',
    brand: 'Nerlynx',
    target: 'HER2',
    cancers: ['Breast'],
    approval: '2017-07',
    dosing: '240mg once daily',
    responseRate: 24,
    medianPFS: 8.8,
    sideEffects: ['Diarrhea', 'Nausea', 'Fatigue'],
    replacesChemo: true,
  },
  // CDK4/6 Inhibitors
  {
    name: 'Palbociclib',
    brand: 'Ibrance',
    target: 'CDK4/6',
    cancers: ['Breast (HR+/HER2-)'],
    approval: '2015-02',
    dosing: '125mg daily x21 days, 7 days off',
    responseRate: 55,
    medianPFS: 24.8,
    sideEffects: ['Neutropenia', 'Fatigue', 'Nausea'],
    replacesChemo: true,
  },
  {
    name: 'Ribociclib',
    brand: 'Kisqali',
    target: 'CDK4/6',
    cancers: ['Breast (HR+/HER2-)'],
    approval: '2017-03',
    dosing: '600mg daily x21 days, 7 days off',
    responseRate: 53,
    medianPFS: 25.3,
    sideEffects: ['Neutropenia', 'QT prolongation', 'Hepatotoxicity'],
    replacesChemo: true,
  },
  {
    name: 'Abemaciclib',
    brand: 'Verzenio',
    target: 'CDK4/6',
    cancers: ['Breast (HR+/HER2-)'],
    approval: '2017-09',
    dosing: '150mg twice daily (continuous)',
    responseRate: 48,
    medianPFS: 16.4,
    sideEffects: ['Diarrhea', 'Neutropenia', 'Fatigue'],
    replacesChemo: true,
  },
  // BTK Inhibitors
  {
    name: 'Ibrutinib',
    brand: 'Imbruvica',
    target: 'BTK',
    cancers: ['CLL', 'MCL', 'MZL', 'WM'],
    approval: '2013-11',
    dosing: '420-560mg once daily',
    responseRate: 90,
    medianPFS: 44,
    sideEffects: ['Bleeding', 'Atrial fibrillation', 'Infections'],
    replacesChemo: true,
  },
  {
    name: 'Acalabrutinib',
    brand: 'Calquence',
    target: 'BTK',
    cancers: ['CLL', 'MCL'],
    approval: '2017-10',
    dosing: '100mg twice daily',
    responseRate: 93,
    medianPFS: 'Not reached',
    sideEffects: ['Headache', 'Diarrhea', 'Bruising'],
    replacesChemo: true,
  },
  {
    name: 'Zanubrutinib',
    brand: 'Brukinsa',
    target: 'BTK',
    cancers: ['MCL', 'WM', 'MZL', 'CLL'],
    approval: '2019-11',
    dosing: '160mg twice daily',
    responseRate: 84,
    medianPFS: 36,
    sideEffects: ['Neutropenia', 'Bruising', 'URTI'],
    replacesChemo: true,
  },
  // BCL-2 Inhibitor
  {
    name: 'Venetoclax',
    brand: 'Venclexta',
    target: 'BCL-2',
    cancers: ['CLL', 'AML'],
    approval: '2016-04',
    dosing: '400mg once daily',
    responseRate: 80,
    medianPFS: 'Not reached',
    sideEffects: ['Tumor lysis syndrome', 'Neutropenia', 'Diarrhea'],
    replacesChemo: true,
  },
  // IDH Inhibitors
  {
    name: 'Ivosidenib',
    brand: 'Tibsovo',
    target: 'IDH1',
    cancers: ['AML', 'Cholangiocarcinoma'],
    approval: '2018-07',
    dosing: '500mg once daily',
    responseRate: 42,
    medianPFS: 6.2,
    sideEffects: ['Fatigue', 'QT prolongation', 'Diarrhea'],
    replacesChemo: true,
  },
  // PARP Inhibitors
  {
    name: 'Olaparib',
    brand: 'Lynparza',
    target: 'PARP',
    cancers: ['Ovarian', 'Breast (BRCA)', 'Prostate', 'Pancreatic'],
    approval: '2014-12',
    dosing: '300mg twice daily',
    responseRate: 72,
    medianPFS: 11.2,
    sideEffects: ['Nausea', 'Fatigue', 'Anemia', 'MDS/AML risk'],
    replacesChemo: true,
  },
  {
    name: 'Niraparib',
    brand: 'Zejula',
    target: 'PARP',
    cancers: ['Ovarian'],
    approval: '2017-03',
    dosing: '200-300mg once daily',
    responseRate: 24,
    medianPFS: 21,
    sideEffects: ['Thrombocytopenia', 'Anemia', 'Hypertension'],
    replacesChemo: true,
  },
  {
    name: 'Rucaparib',
    brand: 'Rubraca',
    target: 'PARP',
    cancers: ['Ovarian', 'Prostate'],
    approval: '2016-12',
    dosing: '600mg twice daily',
    responseRate: 54,
    medianPFS: 10.8,
    sideEffects: ['Nausea', 'Fatigue', 'AST/ALT elevation'],
    replacesChemo: true,
  },
  // RET Inhibitors
  {
    name: 'Selpercatinib',
    brand: 'Retevmo',
    target: 'RET',
    cancers: ['Thyroid', 'NSCLC'],
    approval: '2020-05',
    dosing: '120-160mg twice daily',
    responseRate: 85,
    medianPFS: 24.9,
    sideEffects: ['Dry mouth', 'Diarrhea', 'Hypertension', 'Edema'],
    replacesChemo: true,
  },
  {
    name: 'Pralsetinib',
    brand: 'Gavreto',
    target: 'RET',
    cancers: ['Thyroid', 'NSCLC'],
    approval: '2020-09',
    dosing: '400mg once daily',
    responseRate: 87,
    medianPFS: 19,
    sideEffects: ['Fatigue', 'Constipation', 'Musculoskeletal pain'],
    replacesChemo: true,
  },
  // NTRK Inhibitors
  {
    name: 'Larotrectinib',
    brand: 'Vitrakvi',
    target: 'NTRK',
    cancers: ['Any solid tumor with NTRK fusion'],
    approval: '2018-11',
    dosing: '100mg twice daily',
    responseRate: 75,
    medianPFS: 28.3,
    sideEffects: ['Fatigue', 'Dizziness', 'Nausea'],
    replacesChemo: true,
  },
  {
    name: 'Entrectinib',
    brand: 'Rozlytrek',
    target: 'NTRK, ROS1',
    cancers: ['Any solid tumor with NTRK fusion', 'NSCLC'],
    approval: '2019-08',
    dosing: '600mg once daily',
    responseRate: 57,
    medianPFS: 11.2,
    sideEffects: ['Fatigue', 'Dysgeusia', 'Edema', 'Cognitive effects'],
    replacesChemo: true,
  },
  // MET Inhibitors
  {
    name: 'Capmatinib',
    brand: 'Tabrecta',
    target: 'MET exon 14 skipping',
    cancers: ['NSCLC'],
    approval: '2020-05',
    dosing: '400mg twice daily',
    responseRate: 68,
    medianPFS: 12.4,
    sideEffects: ['Edema', 'Nausea', 'Creatinine elevation'],
    replacesChemo: true,
  },
  {
    name: 'Tepotinib',
    brand: 'Tepmetko',
    target: 'MET exon 14 skipping',
    cancers: ['NSCLC'],
    approval: '2021-02',
    dosing: '450mg once daily',
    responseRate: 46,
    medianPFS: 11.1,
    sideEffects: ['Edema', 'Nausea', 'Diarrhea'],
    replacesChemo: true,
  },
  // FGFR Inhibitors
  {
    name: 'Erdafitinib',
    brand: 'Balversa',
    target: 'FGFR',
    cancers: ['Bladder', 'Cholangiocarcinoma'],
    approval: '2019-04',
    dosing: '8mg once daily',
    responseRate: 40,
    medianPFS: 5.5,
    sideEffects: ['Hyperphosphatemia', 'Stomatitis', 'Nail changes'],
    replacesChemo: true,
  },
  {
    name: 'Pemigatinib',
    brand: 'Pemazyre',
    target: 'FGFR2',
    cancers: ['Cholangiocarcinoma'],
    approval: '2020-04',
    dosing: '13.5mg daily x14 days, 7 days off',
    responseRate: 36,
    medianPFS: 6.9,
    sideEffects: ['Hyperphosphatemia', 'Alopecia', 'Diarrhea'],
    replacesChemo: true,
  },
  // Multikinase Inhibitors
  {
    name: 'Lenvatinib',
    brand: 'Lenvima',
    target: 'VEGFR, FGFR, RET, KIT',
    cancers: ['Thyroid', 'HCC', 'Endometrial', 'RCC'],
    approval: '2015-02',
    dosing: '8-24mg once daily',
    responseRate: 65,
    medianPFS: 18.3,
    sideEffects: ['Hypertension', 'Diarrhea', 'Fatigue', 'PPE'],
    replacesChemo: true,
  },
  {
    name: 'Cabozantinib',
    brand: 'Cabometyx',
    target: 'MET, VEGFR, RET, AXL',
    cancers: ['RCC', 'HCC', 'Thyroid'],
    approval: '2016-04',
    dosing: '60mg once daily',
    responseRate: 46,
    medianPFS: 11.9,
    sideEffects: ['Diarrhea', 'Fatigue', 'Hypertension', 'PPE'],
    replacesChemo: true,
  },
  {
    name: 'Regorafenib',
    brand: 'Stivarga',
    target: 'VEGFR, RAF, KIT',
    cancers: ['Colorectal', 'GIST', 'HCC'],
    approval: '2012-09',
    dosing: '160mg daily x21 days, 7 days off',
    responseRate: 10,
    medianPFS: 4.8,
    sideEffects: ['PPE', 'Fatigue', 'Hypertension', 'Diarrhea'],
    replacesChemo: true,
  },
];

/**
 * Find oral therapy for a cancer
 */
function findOralTherapy(params: {
  cancerType: string;
  mutation?: string;
}): string {
  const cancer = params.cancerType.toLowerCase();
  const mutation = params.mutation?.toUpperCase();

  const matches = OralTargetedTherapies.filter(t => {
    const cancerMatch = t.cancers.some(c =>
      c.toLowerCase().includes(cancer) ||
      cancer.includes(c.toLowerCase().split(' ')[0])
    );
    const mutationMatch = mutation
      ? t.target.toUpperCase().includes(mutation)
      : true;
    return cancerMatch && mutationMatch;
  });

  const output: string[] = [];
  output.push(`# Oral Targeted Therapies for ${params.cancerType}`);
  if (mutation) output.push(`## Mutation: ${mutation}`);
  output.push(`\n**${matches.length} pills found that can replace chemo**\n`);

  if (matches.length === 0) {
    output.push('No FDA-approved oral targeted therapy found for this combination.');
    output.push('Consider genomic testing to identify targetable mutations.');
    return output.join('\n');
  }

  output.push('| Drug | Brand | Target | Response | PFS | Dosing |');
  output.push('|------|-------|--------|----------|-----|--------|');

  for (const m of matches) {
    const pfs = typeof m.medianPFS === 'number' ? `${m.medianPFS}mo` : m.medianPFS;
    output.push(`| ${m.name} | ${m.brand} | ${m.target} | ${m.responseRate}% | ${pfs} | ${m.dosing} |`);
  }

  output.push('\n## Details\n');
  for (const m of matches.slice(0, 5)) {
    output.push(`### ${m.brand} (${m.name})`);
    output.push(`- **Target:** ${m.target}`);
    output.push(`- **FDA Approval:** ${m.approval}`);
    output.push(`- **Dosing:** ${m.dosing}`);
    output.push(`- **Response Rate:** ${m.responseRate}%`);
    output.push(`- **Median PFS:** ${typeof m.medianPFS === 'number' ? m.medianPFS + ' months' : m.medianPFS}`);
    output.push(`- **Side Effects:** ${m.sideEffects.join(', ')}`);
    output.push(`- **Replaces Chemo:** ✅ Yes`);
    output.push('');
  }

  return output.join('\n');
}

/**
 * Get all oral therapies by cancer type
 */
function getOralTherapyByTarget(params: { target: string }): string {
  const target = params.target.toUpperCase();

  const matches = OralTargetedTherapies.filter(t =>
    t.target.toUpperCase().includes(target)
  );

  const output: string[] = [];
  output.push(`# Oral Therapies Targeting ${params.target}\n`);

  if (matches.length === 0) {
    output.push('No approved oral therapies for this target.');
    return output.join('\n');
  }

  for (const m of matches) {
    output.push(`## ${m.brand} (${m.name})`);
    output.push(`- **Cancers:** ${m.cancers.join(', ')}`);
    output.push(`- **Dosing:** ${m.dosing}`);
    output.push(`- **Response:** ${m.responseRate}%`);
    output.push('');
  }

  return output.join('\n');
}

/**
 * Generate replacement plan - replace chemo with pills
 */
async function generateChemoReplacementPlan(params: {
  cancerType: string;
  currentChemo: string;
  genomicProfile?: Record<string, string>;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);

  // Search for alternatives
  const searchResult = await client.search(
    `${params.cancerType} ${params.currentChemo} alternative oral targeted therapy replace 2024 2025`,
    { searchDepth: 'advanced', maxResults: 5 }
  );

  const cancer = params.cancerType.toLowerCase();

  // Find matching oral therapies
  const matches = OralTargetedTherapies.filter(t =>
    t.cancers.some(c =>
      c.toLowerCase().includes(cancer) ||
      cancer.includes(c.toLowerCase().split(' ')[0])
    )
  );

  const output: string[] = [];
  output.push('# Chemotherapy Replacement Plan\n');
  output.push(`## Current: ${params.currentChemo}`);
  output.push(`## Cancer: ${params.cancerType}\n`);

  if (params.genomicProfile) {
    output.push('## Genomic Profile');
    for (const [gene, status] of Object.entries(params.genomicProfile)) {
      output.push(`- **${gene}:** ${status}`);
    }
    output.push('');
  }

  output.push('## Recommended Oral Alternatives\n');

  if (matches.length > 0) {
    // Sort by response rate
    const sorted = [...matches].sort((a, b) => b.responseRate - a.responseRate);

    output.push('### First-Line Oral Options (Pills to Replace Chemo)\n');

    for (const m of sorted.slice(0, 3)) {
      output.push(`**${m.brand} (${m.name})**`);
      output.push(`- Take: ${m.dosing}`);
      output.push(`- Targets: ${m.target}`);
      output.push(`- Response: ${m.responseRate}% (vs ~30% for standard chemo)`);
      output.push(`- PFS: ${typeof m.medianPFS === 'number' ? m.medianPFS + ' months' : m.medianPFS}`);
      output.push(`- Side effects: ${m.sideEffects.slice(0, 3).join(', ')} (milder than chemo)`);
      output.push('');
    }

    output.push('### Required Testing Before Starting');
    const targets = new Set(sorted.map(m => m.target.split(' ')[0]));
    for (const t of targets) {
      output.push(`- Test for ${t} mutation/alteration`);
    }
  } else {
    output.push('No direct oral replacement found. Consider:');
    output.push('- Comprehensive genomic profiling (Foundation Medicine, Tempus)');
    output.push('- Clinical trial search for emerging oral therapies');
  }

  output.push('\n## Latest Research\n');
  if (searchResult.answer) {
    output.push(searchResult.answer);
  }

  output.push('\n## Important Notes');
  output.push('- Genomic testing required to confirm eligibility');
  output.push('- Oral therapies have different (often milder) side effects than chemo');
  output.push('- Many oral therapies can be taken at home');
  output.push('- Some may be combined with immunotherapy');

  return output.join('\n');
}

/**
 * List all oral therapies
 */
function listAllOralTherapies(): string {
  const output: string[] = [];
  output.push('# FDA-Approved Oral Targeted Therapies (Pills That Replace Chemo)\n');
  output.push(`**Total: ${OralTargetedTherapies.length} oral medications**\n`);

  // Group by target class
  const groups: Record<string, typeof OralTargetedTherapies> = {
    'KRAS': OralTargetedTherapies.filter(t => t.target.includes('KRAS')),
    'EGFR': OralTargetedTherapies.filter(t => t.target.includes('EGFR')),
    'ALK': OralTargetedTherapies.filter(t => t.target.includes('ALK')),
    'BRAF/MEK': OralTargetedTherapies.filter(t => t.target.includes('BRAF') || t.target.includes('MEK')),
    'HER2': OralTargetedTherapies.filter(t => t.target.includes('HER2')),
    'CDK4/6': OralTargetedTherapies.filter(t => t.target.includes('CDK')),
    'BTK': OralTargetedTherapies.filter(t => t.target.includes('BTK')),
    'BCL-2': OralTargetedTherapies.filter(t => t.target.includes('BCL')),
    'PARP': OralTargetedTherapies.filter(t => t.target.includes('PARP')),
    'RET': OralTargetedTherapies.filter(t => t.target.includes('RET') && !t.target.includes('VEGFR')),
    'NTRK': OralTargetedTherapies.filter(t => t.target.includes('NTRK')),
    'MET': OralTargetedTherapies.filter(t => t.target.includes('MET exon')),
    'FGFR': OralTargetedTherapies.filter(t => t.target.includes('FGFR') && !t.target.includes('VEGFR')),
    'Multikinase': OralTargetedTherapies.filter(t => t.target.includes('VEGFR')),
  };

  for (const [category, drugs] of Object.entries(groups)) {
    if (drugs.length === 0) continue;
    output.push(`## ${category} Inhibitors\n`);
    output.push('| Drug | Brand | Cancers | Response |');
    output.push('|------|-------|---------|----------|');
    for (const d of drugs) {
      output.push(`| ${d.name} | ${d.brand} | ${d.cancers.slice(0, 2).join(', ')} | ${d.responseRate}% |`);
    }
    output.push('');
  }

  return output.join('\n');
}

/**
 * Create oral therapy tools
 */
export function createOralTherapyTools(apiKey?: string): ToolDefinition[] {
  if (apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }

  return [
    {
      name: 'FindOralTherapy',
      description: 'Find FDA-approved oral pills that can replace chemotherapy for a specific cancer and mutation.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type (e.g., NSCLC, breast, colorectal)' },
          mutation: { type: 'string', description: 'Specific mutation (e.g., KRAS G12C, EGFR, BRAF V600E)' },
        },
        required: ['cancerType'],
      },
      handler: async (params) => findOralTherapy(params as Parameters<typeof findOralTherapy>[0]),
    },
    {
      name: 'GetOralTherapyByTarget',
      description: 'Get all oral therapies that target a specific mutation or pathway.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target (e.g., KRAS, EGFR, ALK, BRAF, HER2, CDK4/6, BTK, PARP)' },
        },
        required: ['target'],
      },
      handler: async (params) => getOralTherapyByTarget(params as Parameters<typeof getOralTherapyByTarget>[0]),
    },
    {
      name: 'GenerateChemoReplacementPlan',
      description: 'Generate a plan to replace chemotherapy with oral targeted therapy pills.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: { type: 'string', description: 'Cancer type' },
          currentChemo: { type: 'string', description: 'Current chemotherapy regimen' },
          genomicProfile: { type: 'object', description: 'Genomic testing results' },
        },
        required: ['cancerType', 'currentChemo'],
      },
      handler: async (params) => generateChemoReplacementPlan(params as Parameters<typeof generateChemoReplacementPlan>[0]),
    },
    {
      name: 'ListAllOralTherapies',
      description: 'List all FDA-approved oral targeted therapies (pills) that can replace chemotherapy.',
      parameters: { type: 'object', properties: {} },
      handler: async () => listAllOralTherapies(),
    },
  ];
}

export function setOralTherapyToolsApiKey(apiKey: string): void {
  tavilyClient = createTavilyClient(apiKey);
}
