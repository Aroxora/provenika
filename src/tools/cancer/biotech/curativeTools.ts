/**
 * Curative Biotechnology Tools
 *
 * AI-powered tools for researching and developing curative cancer treatments
 * including CAR-T, mRNA vaccines, CRISPR therapies, and oncolytic viruses.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import {
  ApprovedCARTProducts,
  KeymRNAVaccinePrograms,
  KeyCRISPRPrograms,
  KeyOncolyticVirusPrograms,
  type CARTTherapy,
  type mRNAVaccine,
  type CRISPRTherapy,
  type OncolyticVirusTherapy,
  type CurativePotentialAssessment,
  type EligibleCurativeTherapy,
} from '../../../domain/biotech/index.js';
import { createTavilyClient, type TavilyClient } from '../../../datasources/research/tavilyClient.js';

let tavilyClient: TavilyClient | null = null;

function getClient(apiKey?: string): TavilyClient {
  if (!tavilyClient && apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }
  if (!tavilyClient) {
    throw new Error('Tavily API key required for research tools');
  }
  return tavilyClient;
}

/**
 * Assess curative therapy eligibility for a patient
 */
function assessCurativePotential(params: {
  cancerType: string;
  stage: string;
  biomarkers: Record<string, string>;
  priorTherapies?: string[];
}): CurativePotentialAssessment {
  const { cancerType, stage, biomarkers, priorTherapies = [] } = params;
  const cancer = cancerType.toLowerCase();
  const eligibleTherapies: EligibleCurativeTherapy[] = [];

  // Check CAR-T eligibility
  for (const cart of ApprovedCARTProducts) {
    for (const indication of cart.approvedIndications) {
      if (cancer.includes(indication.cancerType.toLowerCase()) ||
          indication.cancerType.toLowerCase().includes(cancer.split(' ')[0])) {
        eligibleTherapies.push({
          therapyType: 'CAR-T',
          therapyName: `${cart.tradeName} (${cart.name})`,
          eligibilityStatus: 'approved',
          expectedCompleteResponseRate: cart.completeResponseRate,
          considerations: [
            `Target: ${cart.targetAntigen}`,
            `Line of therapy: ${indication.lineOfTherapy}`,
            `Cell source: ${cart.cellSource}`,
            'Requires lymphodepletion',
            'Risk of CRS and neurotoxicity',
          ],
        });
      }
    }
  }

  // Check mRNA vaccine eligibility
  for (const vaccine of KeymRNAVaccinePrograms) {
    if (vaccine.cancerTypes.some(ct => cancer.includes(ct.toLowerCase()))) {
      eligibleTherapies.push({
        therapyType: 'mRNA_Vaccine',
        therapyName: vaccine.name,
        eligibilityStatus: 'clinical_trial',
        expectedCompleteResponseRate: vaccine.efficacyData?.responseRate,
        clinicalTrialId: vaccine.clinicalTrialId,
        considerations: [
          `Phase: ${vaccine.phase}`,
          `Developer: ${vaccine.developer}`,
          `Type: ${vaccine.type.replace(/_/g, ' ')}`,
          vaccine.combinationPartner ? `Combined with: ${vaccine.combinationPartner}` : '',
          'Personalized manufacturing required',
        ].filter(Boolean),
      });
    }
  }

  // Check CRISPR eligibility
  for (const crispr of KeyCRISPRPrograms) {
    if (crispr.cancerTypes.some(ct => cancer.includes(ct.toLowerCase()) || ct.toLowerCase().includes(cancer.split(' ')[0]))) {
      eligibleTherapies.push({
        therapyType: 'CRISPR',
        therapyName: crispr.name,
        eligibilityStatus: 'clinical_trial',
        expectedCompleteResponseRate: crispr.completeResponseRate,
        clinicalTrialId: crispr.clinicalTrialId,
        considerations: [
          `Editing system: ${crispr.editingSystem}`,
          `Target genes: ${crispr.targetGenes.join(', ')}`,
          `Approach: ${crispr.approach.replace(/_/g, ' ')}`,
          crispr.cellType ? `Cell type: ${crispr.cellType}` : '',
          'Investigational - clinical trial access required',
        ].filter(Boolean),
      });
    }
  }

  // Check oncolytic virus eligibility
  for (const virus of KeyOncolyticVirusPrograms) {
    if (virus.cancerTypes.some(ct => cancer.includes(ct.toLowerCase()))) {
      eligibleTherapies.push({
        therapyType: 'Oncolytic_Virus',
        therapyName: virus.tradeName ? `${virus.tradeName} (${virus.name})` : virus.name,
        eligibilityStatus: virus.phase === 'approved' ? 'approved' : 'clinical_trial',
        expectedCompleteResponseRate: virus.responseRate,
        considerations: [
          `Virus type: ${virus.virusType}`,
          `Delivery: ${virus.deliveryRoute}`,
          virus.combinationPartner ? `Combined with: ${virus.combinationPartner}` : '',
          `Modifications: ${virus.modifications.slice(0, 2).join(', ')}`,
        ].filter(Boolean),
      });
    }
  }

  // Determine best approach
  let bestApproach = 'Standard of care recommended';
  let rationale = 'No curative biotechnology specifically indicated for this cancer type/stage.';

  if (eligibleTherapies.length > 0) {
    // Sort by response rate
    const sorted = [...eligibleTherapies].sort((a, b) =>
      (b.expectedCompleteResponseRate || 0) - (a.expectedCompleteResponseRate || 0)
    );

    const best = sorted[0];
    bestApproach = `${best.therapyType.replace(/_/g, ' ')}: ${best.therapyName}`;

    if (best.expectedCompleteResponseRate) {
      rationale = `Highest expected complete response rate (${best.expectedCompleteResponseRate}%) among eligible therapies. `;
    }

    if (best.eligibilityStatus === 'approved') {
      rationale += 'FDA approved for this indication.';
    } else {
      rationale += `Available through clinical trial${best.clinicalTrialId ? ` (${best.clinicalTrialId})` : ''}.`;
    }
  }

  return {
    cancerType,
    stage,
    biomarkers,
    eligibleTherapies,
    bestApproach,
    rationale,
  };
}

