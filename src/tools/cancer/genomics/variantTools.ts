/**
 * Variant Analysis Tools
 *
 * Tools for analyzing mutations and variants in cancer genomics
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createCBioPortalClient } from '../../../datasources/genomics/cbioportalClient.js';

/**
 * Create variant analysis tools
 */
export function createVariantTools(): ToolDefinition[] {
  return [
    {
      name: 'GetGeneMutations',
      description: 'Get mutations for a gene from cBioPortal cancer studies. Returns mutation types, frequencies, and sample information.',
      parameters: {
        type: 'object',
        properties: {
          gene: {
            type: 'string',
            description: 'Gene symbol (e.g., "BRCA1", "TP53", "EGFR")',
          },
          study: {
            type: 'string',
            description: 'cBioPortal study ID (optional, e.g., "brca_tcga_pan_can_atlas_2018"). If not provided, uses a default breast cancer study.',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum mutations to return (default: 25)',
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

        const studyId = typeof args['study'] === 'string'
          ? args['study']
          : 'brca_tcga_pan_can_atlas_2018'; // Default to TCGA breast cancer

        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 25;

        try {
          const client = createCBioPortalClient();

          const result = await client.getMutations(studyId, gene.trim().toUpperCase(), {
            limit: maxResults,
          });

          if (result.items.length === 0) {
            return `No mutations found for ${gene} in study ${studyId}`;
          }

          // Aggregate mutation types
          const mutationCounts = new Map<string, number>();
          const proteinChanges = new Map<string, number>();

          for (const mut of result.items) {
            const type = mut.consequence;
            mutationCounts.set(type, (mutationCounts.get(type) ?? 0) + 1);

            if (mut.proteinChange?.hgvsProtein) {
              const pc = mut.proteinChange.hgvsProtein;
              proteinChanges.set(pc, (proteinChanges.get(pc) ?? 0) + 1);
            }
          }

          const lines: string[] = [
            `**${gene} Mutations in ${studyId}**`,
            `Total: ${result.total} mutations`,
            '',
            '## Mutation Type Distribution',
          ];

          const sortedTypes = [...mutationCounts.entries()].sort((a, b) => b[1] - a[1]);
          for (const [type, count] of sortedTypes) {
            const pct = ((count / result.items.length) * 100).toFixed(1);
            lines.push(`- ${type.replace(/_/g, ' ')}: ${count} (${pct}%)`);
          }

          // Top protein changes
          const topChanges = [...proteinChanges.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          if (topChanges.length > 0) {
            lines.push('', '## Top Protein Changes');
            for (const [change, count] of topChanges) {
              lines.push(`- ${change}: ${count} occurrences`);
            }
          }

          // Sample mutations
          lines.push('', '## Sample Mutations');
          for (const mut of result.items.slice(0, 10)) {
            const protein = mut.proteinChange?.hgvsProtein ?? 'N/A';
            lines.push(`- **${protein}** (${mut.consequence})`);
            lines.push(`  Sample: ${mut.sampleId}`);
            if (mut.variantAlleleFrequency !== undefined) {
              lines.push(`  VAF: ${(mut.variantAlleleFrequency * 100).toFixed(1)}%`);
            }
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching mutations: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'ListCancerStudies',
      description: 'List available cancer studies from cBioPortal with sample counts',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Filter by cancer type (e.g., "breast", "lung", "colorectal")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum studies to return (default: 20)',
          },
        },
        additionalProperties: false,
      },
      handler: async (args) => {
        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 20;

        try {
          const client = createCBioPortalClient();
          let studies = await client.getStudies();

          // Filter by cancer type if specified
          if (typeof args['cancerType'] === 'string') {
            const filter = args['cancerType'].toLowerCase();
            studies = studies.filter(s =>
              s.cancerType.toLowerCase().includes(filter) ||
              s.name.toLowerCase().includes(filter) ||
              s.cancerTypeId.toLowerCase().includes(filter)
            );
          }

          // Sort by sample count
          studies.sort((a, b) => b.allSampleCount - a.allSampleCount);
          studies = studies.slice(0, maxResults);

          if (studies.length === 0) {
            return 'No studies found matching criteria';
          }

          const lines: string[] = [
            `**Cancer Studies** (${studies.length} results)`,
            '',
          ];

          for (const study of studies) {
            lines.push(`### ${study.name}`);
            lines.push(`- **ID:** ${study.studyId}`);
            lines.push(`- **Cancer Type:** ${study.cancerType}`);
            lines.push(`- **Samples:** ${study.allSampleCount}`);
            if (study.pmid) {
              lines.push(`- **Publication:** PMID ${study.pmid}`);
            }
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching studies: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetCopyNumberAlterations',
      description: 'Get copy number alterations (amplifications/deletions) for a gene in cancer samples',
      parameters: {
        type: 'object',
        properties: {
          gene: {
            type: 'string',
            description: 'Gene symbol (e.g., "ERBB2", "MYC", "PTEN")',
          },
          study: {
            type: 'string',
            description: 'cBioPortal study ID (optional)',
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

        const studyId = typeof args['study'] === 'string'
          ? args['study']
          : 'brca_tcga_pan_can_atlas_2018';

        try {
          const client = createCBioPortalClient();
          const cnas = await client.getCopyNumberAlterations(studyId, gene.trim().toUpperCase());

          if (cnas.length === 0) {
            return `No copy number data found for ${gene} in study ${studyId}`;
          }

          // Aggregate by alteration type
          const counts = new Map<string, number>();
          for (const cna of cnas) {
            counts.set(cna.alteration, (counts.get(cna.alteration) ?? 0) + 1);
          }

          const lines: string[] = [
            `**${gene} Copy Number Alterations**`,
            `Study: ${studyId}`,
            `Total samples: ${cnas.length}`,
            '',
            '## Distribution',
          ];

          const order = ['amplification', 'gain', 'diploid', 'shallow_deletion', 'deep_deletion'];
          for (const alt of order) {
            const count = counts.get(alt) ?? 0;
            if (count > 0) {
              const pct = ((count / cnas.length) * 100).toFixed(1);
              lines.push(`- ${alt.replace(/_/g, ' ')}: ${count} (${pct}%)`);
            }
          }

          // Highlight significant alterations
          const amplified = counts.get('amplification') ?? 0;
          const deleted = counts.get('deep_deletion') ?? 0;

          if (amplified > 0 || deleted > 0) {
            lines.push('', '## Clinical Significance');
            if (amplified > 0) {
              lines.push(`- ${gene} amplification detected in ${amplified} samples - may indicate oncogenic driver`);
            }
            if (deleted > 0) {
              lines.push(`- ${gene} deep deletion detected in ${deleted} samples - may indicate tumor suppressor loss`);
            }
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching CNA data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetMutationFrequency',
      description: 'Get mutation frequency of a gene across multiple cancer studies',
      parameters: {
        type: 'object',
        properties: {
          gene: {
            type: 'string',
            description: 'Gene symbol (e.g., "TP53", "KRAS")',
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
          const client = createCBioPortalClient();
          const frequencies = await client.getMutationFrequency(gene.trim().toUpperCase());

          if (frequencies.length === 0) {
            return `No frequency data available for ${gene}`;
          }

          const lines: string[] = [
            `**${gene} Mutation Frequency Across Studies**`,
            '',
          ];

          // Sort by frequency
          frequencies.sort((a, b) => b.frequency - a.frequency);

          for (const freq of frequencies) {
            const pct = (freq.frequency * 100).toFixed(1);
            lines.push(`- **${freq.studyId}**: ${pct}% (${freq.sampleCount} samples)`);
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching frequency data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
