/**
 * Pathway Analysis Tools
 *
 * Tools for analyzing biological pathways in cancer research
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createKEGGClient } from '../../../datasources/pathway/keggClient.js';

/**
 * Create pathway analysis tools
 */
export function createPathwayTools(): ToolDefinition[] {
  return [
    {
      name: 'SearchPathways',
      description: 'Search KEGG for biological pathways by keyword. Useful for finding pathways involved in specific biological processes or diseases.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Search term (e.g., "cancer", "apoptosis", "PI3K", "DNA repair")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 10)',
          },
        },
        required: ['keyword'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const keyword = args['keyword'];
        if (typeof keyword !== 'string' || !keyword.trim()) {
          return 'Error: search keyword is required';
        }

        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 10;

        try {
          const client = createKEGGClient();
          const result = await client.searchPathways(keyword.trim(), 'hsa', { limit: maxResults });

          if (result.items.length === 0) {
            return `No pathways found for: ${keyword}`;
          }

          const lines: string[] = [
            `**Pathway Search Results** (${result.items.length} found)`,
            '',
          ];

          for (const pathway of result.items) {
            lines.push(`### ${pathway.name}`);
            lines.push(`- **ID:** ${pathway.id}`);
            lines.push(`- **Database:** KEGG`);

            if (pathway.category) {
              lines.push(`- **Category:** ${pathway.category.replace(/_/g, ' ')}`);
            }

            if (pathway.genes && pathway.genes.length > 0) {
              lines.push(`- **Genes:** ${pathway.genes.length}`);
              const geneList = pathway.genes.slice(0, 10).join(', ');
              lines.push(`  ${geneList}${pathway.genes.length > 10 ? '...' : ''}`);
            }

            if (pathway.url) {
              lines.push(`- **Link:** ${pathway.url}`);
            }

            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching pathways: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetPathwayDetails',
      description: 'Get detailed information about a specific KEGG pathway',
      parameters: {
        type: 'object',
        properties: {
          pathwayId: {
            type: 'string',
            description: 'KEGG pathway ID (e.g., "hsa05200" for pathways in cancer)',
          },
        },
        required: ['pathwayId'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const pathwayId = args['pathwayId'];
        if (typeof pathwayId !== 'string' || !pathwayId.trim()) {
          return 'Error: pathway ID is required';
        }

        try {
          const client = createKEGGClient();
          const pathway = await client.getPathway(pathwayId.trim());

          if (!pathway) {
            return `Pathway not found: ${pathwayId}`;
          }

          const lines: string[] = [
            `# ${pathway.name}`,
            '',
            `**KEGG ID:** ${pathway.id}`,
          ];

          if (pathway.category) {
            lines.push(`**Category:** ${pathway.category.replace(/_/g, ' ')}`);
          }

          if (pathway.description) {
            lines.push('', '## Description', pathway.description);
          }

          if (pathway.genes && pathway.genes.length > 0) {
            lines.push('', `## Genes in Pathway (${pathway.genes.length})`);

            // Group genes by showing first 30
            const displayGenes = pathway.genes.slice(0, 30);
            lines.push(displayGenes.join(', '));

            if (pathway.genes.length > 30) {
              lines.push(`... and ${pathway.genes.length - 30} more`);
            }
          }

          if (pathway.url) {
            lines.push('', `**KEGG Map:** ${pathway.url}`);
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching pathway: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'FindPathwaysForGene',
      description: 'Find all pathways that a specific gene is involved in',
      parameters: {
        type: 'object',
        properties: {
          gene: {
            type: 'string',
            description: 'Gene symbol (e.g., "TP53", "BRCA1", "EGFR")',
          },
        },
        required: ['gene'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const gene = args['gene'];
        if (typeof gene !== 'string' || !gene.trim()) {
          return 'Error: gene symbol is required';
        }

        try {
          const client = createKEGGClient();
          const pathways = await client.findPathwaysForGene(gene.trim().toUpperCase());

          if (pathways.length === 0) {
            return `No pathways found for gene: ${gene}`;
          }

          const lines: string[] = [
            `**Pathways Involving ${gene.toUpperCase()}** (${pathways.length} found)`,
            '',
          ];

          for (const pathway of pathways) {
            lines.push(`- **${pathway.id}**: ${pathway.name || 'Unknown'}`);
          }

          lines.push('', 'Use GetPathwayDetails to get more information about a specific pathway.');

          return lines.join('\n');
        } catch (error) {
          return `Error finding pathways: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetCancerPathways',
      description: 'Get a list of cancer-related biological pathways from KEGG',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      handler: async () => {
        try {
          const client = createKEGGClient();
          const pathways = await client.getCancerPathways();

          if (pathways.length === 0) {
            return 'No cancer pathways found';
          }

          const lines: string[] = [
            `**Cancer-Related Pathways** (${pathways.length} found)`,
            '',
            'These pathways are involved in cancer development, progression, and treatment response.',
            '',
          ];

          // Group by category if available
          const byCategory = new Map<string, typeof pathways>();
          for (const p of pathways) {
            const cat = p.category ?? 'other';
            if (!byCategory.has(cat)) {
              byCategory.set(cat, []);
            }
            byCategory.get(cat)!.push(p);
          }

          for (const [category, categoryPathways] of byCategory) {
            lines.push(`## ${category.replace(/_/g, ' ').charAt(0).toUpperCase() + category.slice(1)}`);
            for (const pathway of categoryPathways) {
              lines.push(`- **${pathway.id}**: ${pathway.name}`);
            }
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching cancer pathways: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetPathwayGenes',
      description: 'Get all genes involved in a specific pathway',
      parameters: {
        type: 'object',
        properties: {
          pathwayId: {
            type: 'string',
            description: 'KEGG pathway ID',
          },
        },
        required: ['pathwayId'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const pathwayId = args['pathwayId'];
        if (typeof pathwayId !== 'string' || !pathwayId.trim()) {
          return 'Error: pathway ID is required';
        }

        try {
          const client = createKEGGClient();
          const genes = await client.getPathwayGenes(pathwayId.trim());

          if (genes.length === 0) {
            return `No genes found in pathway: ${pathwayId}`;
          }

          const lines: string[] = [
            `**Genes in Pathway ${pathwayId}** (${genes.length} genes)`,
            '',
            genes.join(', '),
          ];

          return lines.join('\n');
        } catch (error) {
          return `Error fetching pathway genes: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
