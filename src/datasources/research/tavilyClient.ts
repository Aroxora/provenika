/**
 * Tavily Research Client
 *
 * Deep integration with Tavily AI search for cancer research,
 * drug discovery, clinical trials, and evidence verification.
 */

export interface TavilyConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly searchDepth?: 'basic' | 'advanced';
  readonly maxResults?: number;
  readonly includeAnswer?: boolean;
  readonly includeRawContent?: boolean;
}

export interface TavilySearchResult {
  readonly title: string;
  readonly url: string;
  readonly content: string;
  readonly score: number;
  readonly publishedDate?: string;
  readonly rawContent?: string;
}

export interface TavilySearchResponse {
  readonly query: string;
  readonly answer?: string;
  readonly results: readonly TavilySearchResult[];
  readonly responseTime: number;
}

export interface DrugResearchQuery {
  readonly drugName: string;
  readonly targetGene?: string;
  readonly cancerType?: string;
  readonly researchType?: 'mechanism' | 'clinical_trials' | 'efficacy' | 'resistance' | 'combinations';
}

export interface ClinicalTrialQuery {
  readonly condition: string;
  readonly intervention?: string;
  readonly phase?: '1' | '2' | '3' | '4';
  readonly status?: 'recruiting' | 'completed' | 'active';
}

export interface BiomarkerResearchQuery {
  readonly biomarkerName: string;
  readonly cancerType?: string;
  readonly utility?: 'diagnostic' | 'prognostic' | 'predictive';
}

export interface LiteratureSearchQuery {
  readonly topic: string;
  readonly yearFrom?: number;
  readonly journalFilter?: string[];
  readonly studyType?: 'clinical_trial' | 'meta_analysis' | 'review' | 'case_study';
}

export interface VerificationQuery {
  readonly claim: string;
  readonly context?: string;
}

export interface VerificationResult {
  readonly claim: string;
  readonly verified: boolean;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly sources: readonly TavilySearchResult[];
  readonly summary: string;
  readonly contradictions?: readonly string[];
}

/**
 * Tavily AI Search Client for Cancer Research
 */
