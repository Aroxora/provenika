/**
 * PubMed Literature Tools
 *
 * Tools for searching and analyzing scientific literature
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createPubMedClient } from '../../../datasources/ncbi/pubmedClient.js';
import { getSecretValue } from '../../../core/secretStore.js';

/**
 * Create PubMed literature tools
 */
export function createPubMedTools(): ToolDefinition[] {
  return [
    {
      name: 'PubMedSearch',
      description: 'Search PubMed/NCBI for scientific publications on cancer research, genomics, drug discovery, and related topics. Returns abstracts, authors, and citation information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "BRCA1 breast cancer treatment")',
          },
          author: {
            type: 'string',
            description: 'Filter by author name (optional)',
          },
          journal: {
            type: 'string',
            description: 'Filter by journal name (optional)',
          },
          dateFrom: {
            type: 'string',
            description: 'Start date filter (YYYY/MM/DD format, optional)',
          },
          dateTo: {
            type: 'string',
            description: 'End date filter (YYYY/MM/DD format, optional)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results to return (default: 10, max: 50)',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const query = args['query'];
        if (typeof query !== 'string' || !query.trim()) {
          return 'Error: search query is required';
        }

        const maxResults = Math.min(
          typeof args['maxResults'] === 'number' ? args['maxResults'] : 10,
          50
        );

        try {
          const apiKey = getSecretValue('NCBI_API_KEY') ?? undefined;
          const client = createPubMedClient(apiKey);

          const result = await client.search({
            query: query.trim(),
            author: typeof args['author'] === 'string' ? args['author'] : undefined,
            journal: typeof args['journal'] === 'string' ? args['journal'] : undefined,
            dateFrom: typeof args['dateFrom'] === 'string' ? args['dateFrom'] : undefined,
            dateTo: typeof args['dateTo'] === 'string' ? args['dateTo'] : undefined,
            limit: maxResults,
          });

          if (result.items.length === 0) {
            return `No publications found for query: "${query}"`;
          }

          const lines: string[] = [
            `**PubMed Search Results** (${result.items.length} of ${result.total})`,
            '',
          ];

          for (const pub of result.items) {
            lines.push(`### ${pub.title}`);
            lines.push(`**PMID:** ${pub.pubmedId ?? 'N/A'} | **Year:** ${pub.publicationDate}`);

            if (pub.authors.length > 0) {
              const authorList = pub.authors.slice(0, 3).map(a => a.name).join(', ');
              const suffix = pub.authors.length > 3 ? ` et al.` : '';
              lines.push(`**Authors:** ${authorList}${suffix}`);
            }

            if (pub.citation.journalName) {
              lines.push(`**Journal:** ${pub.citation.journalName}`);
            }

            if (pub.abstract) {
              const abstract = pub.abstract.length > 500
                ? pub.abstract.slice(0, 500) + '...'
                : pub.abstract;
              lines.push(`**Abstract:** ${abstract}`);
            }

            if (pub.doi) {
              lines.push(`**DOI:** https://doi.org/${pub.doi}`);
            }

            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching PubMed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'PubMedGetArticle',
      description: 'Get detailed information about a specific PubMed article by PMID',
      parameters: {
        type: 'object',
        properties: {
          pmid: {
            type: 'string',
            description: 'PubMed ID of the article',
          },
        },
        required: ['pmid'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const pmid = args['pmid'];
        if (typeof pmid !== 'string' || !pmid.trim()) {
          return 'Error: PMID is required';
        }

        try {
          const apiKey = getSecretValue('NCBI_API_KEY') ?? undefined;
          const client = createPubMedClient(apiKey);

          const pub = await client.getById(pmid.trim());

          if (!pub) {
            return `Article not found: PMID ${pmid}`;
          }

          const lines: string[] = [
            `# ${pub.title}`,
            '',
            `**PMID:** ${pub.pubmedId}`,
            `**Publication Date:** ${pub.publicationDate}`,
          ];

          if (pub.doi) {
            lines.push(`**DOI:** https://doi.org/${pub.doi}`);
          }

          if (pub.citation.journalName) {
            const citation = [pub.citation.journalName];
            if (pub.citation.volume) citation.push(`${pub.citation.volume}`);
            if (pub.citation.issue) citation.push(`(${pub.citation.issue})`);
            if (pub.citation.pages) citation.push(`:${pub.citation.pages}`);
            lines.push(`**Citation:** ${citation.join(' ')}`);
          }

          if (pub.authors.length > 0) {
            lines.push('', '## Authors');
            for (const author of pub.authors) {
              const affil = author.affiliation ? ` - ${author.affiliation}` : '';
              lines.push(`- ${author.name}${affil}`);
            }
          }

          if (pub.abstract) {
            lines.push('', '## Abstract', pub.abstract);
          }

          if (pub.meshTerms && pub.meshTerms.length > 0) {
            lines.push('', '## MeSH Terms');
            const terms = pub.meshTerms
              .filter(m => m.isMajorTopic)
              .map(m => m.term);
            lines.push(terms.join(', '));
          }

          lines.push('', `**PubMed Link:** https://pubmed.ncbi.nlm.nih.gov/${pub.pubmedId}/`);

          return lines.join('\n');
        } catch (error) {
          return `Error fetching article: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'PubMedFindRelated',
      description: 'Find articles related to a specific PubMed article',
      parameters: {
        type: 'object',
        properties: {
          pmid: {
            type: 'string',
            description: 'PubMed ID of the source article',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum related articles to return (default: 5, max: 10)',
          },
        },
        required: ['pmid'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const pmid = args['pmid'];
        if (typeof pmid !== 'string' || !pmid.trim()) {
          return 'Error: PMID is required';
        }

        const maxResults = Math.min(
          typeof args['maxResults'] === 'number' ? args['maxResults'] : 5,
          10
        );

        try {
          const apiKey = getSecretValue('NCBI_API_KEY') ?? undefined;
          const client = createPubMedClient(apiKey);

          const related = await client.findRelated(pmid.trim(), maxResults);

          if (related.length === 0) {
            return `No related articles found for PMID ${pmid}`;
          }

          const lines: string[] = [
            `**Related Articles for PMID ${pmid}** (${related.length} found)`,
            '',
          ];

          for (const pub of related) {
            lines.push(`- **${pub.title}**`);
            lines.push(`  PMID: ${pub.pubmedId} | ${pub.publicationDate}`);
            if (pub.citation.journalName) {
              lines.push(`  ${pub.citation.journalName}`);
            }
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error finding related articles: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