/**
 * Get detailed CAR-T therapy information
 */
function getCARTDetails(params: { productName?: string; targetAntigen?: string; cancerType?: string }): string {
  let products: readonly CARTTherapy[] = ApprovedCARTProducts;

  if (params.productName) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(params.productName!.toLowerCase()) ||
      (p.tradeName?.toLowerCase().includes(params.productName!.toLowerCase()))
    );
  }

  if (params.targetAntigen) {
    products = products.filter(p =>
      p.targetAntigen.toLowerCase() === params.targetAntigen!.toLowerCase()
    );
  }

  if (params.cancerType) {
    products = products.filter(p =>
      p.approvedIndications.some(ind =>
        ind.cancerType.toLowerCase().includes(params.cancerType!.toLowerCase())
      )
    );
  }

  const output: string[] = ['## CAR-T Cell Therapies\n'];

  for (const product of products) {
    output.push(`### ${product.tradeName || product.name}`);
    output.push(`**Generic Name:** ${product.name}`);
    output.push(`**Manufacturer:** ${product.manufacturer}`);
    output.push(`**Target Antigen:** ${product.targetAntigen}`);
    output.push(`**Generation:** ${product.generation}`);
    output.push(`**Cell Source:** ${product.cellSource}`);
    if (product.completeResponseRate) {
      output.push(`**Complete Response Rate:** ${product.completeResponseRate}%`);
    }
    output.push(`**FDA Approval:** ${product.approvalDate || 'N/A'}`);
    output.push('\n**Approved Indications:**');
    for (const ind of product.approvedIndications) {
      output.push(`- ${ind.cancerType} (${ind.lineOfTherapy}, ${ind.patientPopulation})`);
    }
    output.push('\n---\n');
  }

  return output.join('\n');
}