export class TavilyClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultSearchDepth: 'basic' | 'advanced';
  private readonly defaultMaxResults: number;
  private readonly includeAnswer: boolean;
  private readonly includeRawContent: boolean;

  constructor(config: TavilyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.tavily.com';
    this.defaultSearchDepth = config.searchDepth ?? 'advanced';
    this.defaultMaxResults = config.maxResults ?? 10;
    this.includeAnswer = config.includeAnswer ?? true;
    this.includeRawContent = config.includeRawContent ?? false;
  }

  /**
   * Core search method
   */
  async search(
    query: string,
    options?: {
      searchDepth?: 'basic' | 'advanced';
      maxResults?: number;
      includeDomains?: string[];
      excludeDomains?: string[];
      topic?: 'general' | 'news';
    }
  ): Promise<TavilySearchResponse> {
    const startTime = Date.now();

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: options?.searchDepth ?? this.defaultSearchDepth,
        max_results: options?.maxResults ?? this.defaultMaxResults,
        include_answer: this.includeAnswer,
        include_raw_content: this.includeRawContent,
        include_domains: options?.includeDomains,
        exclude_domains: options?.excludeDomains,
        topic: options?.topic ?? 'general',
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      query,
      answer: data.answer,
      results: data.results.map((r: Record<string, unknown>) => ({
        title: r.title as string,
        url: r.url as string,
        content: r.content as string,
        score: r.score as number,
        publishedDate: r.published_date as string | undefined,
        rawContent: r.raw_content as string | undefined,
      })),
      responseTime: Date.now() - startTime,
    };
  }

  /**
   * Search for drug research information
   */
  async searchDrugResearch(query: DrugResearchQuery): Promise<TavilySearchResponse> {
    const searchTerms: string[] = [query.drugName];

    if (query.targetGene) {
      searchTerms.push(query.targetGene, 'target');
    }
    if (query.cancerType) {
      searchTerms.push(query.cancerType);
    }

    const researchTypeTerms: Record<string, string> = {
      mechanism: 'mechanism of action pharmacology',
      clinical_trials: 'clinical trial results efficacy safety',
      efficacy: 'response rate survival outcomes',
      resistance: 'resistance mechanism acquired resistance',
      combinations: 'combination therapy synergy',
    };

    if (query.researchType) {
      searchTerms.push(researchTypeTerms[query.researchType]);
    }

    const searchQuery = searchTerms.join(' ') + ' cancer research';

    return this.search(searchQuery, {
      searchDepth: 'advanced',
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'cancer.gov',
        'nejm.org',
        'thelancet.com',
        'ascopubs.org',
        'nature.com',
        'cell.com',
        'clinicaltrials.gov',
        'fda.gov',
      ],
    });
  }

  /**
   * Search for clinical trials
   */
  async searchClinicalTrials(query: ClinicalTrialQuery): Promise<TavilySearchResponse> {
    const searchTerms = [query.condition, 'clinical trial'];

    if (query.intervention) {
      searchTerms.push(query.intervention);
    }
    if (query.phase) {
      searchTerms.push(`phase ${query.phase}`);
    }
    if (query.status) {
      searchTerms.push(query.status);
    }

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'clinicaltrials.gov',
        'cancer.gov',
        'ascopubs.org',
        'nejm.org',
      ],
    });
  }

  /**
   * Search for biomarker research
   */
  async searchBiomarkerResearch(query: BiomarkerResearchQuery): Promise<TavilySearchResponse> {
    const searchTerms = [query.biomarkerName, 'biomarker'];

    if (query.cancerType) {
      searchTerms.push(query.cancerType);
    }
    if (query.utility) {
      searchTerms.push(query.utility);
    }

    searchTerms.push('cancer');

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'cancer.gov',
        'ascopubs.org',
        'nature.com',
      ],
    });
  }

  /**
   * Search scientific literature
   */
  async searchLiterature(query: LiteratureSearchQuery): Promise<TavilySearchResponse> {
    const searchTerms = [query.topic];

    if (query.yearFrom) {
      searchTerms.push(`${query.yearFrom}-${new Date().getFullYear()}`);
    }
    if (query.studyType) {
      const studyTypeTerms: Record<string, string> = {
        clinical_trial: 'clinical trial',
        meta_analysis: 'meta-analysis systematic review',
        review: 'review article',
        case_study: 'case report case series',
      };
      searchTerms.push(studyTypeTerms[query.studyType]);
    }

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: query.journalFilter ?? [
        'pubmed.ncbi.nlm.nih.gov',
        'nejm.org',
        'thelancet.com',
        'ascopubs.org',
        'nature.com',
        'cell.com',
        'oncologistjournal.com',
        'jamanetwork.com',
      ],
    });
  }

  /**
   * Search for FDA drug approvals and labels
   */
  async searchFDAApprovals(drugName: string, indication?: string): Promise<TavilySearchResponse> {
    const searchTerms = [drugName, 'FDA approved'];
    if (indication) {
      searchTerms.push(indication);
    }

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'fda.gov',
        'accessdata.fda.gov',
        'drugs.com',
      ],
    });
  }

  /**
   * Search for NCCN guidelines
   */
  async searchNCCNGuidelines(cancerType: string, topic?: string): Promise<TavilySearchResponse> {
    const searchTerms = ['NCCN guidelines', cancerType];
    if (topic) {
      searchTerms.push(topic);
    }

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'nccn.org',
        'pubmed.ncbi.nlm.nih.gov',
        'ascopubs.org',
      ],
    });
  }

  /**
   * Search for drug interactions
   */
  async searchDrugInteractions(drugA: string, drugB?: string): Promise<TavilySearchResponse> {
    const searchTerms = [drugA, 'drug interaction'];
    if (drugB) {
      searchTerms.push(drugB);
    }
    searchTerms.push('cancer chemotherapy');

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'drugs.com',
        'pubmed.ncbi.nlm.nih.gov',
        'fda.gov',
        'cancer.gov',
      ],
    });
  }

  /**
   * Search for resistance mechanisms
   */
  async searchResistanceMechanisms(
    drugOrTarget: string,
    cancerType?: string
  ): Promise<TavilySearchResponse> {
    const searchTerms = [drugOrTarget, 'resistance mechanism', 'acquired resistance'];
    if (cancerType) {
      searchTerms.push(cancerType);
    }

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'nature.com',
        'cell.com',
        'cancer.gov',
      ],
    });
  }

  /**
   * Search for novel therapeutic targets
   */
  async searchTherapeuticTargets(
    cancerType: string,
    pathway?: string
  ): Promise<TavilySearchResponse> {
    const searchTerms = [cancerType, 'therapeutic target', 'druggable'];
    if (pathway) {
      searchTerms.push(pathway, 'pathway');
    }
    searchTerms.push('novel emerging');

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'nature.com',
        'cell.com',
        'cancer.gov',
      ],
    });
  }

  /**
   * Verify a medical/scientific claim
   */
  async verifyClaim(query: VerificationQuery): Promise<VerificationResult> {
    const searchQuery = query.context
      ? `${query.claim} ${query.context} evidence`
      : `${query.claim} evidence research`;

    const response = await this.search(searchQuery, {
      searchDepth: 'advanced',
      maxResults: 10,
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'nejm.org',
        'thelancet.com',
        'fda.gov',
        'cancer.gov',
        'nccn.org',
        'ascopubs.org',
      ],
    });

    // Analyze results for verification
    const supportingEvidence: TavilySearchResult[] = [];
    const contradictions: string[] = [];

    for (const result of response.results) {
      const content = result.content.toLowerCase();
      const claimLower = query.claim.toLowerCase();

      // Simple heuristic - check if content supports or contradicts
      const hasNegation = /\b(not|no|false|incorrect|disproven|contrary)\b/.test(content);
      const mentionsClaim = content.includes(claimLower.split(' ').slice(0, 3).join(' '));

      if (mentionsClaim && hasNegation) {
        contradictions.push(result.content.slice(0, 200));
      } else if (result.score > 0.5) {
        supportingEvidence.push(result);
      }
    }

    const verified = supportingEvidence.length >= 2 && contradictions.length === 0;
    let confidence: 'high' | 'medium' | 'low';

    if (supportingEvidence.length >= 3 && contradictions.length === 0) {
      confidence = 'high';
    } else if (supportingEvidence.length >= 1 && contradictions.length <= 1) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      claim: query.claim,
      verified,
      confidence,
      sources: supportingEvidence,
      summary: response.answer ?? `Found ${supportingEvidence.length} supporting sources`,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
    };
  }

  /**
   * Get latest research news for a topic
   */
  async getLatestResearchNews(topic: string): Promise<TavilySearchResponse> {
    return this.search(`${topic} cancer research latest news 2024 2025`, {
      searchDepth: 'basic',
      topic: 'news',
      maxResults: 10,
    });
  }

  /**
   * Search for precision medicine approaches
   */
  async searchPrecisionMedicine(
    biomarker: string,
    cancerType: string
  ): Promise<TavilySearchResponse> {
    return this.search(
      `${biomarker} ${cancerType} precision medicine targeted therapy personalized`,
      {
        searchDepth: 'advanced',
        includeDomains: [
          'pubmed.ncbi.nlm.nih.gov',
          'cancer.gov',
          'nccn.org',
          'ascopubs.org',
        ],
      }
    );
  }

  /**
   * Search for immunotherapy approaches
   */
  async searchImmunotherapy(
    cancerType: string,
    checkpoint?: string
  ): Promise<TavilySearchResponse> {
    const searchTerms = [cancerType, 'immunotherapy'];
    if (checkpoint) {
      searchTerms.push(checkpoint);
    }
    searchTerms.push('checkpoint inhibitor PD-1 PD-L1 CTLA-4');

    return this.search(searchTerms.join(' '), {
      searchDepth: 'advanced',
      includeDomains: [
        'pubmed.ncbi.nlm.nih.gov',
        'cancer.gov',
        'nejm.org',
        'ascopubs.org',
      ],
    });
  }
}

/**
 * Create a Tavily client from environment or provided key
 */
export function createTavilyClient(apiKey?: string): TavilyClient {
  const key = apiKey ?? process.env['TAVILY_API_KEY'];
  if (!key) {
    throw new Error('Tavily API key required. Set TAVILY_API_KEY or provide apiKey.');
  }
  return new TavilyClient({ apiKey: key });
}
