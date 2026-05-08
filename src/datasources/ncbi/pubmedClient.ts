/**
 * PubMed/NCBI E-utilities Client
 *
 * Provides access to PubMed literature database via NCBI E-utilities API.
 * API Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */

import { BaseClient, DataSourceConfig, DataSourceError, createPaginatedResponse, type PaginatedResponse } from '../base/baseClient.js';
import type { Publication, PublicationSearchCriteria, Author, MeshTerm, Citation } from '../../domain/research/publication.js';

/**
 * PubMed client configuration
 */
export interface PubMedConfig extends Partial<DataSourceConfig> {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
}

/**
 * E-Search response structure
 */
interface ESearchResult {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    querytranslation?: string;
  };
}

/**
 * E-Fetch response for PubMed articles
 */
interface EFetchResult {
  PubmedArticleSet?: {
    PubmedArticle?: PubmedArticle[];
  };
}

/**
 * PubMed article structure
 */
interface PubmedArticle {
  MedlineCitation: {
    PMID: { _: string };
    Article: {
      ArticleTitle: string;
      Abstract?: {
        AbstractText: string | Array<{ _: string; Label?: string }>;
      };
      AuthorList?: {
        Author: PubmedAuthor[];
      };
      Journal: {
        Title: string;
        ISOAbbreviation?: string;
        ISSN?: { _: string };
        JournalIssue: {
          Volume?: string;
          Issue?: string;
          PubDate: {
            Year?: string;
            Month?: string;
            Day?: string;
            MedlineDate?: string;
          };
        };
      };
      PublicationTypeList?: {
        PublicationType: Array<{ _: string }>;
      };
      ArticleDate?: Array<{
        Year: string;
        Month: string;
        Day: string;
      }>;
    };
    MeshHeadingList?: {
      MeshHeading: PubmedMeshHeading[];
    };
    KeywordList?: {
      Keyword: Array<{ _: string }>;
    };
  };
  PubmedData?: {
    ArticleIdList?: {
      ArticleId: Array<{ _: string; IdType: string }>;
    };
  };
}

interface PubmedAuthor {
  LastName?: string;
  ForeName?: string;
  Initials?: string;
  AffiliationInfo?: Array<{ Affiliation: string }>;
}

interface PubmedMeshHeading {
  DescriptorName: { _: string; MajorTopicYN: string; UI: string };
  QualifierName?: Array<{ _: string; MajorTopicYN: string }>;
}

/**
 * PubMed client for literature search
 */
export class PubMedClient extends BaseClient {
  private readonly tool: string;
  private readonly email: string;

  constructor(config: PubMedConfig = {}) {
    super(
      {
        baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
        rateLimitPerSecond: config.apiKey ? 10 : 3, // 3/sec without key, 10/sec with key
        cacheTtlMs: 600000, // 10 minutes
        ...config,
      },
      'PubMed'
    );
    this.tool = config.tool ?? 'CancerCore';
    this.email = config.email ?? 'cancer-core@example.com';
  }

  /**
   * Search PubMed for publications
   */
  async search(
    criteria: PublicationSearchCriteria
  ): Promise<PaginatedResponse<Publication>> {
    const query = this.buildSearchQuery(criteria);
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;

    // First, search for IDs
    const searchParams: Record<string, string> = {
      db: 'pubmed',
      term: query,
      retmax: String(limit),
      retstart: String(offset),
      retmode: 'json',
      usehistory: 'y',
      tool: this.tool,
      email: this.email,
    };

    if (this.config.apiKey) {
      searchParams.api_key = this.config.apiKey;
    }

    if (criteria.sortBy === 'date') {
      searchParams.sort = 'pub_date';
    }

    const searchResponse = await this.request<ESearchResult>(
      '/esearch.fcgi',
      { params: searchParams }
    );

    const { esearchresult } = searchResponse.data;
    const total = parseInt(esearchresult.count, 10);
    const ids = esearchresult.idlist;

    if (ids.length === 0) {
      return createPaginatedResponse([], total, offset, limit);
    }

    // Fetch full records
    const publications = await this.fetchByIds(ids);

    return createPaginatedResponse(publications, total, offset, limit);
  }