/**
 * Search for latest curative biotechnology developments
 */
async function searchCurativeBiotech(params: {
  therapyType: 'CAR-T' | 'mRNA_vaccine' | 'CRISPR' | 'oncolytic_virus';
  cancerType?: string;
  focus?: 'clinical_trials' | 'mechanism' | 'resistance' | 'manufacturing' | 'combinations';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);

  const therapyTerms: Record<string, string> = {
    'CAR-T': 'CAR-T cell therapy chimeric antigen receptor',
    'mRNA_vaccine': 'mRNA cancer vaccine personalized neoantigen',
    'CRISPR': 'CRISPR gene editing cancer therapy',
    'oncolytic_virus': 'oncolytic virus therapy immunotherapy',
  };

  const focusTerms: Record<string, string> = {
    clinical_trials: 'clinical trial results phase',
    mechanism: 'mechanism of action how it works',
    resistance: 'resistance relapse failure',
    manufacturing: 'manufacturing production scale-up',
    combinations: 'combination therapy synergy',
  };

  let query = therapyTerms[params.therapyType];
  if (params.cancerType) {
    query += ` ${params.cancerType}`;
  }
  if (params.focus) {
    query += ` ${focusTerms[params.focus]}`;
  }
  query += ' 2024 2025 breakthrough';

  const response = await client.search(query, {
    searchDepth: 'advanced',
    maxResults: 10,
    includeDomains: [
      'pubmed.ncbi.nlm.nih.gov',
      'fda.gov',
      'cancer.gov',
      'nature.com',
      'nejm.org',
      'thelancet.com',
      'clinicaltrials.gov',
    ],
  });

  const output: string[] = [];
  output.push(`## ${params.therapyType.replace(/_/g, ' ')} Research Update`);
  output.push(`Query: ${query}`);
  output.push(`Response Time: ${response.responseTime}ms\n`);

  if (response.answer) {
    output.push('### AI Summary');
    output.push(response.answer);
    output.push('');
  }

  output.push(`### Sources (${response.results.length} results)\n`);

  for (const result of response.results.slice(0, 8)) {
    output.push(`**${result.title}**`);
    output.push(`URL: ${result.url}`);
    output.push(`Relevance: ${(result.score * 100).toFixed(1)}%`);
    output.push(result.content.slice(0, 500) + '...');
    output.push('\n---\n');
  }

  return output.join('\n');
}

/**
 * Design a curative treatment protocol
 */
