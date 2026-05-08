/**
 * Cancer Research Tools
 *
 * AI-powered research tools leveraging Tavily for real-time
 * literature search, evidence verification, and drug discovery.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import {
  TavilyClient,
  createTavilyClient,
  type TavilySearchResponse,
  type VerificationResult,
} from '../../../datasources/research/tavilyClient.js';

let tavilyClient: TavilyClient | null = null;

function getClient(apiKey?: string): TavilyClient {
  if (!tavilyClient) {
    tavilyClient = createTavilyClient(apiKey);
  }
  return tavilyClient;
}

/**
 * Format search results for tool output
 */
function formatSearchResults(response: TavilySearchResponse): string {
  const output: string[] = [];

  output.push(`Query: ${response.query}`);
  output.push(`Response Time: ${response.responseTime}ms`);
  output.push('');

  if (response.answer) {
    output.push('## AI Summary');
    output.push(response.answer);
    output.push('');
  }

  output.push(`## Sources (${response.results.length} results)`);
  output.push('');

  for (const result of response.results) {
    output.push(`### ${result.title}`);
    output.push(`URL: ${result.url}`);
    output.push(`Relevance Score: ${(result.score * 100).toFixed(1)}%`);
    if (result.publishedDate) {
      output.push(`Published: ${result.publishedDate}`);
    }
    output.push('');
    output.push(result.content);
    output.push('');
    output.push('---');
    output.push('');
  }

  return output.join('\n');
}

/**
 * Format verification results
 */
function formatVerificationResult(result: VerificationResult): string {
  const output: string[] = [];

  output.push('## Claim Verification Report');
  output.push('');
  output.push(`**Claim:** ${result.claim}`);
  output.push(`**Verified:** ${result.verified ? 'YES' : 'NO'}`);
  output.push(`**Confidence:** ${result.confidence.toUpperCase()}`);
  output.push('');
  output.push('### Summary');
  output.push(result.summary);
  output.push('');

  if (result.contradictions && result.contradictions.length > 0) {
    output.push('### Potential Contradictions');
    for (const contradiction of result.contradictions) {
      output.push(`- ${contradiction}`);
    }
    output.push('');
  }

  output.push(`### Supporting Sources (${result.sources.length})`);
  for (const source of result.sources.slice(0, 5)) {
    output.push(`- [${source.title}](${source.url}) (Score: ${(source.score * 100).toFixed(1)}%)`);
  }

  return output.join('\n');
}

/**
 * Search for drug research information
 */