  /**
   * Fetch publications by PubMed IDs
   */
  async fetchByIds(pmids: string[]): Promise<Publication[]> {
    if (pmids.length === 0) return [];

    const fetchParams: Record<string, string> = {
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
      tool: this.tool,
      email: this.email,
    };

    if (this.config.apiKey) {
      fetchParams.api_key = this.config.apiKey;
    }

    // Note: E-Fetch returns XML by default for PubMed
    // We'll need to handle XML parsing or use a different approach
    const response = await this.request<string>(
      '/efetch.fcgi',
      {
        params: fetchParams,
        headers: { Accept: 'application/xml' },
      }
    );

    // Parse XML response and convert to Publication objects
    return this.parsePublications(response.data);
  }

  /**
   * Get a single publication by PubMed ID
   */
  async getById(pmid: string): Promise<Publication | null> {
    const publications = await this.fetchByIds([pmid]);
    return publications[0] ?? null;
  }

  /**
   * Search for related articles
   */
  async findRelated(pmid: string, limit: number = 10): Promise<Publication[]> {
    const linkParams: Record<string, string> = {
      dbfrom: 'pubmed',
      db: 'pubmed',
      id: pmid,
      cmd: 'neighbor_score',
      retmode: 'json',
      tool: this.tool,
      email: this.email,
    };

    if (this.config.apiKey) {
      linkParams.api_key = this.config.apiKey;
    }

    const response = await this.request<{ linksets: Array<{ linksetdbs?: Array<{ links?: string[] }> }> }>(
      '/elink.fcgi',
      { params: linkParams }
    );

    const links = response.data.linksets?.[0]?.linksetdbs?.[0]?.links ?? [];
    const relatedIds = links.slice(0, limit);

    if (relatedIds.length === 0) return [];

    return this.fetchByIds(relatedIds);
  }