function designCurativeProtocol(params: {
  cancerType: string;
  stage: string;
  biomarkers: Record<string, string>;
  patientFactors: {
    age: number;
    performanceStatus: number;
    priorTherapies: string[];
    organFunction: 'normal' | 'impaired';
  };
}): string {
  const { cancerType, stage, biomarkers, patientFactors } = params;
  const assessment = assessCurativePotential({ cancerType, stage, biomarkers, priorTherapies: patientFactors.priorTherapies });

  const output: string[] = [];
  output.push('# Curative Treatment Protocol Design\n');
  output.push('## Patient Profile');
  output.push(`- **Cancer Type:** ${cancerType}`);
  output.push(`- **Stage:** ${stage}`);
  output.push(`- **Age:** ${patientFactors.age}`);
  output.push(`- **Performance Status:** ECOG ${patientFactors.performanceStatus}`);
  output.push(`- **Prior Therapies:** ${patientFactors.priorTherapies.join(', ') || 'None'}`);
  output.push(`- **Organ Function:** ${patientFactors.organFunction}`);
  output.push('\n## Biomarker Profile');
  for (const [marker, value] of Object.entries(biomarkers)) {
    output.push(`- **${marker}:** ${value}`);
  }

  output.push('\n## Curative Therapy Assessment\n');
  output.push(`**Recommended Approach:** ${assessment.bestApproach}`);
  output.push(`**Rationale:** ${assessment.rationale}\n`);

  if (assessment.eligibleTherapies.length > 0) {
    output.push('## Eligible Curative Therapies\n');

    // Group by therapy type
    const byType = new Map<string, EligibleCurativeTherapy[]>();
    for (const therapy of assessment.eligibleTherapies) {
      const list = byType.get(therapy.therapyType) || [];
      list.push(therapy);
      byType.set(therapy.therapyType, list);
    }

    for (const [type, therapies] of byType) {
      output.push(`### ${type.replace(/_/g, ' ')}\n`);
      for (const therapy of therapies) {
        output.push(`**${therapy.therapyName}**`);
        output.push(`- Status: ${therapy.eligibilityStatus}`);
        if (therapy.expectedCompleteResponseRate) {
          output.push(`- Expected CR Rate: ${therapy.expectedCompleteResponseRate}%`);
        }
        if (therapy.clinicalTrialId) {
          output.push(`- Clinical Trial: ${therapy.clinicalTrialId}`);
        }
        output.push('- Considerations:');
        for (const consideration of therapy.considerations) {
          output.push(`  - ${consideration}`);
        }
        output.push('');
      }
    }

    // Treatment protocol
    output.push('## Proposed Treatment Protocol\n');

    const bestTherapy = assessment.eligibleTherapies[0];
    if (bestTherapy.therapyType === 'CAR-T') {
      output.push('### CAR-T Cell Therapy Protocol');
      output.push('1. **Pre-treatment Workup** (Week -4 to -2)');
      output.push('   - Confirm target antigen expression');
      output.push('   - Assess organ function (cardiac, renal, hepatic)');
      output.push('   - Infectious disease screening');
      output.push('2. **Leukapheresis** (Week -3)');
      output.push('   - Collect peripheral blood mononuclear cells');
      output.push('   - Ship to manufacturing facility');
      output.push('3. **Manufacturing** (3-4 weeks)');
      output.push('   - T cell isolation and activation');
      output.push('   - CAR transduction');
      output.push('   - Expansion and quality control');
      output.push('4. **Bridging Therapy** (if needed)');
      output.push('   - Low-intensity chemotherapy to control disease');
      output.push('5. **Lymphodepletion** (Day -5 to -3)');
      output.push('   - Fludarabine 30 mg/m² + Cyclophosphamide 500 mg/m²');
      output.push('6. **CAR-T Infusion** (Day 0)');
      output.push('   - Single infusion of manufactured cells');
      output.push('7. **Monitoring** (Day 0-28)');
      output.push('   - Daily assessment for CRS and neurotoxicity');
      output.push('   - Tocilizumab and steroids available for CRS');
      output.push('8. **Response Assessment** (Day 28-30)');
      output.push('   - PET/CT scan');
      output.push('   - Bone marrow biopsy if applicable');
    } else if (bestTherapy.therapyType === 'mRNA_Vaccine') {
      output.push('### Personalized mRNA Vaccine Protocol');
      output.push('1. **Tumor Sampling**');
      output.push('   - Fresh tumor biopsy or surgical specimen');
      output.push('   - Whole exome sequencing');
      output.push('   - RNA sequencing for expression');
      output.push('2. **Neoantigen Identification** (2-4 weeks)');
      output.push('   - Computational prediction of neoantigens');
      output.push('   - HLA typing');
      output.push('   - Selection of up to 20-34 targets');
      output.push('3. **Vaccine Manufacturing** (4-6 weeks)');
      output.push('   - mRNA synthesis');
      output.push('   - LNP formulation');
      output.push('   - Quality control');
      output.push('4. **Treatment Cycle**');
      output.push('   - Cycle 1: 9 doses over 12 weeks');
      output.push('   - Maintenance: Every 3-6 months');
      output.push('   - Combined with checkpoint inhibitor');
      output.push('5. **Response Monitoring**');
      output.push('   - T cell response assays');
      output.push('   - ctDNA monitoring');
      output.push('   - Imaging every 12 weeks');
    }
  } else {
    output.push('## Alternative Approaches\n');
    output.push('No curative biotechnology directly indicated. Consider:');
    output.push('- Clinical trial search for emerging therapies');
    output.push('- Molecular profiling for targetable alterations');
    output.push('- Multidisciplinary tumor board review');
  }

  output.push('\n## Important Disclaimers');
  output.push('- This protocol is for research/educational purposes only');
  output.push('- Actual treatment decisions require oncologist oversight');
  output.push('- Clinical trial eligibility requires formal screening');
  output.push('- Individual patient factors may modify recommendations');

  return output.join('\n');
}

