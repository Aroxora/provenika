/**
 * Publication Domain Models
 *
 * Core types for scientific publications and literature data
 */

/**
 * Publication type
 */
export type PublicationType =
  | 'journal_article'
  | 'review'
  | 'systematic_review'
  | 'meta_analysis'
  | 'clinical_trial'
  | 'case_report'
  | 'editorial'
  | 'letter'
  | 'commentary'
  | 'preprint'
  | 'book_chapter'
  | 'conference_paper'
  | 'guideline';

/**
 * Author information
 */
export interface Author {
  readonly name: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly initials?: string;
  readonly affiliation?: string;
  readonly affiliations?: readonly string[];
  readonly orcid?: string;
  readonly email?: string;
  readonly isCorresponding?: boolean;
}

/**
 * Journal information
 */
export interface Journal {
  readonly name: string;
  readonly abbreviation?: string;
  readonly issn?: string;
  readonly eissn?: string;
  readonly impactFactor?: number;
  readonly publisher?: string;
  readonly country?: string;
}

/**
 * Citation information
 */
export interface Citation {
  readonly pubmedId?: string;
  readonly doi?: string;
  readonly pmcId?: string;
  readonly arxivId?: string;
  readonly title: string;
  readonly authors: readonly Author[];
  readonly journal?: Journal;
  readonly journalName?: string;
  readonly volume?: string;
  readonly issue?: string;
  readonly pages?: string;
  readonly year: number;
  readonly month?: number;
  readonly publicationDate?: string;
}

/**
 * MeSH term for indexing
 */
export interface MeshTerm {
  readonly id: string;
  readonly term: string;
  readonly qualifier?: string;
  readonly isMajorTopic: boolean;
}

/**
 * Keyword from publication
 */
export interface PublicationKeyword {
  readonly keyword: string;
  readonly source: 'author' | 'mesh' | 'nlm' | 'other';
}

/**
 * Grant funding information
 */
export interface Grant {
  readonly grantId?: string;
  readonly agency: string;
  readonly country?: string;
  readonly acronym?: string;
}

/**
 * Core Publication entity
 */
export interface Publication {
  readonly id: string;
  readonly pubmedId?: string;
  readonly pmcId?: string;
  readonly doi?: string;
  readonly title: string;
  readonly abstract?: string;
  readonly authors: readonly Author[];
  readonly publicationType: PublicationType;
  readonly journal?: Journal;
  readonly citation: Citation;
  readonly meshTerms?: readonly MeshTerm[];
  readonly keywords?: readonly PublicationKeyword[];
  readonly grants?: readonly Grant[];
  readonly publicationDate: string;
  readonly dateIndexed?: string;
  readonly language?: string;
  readonly fullTextUrl?: string;
  readonly pdfUrl?: string;
  readonly citationCount?: number;
  readonly references?: readonly Citation[];
  readonly citedBy?: readonly Citation[];
}

/**
 * Publication abstract with structured sections
 */
export interface StructuredAbstract {
  readonly background?: string;
  readonly objective?: string;
  readonly methods?: string;
  readonly results?: string;
  readonly conclusions?: string;
  readonly fullText?: string;
}

/**
 * Publication search criteria
 */
export interface PublicationSearchCriteria {
  readonly query?: string;
  readonly title?: string;
  readonly author?: string;
  readonly journal?: string;
  readonly meshTerms?: readonly string[];
  readonly publicationTypes?: readonly PublicationType[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly language?: string;
  readonly hasFullText?: boolean;
  readonly sortBy?: 'relevance' | 'date' | 'citations';
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Publication search result
 */
export interface PublicationSearchResult {
  readonly publications: readonly Publication[];
  readonly totalCount: number;
  readonly query: string;
  readonly searchDate: string;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/**
 * Literature review summary
 */
export interface LiteratureReview {
  readonly id: string;
  readonly topic: string;
  readonly query: string;
  readonly publications: readonly Publication[];
  readonly summary: string;
  readonly keyFindings: readonly string[];
  readonly themes: readonly LiteratureTheme[];
  readonly gaps?: readonly string[];
  readonly futureDirections?: readonly string[];
  readonly generatedDate: string;
  readonly methodology?: string;
}

/**
 * Theme identified in literature
 */
export interface LiteratureTheme {
  readonly name: string;
  readonly description: string;
  readonly publicationCount: number;
  readonly keyPublications: readonly string[];
  readonly trends?: string;
}

/**
 * Citation analysis result
 */
export interface CitationAnalysis {
  readonly publicationId: string;
  readonly citationCount: number;
  readonly hIndex?: number;
  readonly citationsPerYear?: readonly YearlyCitations[];
  readonly topCitingPapers?: readonly Publication[];
  readonly selfCitations?: number;
  readonly fieldWeightedCitationImpact?: number;
}

/**
 * Citations per year
 */
export interface YearlyCitations {
  readonly year: number;
  readonly count: number;
}

/**
 * Co-authorship network node
 */
export interface CoAuthorNode {
  readonly authorName: string;
  readonly publicationCount: number;
  readonly hIndex?: number;
  readonly affiliations?: readonly string[];
}

/**
 * Co-authorship network edge
 */
export interface CoAuthorEdge {
  readonly author1: string;
  readonly author2: string;
  readonly collaborationCount: number;
  readonly recentYear?: number;
}

/**
 * Co-authorship network
 */
export interface CoAuthorshipNetwork {
  readonly centralAuthor: string;
  readonly nodes: readonly CoAuthorNode[];
  readonly edges: readonly CoAuthorEdge[];
  readonly networkMetrics?: {
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly density?: number;
    readonly averageDegree?: number;
  };
}

/**
 * Publication trend analysis
 */
export interface PublicationTrend {
  readonly topic: string;
  readonly query: string;
  readonly yearlyData: readonly YearlyPublicationData[];
  readonly trend: 'increasing' | 'decreasing' | 'stable' | 'emerging';
  readonly growthRate?: number;
  readonly peakYear?: number;
}

/**
 * Yearly publication data
 */
export interface YearlyPublicationData {
  readonly year: number;
  readonly count: number;
  readonly percentageOfTotal?: number;
}

/**
 * Related publication
 */
export interface RelatedPublication {
  readonly publication: Publication;
  readonly similarityScore: number;
  readonly relationshipType: 'similar' | 'citing' | 'cited_by' | 'shared_author' | 'shared_topic';
}

/**
 * Text mining result from publications
 */
export interface TextMiningResult {
  readonly entity: string;
  readonly entityType: 'gene' | 'protein' | 'drug' | 'disease' | 'mutation' | 'pathway' | 'cell_line' | 'organism';
  readonly mentions: readonly EntityMention[];
  readonly frequency: number;
  readonly normalizedId?: string;
}

/**
 * Entity mention in text
 */
export interface EntityMention {
  readonly publicationId: string;
  readonly text: string;
  readonly section?: 'title' | 'abstract' | 'body';
  readonly sentenceContext?: string;
  readonly startPosition?: number;
  readonly endPosition?: number;
}

/**
 * Publication quality assessment
 */
export interface PublicationQuality {
  readonly publicationId: string;
  readonly journalImpactFactor?: number;
  readonly journalQuartile?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly citationCount: number;
  readonly studyDesignLevel?: 'meta_analysis' | 'rct' | 'cohort' | 'case_control' | 'case_report' | 'expert_opinion';
  readonly sampleSize?: number;
  readonly biasRisk?: 'low' | 'moderate' | 'high' | 'unclear';
  readonly overallQuality: 'high' | 'moderate' | 'low';
}
