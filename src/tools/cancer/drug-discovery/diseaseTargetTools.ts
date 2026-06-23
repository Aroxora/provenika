/**
 * Disease → Target Tools
 *
 * The gene-first CLI one-liners (FindDrugsForTarget, GetProteinInfo, …) all start from a target.
 * Real triage often starts from a DISEASE: "what are the druggable targets here?" This wraps the
 * keyless Open Targets Platform (the same source the web app uses) to answer that — research only,
 * association evidence, never a treatment recommendation.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createOpenTargetsClient } from '../../../datasources/disease/openTargetsClient.js';

export function createDiseaseTargetTools(): ToolDefinition[] {
  return [
    {
      name: 'FindTargetsForDisease',
      description:
        'Find druggable protein targets associated with a disease, ranked by Open Targets ' +
        'association score (keyless). Research lead generation — association evidence, not a ' +
        'treatment recommendation or proof a target is therapeutically valid.',
      parameters: {
        type: 'object',
        properties: {
          disease: {
            type: 'string',
            description: 'Disease name (e.g., "breast carcinoma", "melanoma", "lung adenocarcinoma")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum targets to return (default: 15)',
          },
        },
        required: ['disease'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const disease = args['disease'];
        if (typeof disease !== 'string' || !disease.trim()) {
          return 'Error: disease is required';
        }
        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 15;

        try {
          const client = createOpenTargetsClient();
          const result = await client.targetsForDisease(disease.trim(), maxResults);

          if (!result) {
            return `No Open Targets disease match for: ${disease}`;
          }
          if (result.targets.length === 0) {
            return `No associated targets found for ${result.diseaseName} (${result.diseaseId}).`;
          }

          const lines: string[] = [
            `**Druggable targets for ${result.diseaseName}** (${result.diseaseId})`,
            `${result.count} associated targets; showing top ${result.targets.length} by Open Targets association score.`,
            '_Research leads (association evidence) — not a treatment recommendation; verify at the source._',
            '',
          ];
          for (const t of result.targets) {
            const drug = t.tractableModalities.length
              ? `tractable: ${t.tractableModalities.join(', ')}`
              : 'no tractability evidence';
            lines.push(`- **${t.symbol}** — ${t.name}  ·  score ${t.score.toFixed(3)}  ·  ${drug}`);
          }
          lines.push(
            '',
            `Source: https://platform.opentargets.org/disease/${result.diseaseId}/associations`,
          );
          return lines.join('\n');
        } catch (error) {
          return `Error querying Open Targets: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