/**
 * Create curative biotechnology tools
 */
export function createCurativeTools(apiKey?: string): ToolDefinition[] {
  if (apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }

  return [
    {
      name: 'AssessCurativePotential',
      description:
        'Assess eligibility for curative biotechnologies (CAR-T, mRNA vaccines, CRISPR, oncolytic viruses) based on cancer type, stage, and biomarkers.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Cancer type (e.g., B-cell ALL, DLBCL, melanoma)',
          },
          stage: {
            type: 'string',
            description: 'Cancer stage',
          },
          biomarkers: {
            type: 'object',
            description: 'Relevant biomarkers (e.g., CD19, BCMA, PD-L1)',
          },
          priorTherapies: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of prior treatments',
          },
        },
        required: ['cancerType', 'stage'],
      },
      handler: async (params) => {
        const result = assessCurativePotential(params as Parameters<typeof assessCurativePotential>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'GetCARTDetails',
      description:
        'Get detailed information about FDA-approved CAR-T cell therapies including indications, response rates, and manufacturing details.',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: 'Product name (e.g., Kymriah, Yescarta, Breyanzi)',
          },
          targetAntigen: {
            type: 'string',
            description: 'Target antigen (CD19, BCMA)',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type to filter by',
          },
        },
      },
      handler: async (params) => getCARTDetails(params as Parameters<typeof getCARTDetails>[0]),
    },
    {
      name: 'SearchCurativeBiotech',
      description:
        'Search for latest research on curative biotechnologies using AI-powered real-time search across scientific literature.',
      parameters: {
        type: 'object',
        properties: {
          therapyType: {
            type: 'string',
            enum: ['CAR-T', 'mRNA_vaccine', 'CRISPR', 'oncolytic_virus'],
            description: 'Type of curative biotechnology to research',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type for context',
          },
          focus: {
            type: 'string',
            enum: ['clinical_trials', 'mechanism', 'resistance', 'manufacturing', 'combinations'],
            description: 'Research focus area',
          },
        },
        required: ['therapyType'],
      },
      handler: async (params) => searchCurativeBiotech(params as Parameters<typeof searchCurativeBiotech>[0]),
    },
    {
      name: 'DesignCurativeProtocol',
      description:
        'Design a comprehensive curative treatment protocol based on patient characteristics and eligible biotechnologies.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Cancer type',
          },
          stage: {
            type: 'string',
            description: 'Cancer stage',
          },
          biomarkers: {
            type: 'object',
            description: 'Biomarker profile',
          },
          patientFactors: {
            type: 'object',
            properties: {
              age: { type: 'number' },
              performanceStatus: { type: 'number' },
              priorTherapies: { type: 'array', items: { type: 'string' } },
              organFunction: { type: 'string', enum: ['normal', 'impaired'] },
            },
            required: ['age', 'performanceStatus', 'priorTherapies', 'organFunction'],
          },
        },
        required: ['cancerType', 'stage', 'biomarkers', 'patientFactors'],
      },
      handler: async (params) => designCurativeProtocol(params as Parameters<typeof designCurativeProtocol>[0]),
    },
  ];
}

/**
 * Set Tavily API key
 */
export function setCurativeToolsApiKey(apiKey: string): void {
  tavilyClient = createTavilyClient(apiKey);
}
