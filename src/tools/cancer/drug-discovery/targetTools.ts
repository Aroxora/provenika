/**
 * Drug Target Tools
 *
 * Tools for drug target identification and drug discovery
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import { createChEMBLClient } from '../../../datasources/drug/chemblClient.js';
import { createUniProtClient } from '../../../datasources/protein/uniprotClient.js';

/**
 * Create drug target tools
 */
export function createTargetTools(): ToolDefinition[] {
  return [
    {
      name: 'SearchDrugs',
      description: 'Search ChEMBL for drugs and drug candidates. Returns drug properties, structure, and development status.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Drug name or search term (e.g., "olaparib", "PARP inhibitor", "breast cancer")',
          },
          approvedOnly: {
            type: 'boolean',
            description: 'Only return approved drugs (default: false)',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 10)',
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

        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 10;

        try {
          const client = createChEMBLClient();

          let result;
          if (args['approvedOnly']) {
            result = await client.getApprovedDrugs({ limit: maxResults });
            // Filter by query
            const filtered = result.items.filter(d =>
              d.name.toLowerCase().includes(query.toLowerCase()) ||
              d.synonyms?.some(s => s.toLowerCase().includes(query.toLowerCase()))
            );
            result = { ...result, items: filtered };
          } else {
            result = await client.searchMolecules(query.trim(), { limit: maxResults });
          }

          if (result.items.length === 0) {
            return `No drugs found for: ${query}`;
          }

          const lines: string[] = [
            `**Drug Search Results** (${result.items.length} found)`,
            '',
          ];

          for (const drug of result.items) {
            lines.push(`### ${drug.name}`);
            lines.push(`- **ChEMBL ID:** ${drug.id}`);
            lines.push(`- **Type:** ${drug.type.replace(/_/g, ' ')}`);
            lines.push(`- **Status:** ${drug.status}`);

            if (drug.structure) {
              if (drug.structure.molecularWeight) {
                lines.push(`- **Molecular Weight:** ${drug.structure.molecularWeight.toFixed(2)}`);
              }
              if (drug.structure.molecularFormula) {
                lines.push(`- **Formula:** ${drug.structure.molecularFormula}`);
              }
            }

            if (drug.drugLikeness) {
              lines.push(`- **Lipinski Violations:** ${drug.drugLikeness.lipinskiViolations ?? 'N/A'}`);
            }

            if (drug.synonyms && drug.synonyms.length > 0) {
              lines.push(`- **Also known as:** ${drug.synonyms.slice(0, 3).join(', ')}`);
            }

            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching drugs: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetDrugDetails',
      description: 'Get detailed information about a specific drug from ChEMBL',
      parameters: {
        type: 'object',
        properties: {
          chemblId: {
            type: 'string',
            description: 'ChEMBL ID (e.g., "CHEMBL521")',
          },
        },
        required: ['chemblId'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const chemblId = args['chemblId'];
        if (typeof chemblId !== 'string' || !chemblId.trim()) {
          return 'Error: ChEMBL ID is required';
        }

        try {
          const client = createChEMBLClient();
          const drug = await client.getMolecule(chemblId.trim().toUpperCase());

          if (!drug) {
            return `Drug not found: ${chemblId}`;
          }

          const lines: string[] = [
            `# ${drug.name}`,
            '',
            `**ChEMBL ID:** ${drug.id}`,
            `**Type:** ${drug.type.replace(/_/g, ' ')}`,
            `**Status:** ${drug.status}`,
          ];

          if (drug.drugClass) {
            lines.push(`**Drug Class:** ${drug.drugClass.replace(/_/g, ' ')}`);
          }

          if (drug.synonyms && drug.synonyms.length > 0) {
            lines.push(`**Synonyms:** ${drug.synonyms.join(', ')}`);
          }

          if (drug.structure) {
            lines.push('', '## Chemical Properties');
            if (drug.structure.molecularFormula) {
              lines.push(`- Formula: ${drug.structure.molecularFormula}`);
            }
            if (drug.structure.molecularWeight) {
              lines.push(`- Molecular Weight: ${drug.structure.molecularWeight.toFixed(2)} g/mol`);
            }
            if (drug.structure.smiles) {
              lines.push(`- SMILES: \`${drug.structure.smiles.slice(0, 80)}${drug.structure.smiles.length > 80 ? '...' : ''}\``);
            }
          }

          if (drug.drugLikeness) {
            lines.push('', '## Drug-Likeness');
            const dl = drug.drugLikeness;
            if (dl.lipinskiViolations !== undefined) {
              lines.push(`- Lipinski Rule of 5 Violations: ${dl.lipinskiViolations}`);
            }
            if (dl.logP !== undefined) {
              lines.push(`- LogP: ${dl.logP.toFixed(2)}`);
            }
            if (dl.hbondDonors !== undefined) {
              lines.push(`- H-bond Donors: ${dl.hbondDonors}`);
            }
            if (dl.hbondAcceptors !== undefined) {
              lines.push(`- H-bond Acceptors: ${dl.hbondAcceptors}`);
            }
            if (dl.polarSurfaceArea !== undefined) {
              lines.push(`- Polar Surface Area: ${dl.polarSurfaceArea.toFixed(1)} Å²`);
            }
          }

          if (drug.targets && drug.targets.length > 0) {
            lines.push('', '## Known Targets');
            for (const target of drug.targets.slice(0, 5)) {
              lines.push(`- **${target.targetName}** (${target.action})`);
              if (target.affinity) {
                lines.push(`  Affinity: ${target.affinity} ${target.affinityUnit ?? 'nM'}`);
              }
            }
          }

          return lines.join('\n');
        } catch (error) {
          return `Error fetching drug details: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'FindDrugsForTarget',
      description: 'Find drugs that target a specific protein (by gene name or UniProt ID)',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Gene symbol or UniProt ID (e.g., "EGFR", "P00533")',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 10)',
          },
        },
        required: ['target'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const target = args['target'];
        if (typeof target !== 'string' || !target.trim()) {
          return 'Error: target is required';
        }

        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 10;

        try {
          const chemblClient = createChEMBLClient();
          const uniprotClient = createUniProtClient();

          // If it looks like a gene symbol, try to get UniProt ID
          let uniprotId = target.trim();
          if (!uniprotId.match(/^[A-Z]\d{5}$/)) {
            // Try to find the UniProt ID for this gene
            const protein = await uniprotClient.getByGeneName(uniprotId, 'human');
            if (protein) {
              uniprotId = protein.uniprotId;
            } else {
              return `Could not find protein for gene: ${target}`;
            }
          }

          const drugs = await chemblClient.getDrugsForTarget(uniprotId, { limit: maxResults });

          if (drugs.length === 0) {
            return `No drugs found targeting ${target} (UniProt: ${uniprotId})`;
          }

          const lines: string[] = [
            `**Drugs Targeting ${target}** (UniProt: ${uniprotId})`,
            `Found ${drugs.length} compounds`,
            '',
          ];

          for (const drug of drugs) {
            lines.push(`### ${drug.name}`);
            lines.push(`- ChEMBL: ${drug.id}`);
            lines.push(`- Status: ${drug.status}`);
            lines.push(`- Type: ${drug.type.replace(/_/g, ' ')}`);
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error finding drugs: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'GetProteinInfo',
      description: 'Get detailed protein information from UniProt including structure, domains, and function',
      parameters: {
        type: 'object',
        properties: {
          gene: {
            type: 'string',
            description: 'Gene symbol (e.g., "BRCA1", "EGFR")',
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
          const client = createUniProtClient();
          const protein = await client.getByGeneName(gene.trim().toUpperCase(), 'human');

          if (!protein) {
            return `Protein not found for gene: ${gene}`;
          }

          const lines: string[] = [
            `# ${protein.name}`,
            '',
            `**Gene:** ${protein.geneName}`,
            `**UniProt ID:** ${protein.uniprotId}`,
            `**Organism:** ${protein.organism ?? 'Human'}`,
          ];

          if (protein.sequence) {
            lines.push(`**Length:** ${protein.sequence.length} amino acids`);
          }

          if (protein.function) {
            lines.push('', '## Function', protein.function);
          }

          if (protein.subcellularLocation && protein.subcellularLocation.length > 0) {
            lines.push('', '## Subcellular Location');
            lines.push(protein.subcellularLocation.join(', '));
          }

          if (protein.domains && protein.domains.length > 0) {
            lines.push('', '## Protein Domains');
            for (const domain of protein.domains.slice(0, 10)) {
              lines.push(`- **${domain.name}** (${domain.startPosition}-${domain.endPosition})`);
              if (domain.description) {
                lines.push(`  ${domain.description}`);
              }
            }
          }

          if (protein.structures && protein.structures.length > 0) {
            lines.push('', '## 3D Structures');
            for (const struct of protein.structures.slice(0, 5)) {
              lines.push(`- **${struct.pdbId}** (${struct.method}, ${struct.resolution ? struct.resolution.toFixed(1) + 'Å' : 'N/A'})`);
            }
          }

          if (protein.ptmSites && protein.ptmSites.length > 0) {
            lines.push('', '## Post-Translational Modifications');
            const ptmCounts = new Map<string, number>();
            for (const ptm of protein.ptmSites) {
              ptmCounts.set(ptm.modificationType, (ptmCounts.get(ptm.modificationType) ?? 0) + 1);
            }
            for (const [type, count] of ptmCounts) {
              lines.push(`- ${type}: ${count} sites`);
            }
          }

          lines.push('', `**UniProt Link:** https://www.uniprot.org/uniprotkb/${protein.uniprotId}`);

          return lines.join('\n');
        } catch (error) {
          return `Error fetching protein info: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
    {
      name: 'SearchCancerDrugs',
      description: 'Search for drugs specifically developed for cancer treatment',
      parameters: {
        type: 'object',
        properties: {
          maxResults: {
            type: 'number',
            description: 'Maximum results (default: 15)',
          },
        },
        additionalProperties: false,
      },
      handler: async (args) => {
        const maxResults = typeof args['maxResults'] === 'number' ? args['maxResults'] : 15;

        try {
          const client = createChEMBLClient();
          const result = await client.searchCancerDrugs({ limit: maxResults });

          if (result.items.length === 0) {
            return 'No cancer drugs found';
          }

          const lines: string[] = [
            `**Cancer Drugs from ChEMBL** (${result.items.length} results)`,
            '',
          ];

          for (const drug of result.items) {
            lines.push(`- **${drug.name}** (${drug.id})`);
            lines.push(`  Type: ${drug.type} | Status: ${drug.status}`);
            if (drug.drugClass) {
              lines.push(`  Class: ${drug.drugClass.replace(/_/g, ' ')}`);
            }
            lines.push('');
          }

          return lines.join('\n');
        } catch (error) {
          return `Error searching cancer drugs: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    },
  ];
}
