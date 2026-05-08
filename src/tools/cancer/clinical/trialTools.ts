/**
 * Clinical Trial Tools
 *
 * Tools for searching and analyzing clinical trials
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createClinicalTrialsClient } from '../../../datasources/clinical/clinicalTrialsClient.js';

/**
 * Create clinical trial tools
 */
export function createClinicalTrialTools(): ToolDefinition[] {
  return [
    {
      name: 'ClinicalTrialSearch',
      description: 'Search ClinicalTrials.gov for cancer clinical trials. Find trials by condition, intervention, phase, or location.',
      parameters: {
        type: 'object',
        properties: {
          condition: {
            type: 'string',
            description: 'Cancer type or condition (e.g., "breast cancer", "melanoma")',
          },
          intervention: {
            type: 'string',
            description: 'Drug or treatment name (e.g., "pembrolizumab", "PARP inhibitor")',
          },
          phase: {
            type: 'string',
            enum: ['phase_1', 'phase_2', 'phase_3', 'phase_4'],
            description: 'Trial phase filter (optional)',
          },
          status: {
            type: 'string',
            enum: ['recruiting', 'active_not_recruiting', 'completed', 'not_yet_recruiting'],
            description: 'Trial status filter (default: recruiting)',
          },
          country: {
            type: 'string',
            description: 'Country filter (e.g., "United States")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results to return (default: 10, max: 25)',
          },
        },
        additionalProperties: false,
      },
      handler: async (args) => {
        const condition = args['condition'];
        const intervention = args['intervention'];

        if (!condition && !intervention) {
          return 'Error: Please provide either a condition or intervention to search for';
        }

        const maxResults = Math.min(
          typeof args['maxResults'] === 'number' ? args['maxResults'] : 10,
          25
        );

        try {
          const client = createClinicalTrialsClient();

          const result = await client.search({
            conditions: condition ? [String(condition)] : undefined,
            interventions: intervention ? [String(intervention)] : undefined,
            phase: args['phase'] ? [args['phase'] as any] : undefined,
            status: args['status'] ? [args['status'] as any] : ['recruiting'],
            location: args['country'] ? { country: String(args['country']) } : undefined,
            limit: maxResults,
          });

          if (result.items.length === 0) {
            return `No clinical trials found matching your criteria`;
          }

          const lines: string[] = [
            `**Clinical Trial Search Results** (${result.items.length} of ${result.total})`,
            '',
          ];

          for (const trial of result.items) {
            lines.push(`### ${trial.briefTitle ?? trial.title}`);
            lines.push(`**NCT ID:** ${trial.nctId} | **Status:** ${trial.status.replace(/_/g, ' ')}`);
            lines.push(`**Phase:** ${trial.phase.replace(/_/g, ' ')}`);

            if (trial.conditions.length > 0) {
              lines.push(`**Conditions:** ${trial.conditions.slice(0, 3).join(', ')}`);
            }

            if (trial.interventions.length > 0) {
              const interventions = trial.interventions.slice(0, 3).map(i => `${i.name} (${i.type})`);
              lines.push(`**Interventions:** ${interventions.join(', ')}`);
            }

            if (trial.sponsor) {
              lines.push(`**Sponsor:** ${trial.sponsor.name}`);
            }

            if (trial.locations.length > 0) {
              const locationCount = trial.locations.length;
              const countries = [...new Set(trial.locations.map(l => l.country))];
              lines.push(`**Locations:** ${locationCount} sites in ${countries.slice(0, 3).join(', ')}`);
            }

            if (trial.briefSummary) {
              const summary = trial.briefSummary.length > 300
                ? trial.briefSummary.slice(0, 300) + '...'
                : trial.briefSummary;
              lines.push(`**Summary:** ${summary}`);
            }

            lines.push(`**Link:** ${trial.url}`);
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching clinical trials: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'ClinicalTrialDetails',
      description: 'Get detailed information about a specific clinical trial by NCT ID',
      parameters: {
        type: 'object',
        properties: {
          nctId: {
            type: 'string',
            description: 'NCT identifier (e.g., "NCT04379596")',
          },
        },
        required: ['nctId'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const nctId = args['nctId'];
        if (typeof nctId !== 'string' || !nctId.trim()) {
          return 'Error: NCT ID is required';
        }

        try {
          const client = createClinicalTrialsClient();
          const trial = await client.getByNctId(nctId.trim().toUpperCase());

          if (!trial) {
            return `Trial not found: ${nctId}`;
          }

          const lines: string[] = [
            `# ${trial.officialTitle ?? trial.title}`,
            '',
            `**NCT ID:** ${trial.nctId}`,
            `**Status:** ${trial.status.replace(/_/g, ' ')}`,
            `**Phase:** ${trial.phase.replace(/_/g, ' ')}`,
            `**Study Type:** ${trial.studyType}`,
          ];

          if (trial.primaryPurpose) {
            lines.push(`**Purpose:** ${trial.primaryPurpose.replace(/_/g, ' ')}`);
          }

          if (trial.sponsor) {
            lines.push(`**Sponsor:** ${trial.sponsor.name} (${trial.sponsor.type})`);
          }

          if (trial.enrollmentCount) {
            lines.push(`**Enrollment:** ${trial.enrollmentCount} (${trial.enrollmentType})`);
          }

          if (trial.startDate) {
            lines.push(`**Start Date:** ${trial.startDate}`);
          }

          if (trial.completionDate) {
            lines.push(`**Estimated Completion:** ${trial.completionDate}`);
          }

          // Conditions
          if (trial.conditions.length > 0) {
            lines.push('', '## Conditions');
            for (const condition of trial.conditions) {
              lines.push(`- ${condition}`);
            }
          }

          // Interventions
          if (trial.interventions.length > 0) {
            lines.push('', '## Interventions');
            for (const int of trial.interventions) {
              lines.push(`- **${int.name}** (${int.type})`);
              if (int.description) {
                lines.push(`  ${int.description.slice(0, 200)}`);
              }
            }
          }

          // Eligibility
          if (trial.eligibility) {
            lines.push('', '## Eligibility');
            lines.push(`**Gender:** ${trial.eligibility.gender}`);
            if (trial.eligibility.minimumAge) {
              lines.push(`**Minimum Age:** ${trial.eligibility.minimumAge}`);
            }
            if (trial.eligibility.maximumAge) {
              lines.push(`**Maximum Age:** ${trial.eligibility.maximumAge}`);
            }
            lines.push(`**Healthy Volunteers:** ${trial.eligibility.healthyVolunteers ? 'Yes' : 'No'}`);

            if (trial.eligibility.criteria) {
              const criteria = trial.eligibility.criteria.slice(0, 1000);
              lines.push('', '**Eligibility Criteria:**', criteria);
              if (trial.eligibility.criteria.length > 1000) {
                lines.push('...(truncated)');
              }
            }
          }

          // Outcome measures
          if (trial.outcomeMeasures && trial.outcomeMeasures.length > 0) {
            lines.push('', '## Outcome Measures');
            const primary = trial.outcomeMeasures.filter(o => o.type === 'primary');
            if (primary.length > 0) {
              lines.push('**Primary:**');
              for (const outcome of primary.slice(0, 3)) {
                lines.push(`- ${outcome.measure}`);
                if (outcome.timeFrame) {
                  lines.push(`  Time frame: ${outcome.timeFrame}`);
                }
              }
            }
          }

          // Locations
          if (trial.locations.length > 0) {
            lines.push('', '## Study Locations');
            lines.push(`${trial.locations.length} sites`);
            const byCountry = new Map<string, number>();
            for (const loc of trial.locations) {
              byCountry.set(loc.country, (byCountry.get(loc.country) ?? 0) + 1);
            }
            for (const [country, count] of byCountry) {
              lines.push(`- ${country}: ${count} sites`);
            }
          }

          // Summary
          if (trial.briefSummary) {
            lines.push('', '## Summary', trial.briefSummary);
          }

          lines.push('', `**Full Details:** ${trial.url}`);

          return lines.join('\n');
        } catch (error) {
          return `Error fetching trial details: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'ClinicalTrialsByIntervention',
      description: 'Find clinical trials testing a specific drug or intervention in cancer',
      parameters: {
        type: 'object',
        properties: {
          intervention: {
            type: 'string',
            description: 'Drug or treatment name (e.g., "olaparib", "pembrolizumab")',
          },
          recruitingOnly: {
            type: 'boolean',
            description: 'Only show recruiting trials (default: true)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 10)',
          },
        },
        required: ['intervention'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const intervention = args['intervention'];
        if (typeof intervention !== 'string' || !intervention.trim()) {
          return 'Error: intervention name is required';
        }

        const recruitingOnly = args['recruitingOnly'] !== false;
        const maxResults = Math.min(
          typeof args['maxResults'] === 'number' ? args['maxResults'] : 10,
          25
        );

        try {
          const client = createClinicalTrialsClient();
          const result = await client.searchByIntervention(intervention.trim(), {
            status: recruitingOnly ? ['recruiting'] : undefined,
            limit: maxResults,
          });

          if (result.items.length === 0) {
            return `No trials found for intervention: ${intervention}`;
          }

          const lines: string[] = [
            `**Trials for "${intervention}"** (${result.items.length} of ${result.total})`,
            '',
          ];

          for (const trial of result.items) {
            lines.push(`- **${trial.nctId}** - ${trial.briefTitle ?? trial.title}`);
            lines.push(`  Phase: ${trial.phase} | Status: ${trial.status}`);
            if (trial.conditions.length > 0) {
              lines.push(`  Conditions: ${trial.conditions.slice(0, 2).join(', ')}`);
            }
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching trials: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