async function searchDrugResearch(params: {
  drugName: string;
  targetGene?: string;
  cancerType?: string;
  researchType?: 'mechanism' | 'clinical_trials' | 'efficacy' | 'resistance' | 'combinations';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchDrugResearch({
    drugName: params.drugName,
    targetGene: params.targetGene,
    cancerType: params.cancerType,
    researchType: params.researchType,
  });
  return formatSearchResults(response);
}

/**
 * Search for clinical trials
 */
async function searchClinicalTrials(params: {
  condition: string;
  intervention?: string;
  phase?: '1' | '2' | '3' | '4';
  status?: 'recruiting' | 'completed' | 'active';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchClinicalTrials({
    condition: params.condition,
    intervention: params.intervention,
    phase: params.phase,
    status: params.status,
  });
  return formatSearchResults(response);
}

/**
 * Search for biomarker research
 */
async function searchBiomarkerResearch(params: {
  biomarkerName: string;
  cancerType?: string;
  utility?: 'diagnostic' | 'prognostic' | 'predictive';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchBiomarkerResearch({
    biomarkerName: params.biomarkerName,
    cancerType: params.cancerType,
    utility: params.utility,
  });
  return formatSearchResults(response);
}

/**
 * Verify a medical/scientific claim
 */
async function verifyClaim(params: {
  claim: string;
  context?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const result = await client.verifyClaim({
    claim: params.claim,
    context: params.context,
  });
  return formatVerificationResult(result);
}

/**
 * Search FDA approvals
 */
async function searchFDAApprovals(params: {
  drugName: string;
  indication?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchFDAApprovals(params.drugName, params.indication);
  return formatSearchResults(response);
}

/**
 * Search NCCN guidelines
 */
async function searchNCCNGuidelines(params: {
  cancerType: string;
  topic?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchNCCNGuidelines(params.cancerType, params.topic);
  return formatSearchResults(response);
}

/**
 * Search for resistance mechanisms
 */
async function searchResistanceMechanisms(params: {
  drugOrTarget: string;
  cancerType?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchResistanceMechanisms(
    params.drugOrTarget,
    params.cancerType
  );
  return formatSearchResults(response);
}

/**
 * Search for novel therapeutic targets
 */
async function searchTherapeuticTargets(params: {
  cancerType: string;
  pathway?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchTherapeuticTargets(params.cancerType, params.pathway);
  return formatSearchResults(response);
}

/**
 * Search scientific literature
 */
async function searchLiterature(params: {
  topic: string;
  yearFrom?: number;
  studyType?: 'clinical_trial' | 'meta_analysis' | 'review' | 'case_study';
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchLiterature({
    topic: params.topic,
    yearFrom: params.yearFrom,
    studyType: params.studyType,
  });
  return formatSearchResults(response);
}

/**
 * Search for precision medicine approaches
 */
async function searchPrecisionMedicine(params: {
  biomarker: string;
  cancerType: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchPrecisionMedicine(params.biomarker, params.cancerType);
  return formatSearchResults(response);
}

/**
 * Search for immunotherapy information
 */
async function searchImmunotherapy(params: {
  cancerType: string;
  checkpoint?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchImmunotherapy(params.cancerType, params.checkpoint);
  return formatSearchResults(response);
}

/**
 * Search for drug interactions
 */
async function searchDrugInteractions(params: {
  drugA: string;
  drugB?: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.searchDrugInteractions(params.drugA, params.drugB);
  return formatSearchResults(response);
}

/**
 * Get latest research news
 */
async function getLatestResearchNews(params: {
  topic: string;
  apiKey?: string;
}): Promise<string> {
  const client = getClient(params.apiKey);
  const response = await client.getLatestResearchNews(params.topic);
  return formatSearchResults(response);
}

/**
 * Create cancer research tools with Tavily integration
 */
export function createResearchTools(apiKey?: string): ToolDefinition[] {
  // Initialize client with provided key
  if (apiKey) {
    tavilyClient = createTavilyClient(apiKey);
  }

  return [
    {
      name: 'SearchDrugResearch',
      description:
        'Search for drug research information including mechanism of action, clinical trials, efficacy data, resistance mechanisms, and combination therapies. Uses real-time AI-powered search across PubMed, cancer.gov, and major oncology journals.',
      parameters: {
        type: 'object',
        properties: {
          drugName: {
            type: 'string',
            description: 'Name of the drug to research (e.g., Osimertinib, Pembrolizumab)',
          },
          targetGene: {
            type: 'string',
            description: 'Target gene if known (e.g., EGFR, ALK, BRAF)',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type for context (e.g., NSCLC, breast cancer)',
          },
          researchType: {
            type: 'string',
            enum: ['mechanism', 'clinical_trials', 'efficacy', 'resistance', 'combinations'],
            description: 'Type of research information to focus on',
          },
        },
        required: ['drugName'],
      },
      handler: async (params) => searchDrugResearch(params as Parameters<typeof searchDrugResearch>[0]),
    },
    {
      name: 'SearchClinicalTrials',
      description:
        'Search for clinical trials for a cancer condition, optionally filtered by intervention, phase, and status. Sources include clinicaltrials.gov and major cancer research institutions.',
      parameters: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Cancer condition to search trials for (e.g., metastatic NSCLC)',
          },
          intervention: {
            type: 'string',
            description: 'Specific drug or intervention to search for',
          },
          phase: {
            type: 'string',
            enum: ['1', '2', '3', '4'],
            description: 'Clinical trial phase to filter by',
          },
          status: {
            type: 'string',
            enum: ['recruiting', 'completed', 'active'],
            description: 'Trial status to filter by',
          },
        },
        required: ['condition'],
      },
      handler: async (params) => searchClinicalTrials(params as Parameters<typeof searchClinicalTrials>[0]),
    },
    {
      name: 'SearchBiomarkerResearch',
      description:
        'Search for biomarker research including diagnostic, prognostic, and predictive applications in cancer. Sources include PubMed and major oncology journals.',
      parameters: {
        type: 'object',
        properties: {
          biomarkerName: {
            type: 'string',
            description: 'Name of the biomarker (e.g., PD-L1, EGFR, HER2)',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type for context',
          },
          utility: {
            type: 'string',
            enum: ['diagnostic', 'prognostic', 'predictive'],
            description: 'Clinical utility to focus on',
          },
        },
        required: ['biomarkerName'],
      },
      handler: async (params) => searchBiomarkerResearch(params as Parameters<typeof searchBiomarkerResearch>[0]),
    },
    {
      name: 'VerifyMedicalClaim',
      description:
        'Verify a medical or scientific claim against peer-reviewed literature and authoritative sources. Returns verification status, confidence level, and supporting/contradicting evidence.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'string',
            description: 'The medical/scientific claim to verify',
          },
          context: {
            type: 'string',
            description: 'Additional context for the claim (e.g., cancer type, patient population)',
          },
        },
        required: ['claim'],
      },
      handler: async (params) => verifyClaim(params as Parameters<typeof verifyClaim>[0]),
    },
    {
      name: 'SearchFDAApprovals',
      description:
        'Search for FDA drug approvals, labels, and regulatory information for cancer drugs.',
      parameters: {
        type: 'object',
        properties: {
          drugName: {
            type: 'string',
            description: 'Name of the drug to search FDA records for',
          },
          indication: {
            type: 'string',
            description: 'Specific indication to search for',
          },
        },
        required: ['drugName'],
      },
      handler: async (params) => searchFDAApprovals(params as Parameters<typeof searchFDAApprovals>[0]),
    },
    {
      name: 'SearchNCCNGuidelines',
      description:
        'Search for NCCN Clinical Practice Guidelines for a specific cancer type and topic.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Cancer type (e.g., breast cancer, NSCLC, colorectal cancer)',
          },
          topic: {
            type: 'string',
            description: 'Specific topic within guidelines (e.g., first-line therapy, staging)',
          },
        },
        required: ['cancerType'],
      },
      handler: async (params) => searchNCCNGuidelines(params as Parameters<typeof searchNCCNGuidelines>[0]),
    },
    {
      name: 'SearchResistanceMechanisms',
      description:
        'Search for drug resistance mechanisms and acquired resistance pathways for cancer therapies.',
      parameters: {
        type: 'object',
        properties: {
          drugOrTarget: {
            type: 'string',
            description: 'Drug name or target gene (e.g., Osimertinib, EGFR)',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type for context',
          },
        },
        required: ['drugOrTarget'],
      },
      handler: async (params) => searchResistanceMechanisms(params as Parameters<typeof searchResistanceMechanisms>[0]),
    },
    {
      name: 'SearchTherapeuticTargets',
      description:
        'Search for novel and emerging therapeutic targets for a specific cancer type, optionally filtered by signaling pathway.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Cancer type to search targets for',
          },
          pathway: {
            type: 'string',
            description: 'Signaling pathway to focus on (e.g., PI3K/AKT, RAS/MAPK)',
          },
        },
        required: ['cancerType'],
      },
      handler: async (params) => searchTherapeuticTargets(params as Parameters<typeof searchTherapeuticTargets>[0]),
    },
    {
      name: 'SearchLiterature',
      description:
        'Search scientific literature on a cancer research topic with optional filters for year and study type.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Research topic to search for',
          },
          yearFrom: {
            type: 'number',
            description: 'Filter for publications from this year onwards',
          },
          studyType: {
            type: 'string',
            enum: ['clinical_trial', 'meta_analysis', 'review', 'case_study'],
            description: 'Type of study to filter for',
          },
        },
        required: ['topic'],
      },
      handler: async (params) => searchLiterature(params as Parameters<typeof searchLiterature>[0]),
    },
    {
      name: 'SearchPrecisionMedicine',
      description:
        'Search for precision medicine and targeted therapy approaches based on biomarker and cancer type.',
      parameters: {
        type: 'object',
        properties: {
          biomarker: {
            type: 'string',
            description: 'Biomarker for precision medicine (e.g., EGFR mutation, HER2 amplification)',
          },
          cancerType: {
            type: 'string',
            description: 'Cancer type',
          },
        },
        required: ['biomarker', 'cancerType'],
      },
      handler: async (params) => searchPrecisionMedicine(params as Parameters<typeof searchPrecisionMedicine>[0]),
    },
    {
      name: 'SearchImmunotherapy',
      description:
        'Search for immunotherapy and checkpoint inhibitor information for a specific cancer type.',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Cancer type',
          },
          checkpoint: {
            type: 'string',
            description: 'Specific checkpoint target (e.g., PD-1, PD-L1, CTLA-4)',
          },
        },
        required: ['cancerType'],
      },
      handler: async (params) => searchImmunotherapy(params as Parameters<typeof searchImmunotherapy>[0]),
    },
    {
      name: 'SearchDrugInteractions',
      description:
        'Search for drug-drug interactions relevant to cancer treatment.',
      parameters: {
        type: 'object',
        properties: {
          drugA: {
            type: 'string',
            description: 'First drug name',
          },
          drugB: {
            type: 'string',
            description: 'Second drug name (optional)',
          },
        },
        required: ['drugA'],
      },
      handler: async (params) => searchDrugInteractions(params as Parameters<typeof searchDrugInteractions>[0]),
    },
    {
      name: 'GetLatestResearchNews',
      description:
        'Get the latest cancer research news and developments for a specific topic.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Research topic to get news for (e.g., CAR-T cell therapy, liquid biopsy)',
          },
        },
        required: ['topic'],
      },
      handler: async (params) => getLatestResearchNews(params as Parameters<typeof getLatestResearchNews>[0]),
    },
  ];
}

/**
 * Set the Tavily API key for all research tools
 */
export function setTavilyApiKey(apiKey: string): void {
  tavilyClient = createTavilyClient(apiKey);
}