  /**
   * Get citation counts (via PubMed Central)
   */
  async getCitationCount(pmid: string): Promise<number> {
    const linkParams: Record<string, string> = {
      dbfrom: 'pubmed',
      db: 'pmc',
      id: pmid,
      linkname: 'pubmed_pmc_refs',
      retmode: 'json',
      tool: this.tool,
      email: this.email,
    };

    if (this.config.apiKey) {
      linkParams.api_key = this.config.apiKey;
    }

    try {
      const response = await this.request<{ linksets: Array<{ linksetdbs?: Array<{ links?: string[] }> }> }>(
        '/elink.fcgi',
        { params: linkParams }
      );

      return response.data.linksets?.[0]?.linksetdbs?.[0]?.links?.length ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Build search query from criteria
   */
  private buildSearchQuery(criteria: PublicationSearchCriteria): string {
    const terms: string[] = [];

    if (criteria.query) {
      terms.push(criteria.query);
    }

    if (criteria.title) {
      terms.push(`${criteria.title}[Title]`);
    }

    if (criteria.author) {
      terms.push(`${criteria.author}[Author]`);
    }

    if (criteria.journal) {
      terms.push(`${criteria.journal}[Journal]`);
    }

    if (criteria.meshTerms?.length) {
      for (const mesh of criteria.meshTerms) {
        terms.push(`${mesh}[MeSH Terms]`);
      }
    }

    if (criteria.publicationTypes?.length) {
      const types = criteria.publicationTypes.map(t =>
        t.replace(/_/g, ' ')
      );
      terms.push(`(${types.map(t => `${t}[Publication Type]`).join(' OR ')})`);
    }

    if (criteria.dateFrom || criteria.dateTo) {
      const from = criteria.dateFrom ?? '1900/01/01';
      const to = criteria.dateTo ?? '3000/12/31';
      terms.push(`${from}:${to}[Date - Publication]`);
    }

    if (criteria.language) {
      terms.push(`${criteria.language}[Language]`);
    }

    if (criteria.hasFullText) {
      terms.push('free full text[Filter]');
    }

    return terms.join(' AND ');
  }

  /**
   * Parse XML response into Publication objects
   * Note: This is a simplified parser; a full implementation would use an XML library
   */
  private parsePublications(xmlData: string): Publication[] {
    const publications: Publication[] = [];

    // Simple regex-based extraction (for production, use a proper XML parser)
    const articleMatches = xmlData.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? [];

    for (const articleXml of articleMatches) {
      try {
        const pub = this.parseArticle(articleXml);
        if (pub) publications.push(pub);
      } catch {
        // Skip malformed articles
      }
    }

    return publications;
  }

  /**
   * Parse a single article XML
   */
  private parseArticle(xml: string): Publication | null {
    const pmid = this.extractValue(xml, /<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmid) return null;

    const title = this.extractValue(xml, /<ArticleTitle>([^<]+)<\/ArticleTitle>/) ?? 'Untitled';
    const abstractText = this.extractValue(xml, /<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
    const journalTitle = this.extractValue(xml, /<Title>([^<]+)<\/Title>/);
    const year = this.extractValue(xml, /<Year>(\d{4})<\/Year>/);
    const volume = this.extractValue(xml, /<Volume>([^<]+)<\/Volume>/);
    const issue = this.extractValue(xml, /<Issue>([^<]+)<\/Issue>/);
    const pages = this.extractValue(xml, /<MedlinePgn>([^<]+)<\/MedlinePgn>/);

    // Extract DOI
    const doi = this.extractValue(xml, /<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);

    // Extract authors
    const authors = this.extractAuthors(xml);

    // Extract MeSH terms
    const meshTerms = this.extractMeshTerms(xml);

    const citation: Citation = {
      pubmedId: pmid,
      doi: doi ?? undefined,
      title,
      authors,
      journalName: journalTitle ?? undefined,
      volume: volume ?? undefined,
      issue: issue ?? undefined,
      pages: pages ?? undefined,
      year: parseInt(year ?? '0', 10),
    };

    return {
      id: pmid,
      pubmedId: pmid,
      doi: doi ?? undefined,
      title,
      abstract: abstractText ?? undefined,
      authors,
      publicationType: 'journal_article',
      citation,
      meshTerms,
      publicationDate: year ?? 'Unknown',
    };
  }

  /**
   * Extract authors from article XML
   */
  private extractAuthors(xml: string): Author[] {
    const authors: Author[] = [];
    const authorMatches = xml.match(/<Author[^>]*>[\s\S]*?<\/Author>/g) ?? [];

    for (const authorXml of authorMatches) {
      const lastName = this.extractValue(authorXml, /<LastName>([^<]+)<\/LastName>/);
      const foreName = this.extractValue(authorXml, /<ForeName>([^<]+)<\/ForeName>/);
      const initials = this.extractValue(authorXml, /<Initials>([^<]+)<\/Initials>/);
      const affiliation = this.extractValue(authorXml, /<Affiliation>([^<]+)<\/Affiliation>/);

      if (lastName) {
        authors.push({
          name: `${foreName ?? ''} ${lastName}`.trim(),
          lastName,
          firstName: foreName ?? undefined,
          initials: initials ?? undefined,
          affiliation: affiliation ?? undefined,
        });
      }
    }

    return authors;
  }

  /**
   * Extract MeSH terms from article XML
   */
  private extractMeshTerms(xml: string): MeshTerm[] {
    const meshTerms: MeshTerm[] = [];
    const meshMatches = xml.match(/<MeshHeading>[\s\S]*?<\/MeshHeading>/g) ?? [];

    for (const meshXml of meshMatches) {
      const term = this.extractValue(meshXml, /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/);
      const ui = this.extractValue(meshXml, /UI="([^"]+)"/);
      const isMajor = meshXml.includes('MajorTopicYN="Y"');
      const qualifier = this.extractValue(meshXml, /<QualifierName[^>]*>([^<]+)<\/QualifierName>/);

      if (term && ui) {
        meshTerms.push({
          id: ui,
          term,
          qualifier: qualifier ?? undefined,
          isMajorTopic: isMajor,
        });
      }
    }

    return meshTerms;
  }

  /**
   * Extract value using regex
   */
  private extractValue(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match?.[1]?.trim() ?? null;
  }

  /**
   * Test connection to PubMed
   */
  async testConnection(): Promise<boolean> {
    try {
      const params: Record<string, string> = {
        db: 'pubmed',
        term: 'cancer',
        retmax: '1',
        retmode: 'json',
        tool: this.tool,
        email: this.email,
      };

      if (this.config.apiKey) {
        params.api_key = this.config.apiKey;
      }

      await this.request('/esearch.fcgi', { params });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a PubMed client with default configuration
 */
export function createPubMedClient(apiKey?: string): PubMedClient {
  return new PubMedClient({ apiKey });
}
