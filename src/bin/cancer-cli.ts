#!/usr/bin/env node
/**
 * Cancer Core Agentic Framework CLI
 *
 * AI-powered platform for cancer research, drug discovery, and clinical analysis
 */

// Fast path: Handle --version, --help, --key before any heavy imports
const rawArgs = process.argv.slice(2);

// Handle --key to set API key
const keyIndex = rawArgs.findIndex(arg => arg === '--key' || arg.startsWith('--key='));
if (keyIndex !== -1) {
  let keyValue: string | undefined;
  let keyName = 'NCBI_API_KEY'; // Default to NCBI

  const arg = rawArgs[keyIndex];
  if (arg?.startsWith('--key=')) {
    keyValue = arg.slice(6);
  } else if (rawArgs[keyIndex + 1] && !rawArgs[keyIndex + 1]?.startsWith('-')) {
    keyValue = rawArgs[keyIndex + 1];
  }

  // Check for --key-name to specify which key
  const keyNameIndex = rawArgs.findIndex(a => a === '--key-name' || a.startsWith('--key-name='));
  if (keyNameIndex !== -1) {
    const nameArg = rawArgs[keyNameIndex];
    if (nameArg?.startsWith('--key-name=')) {
      keyName = nameArg.slice(11).toUpperCase();
    } else if (rawArgs[keyNameIndex + 1]) {
      keyName = rawArgs[keyNameIndex + 1]?.toUpperCase() ?? keyName;
    }
  }

  if (keyValue) {
    import('node:fs').then(fs => {
      import('node:path').then(path => {
        import('node:os').then(os => {
          const secretDir = path.join(os.homedir(), '.agi');
          const secretFile = path.join(secretDir, 'secrets.json');

          try {
            fs.mkdirSync(secretDir, { recursive: true });
            const existing = fs.existsSync(secretFile)
              ? JSON.parse(fs.readFileSync(secretFile, 'utf-8'))
              : {};
            existing[keyName] = keyValue;
            fs.writeFileSync(secretFile, JSON.stringify(existing, null, 2) + '\n');
            console.log(`✓ ${keyName} saved to ~/.agi/secrets.json`);
            process.exit(0);
          } catch (err) {
            console.error('✗ Failed to save key:', err instanceof Error ? err.message : err);
            process.exit(1);
          }
        });
      });
    });
  } else {
    console.error('Usage: cancer-cli --key YOUR_API_KEY [--key-name NCBI_API_KEY]');
    process.exit(1);
  }
} else if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
  import('node:fs').then(fs => {
    import('node:path').then(path => {
      import('node:url').then(url => {
        try {
          const __filename = url.fileURLToPath(import.meta.url);
          const pkgPath = path.resolve(path.dirname(__filename), '../../package.json');
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          console.log(`cancer-core-agentic-framework v${pkg.version || '0.0.0'}`);
        } catch {
          console.log('cancer-core-agentic-framework (version unknown)');
        }
        process.exit(0);
      });
    });
  });
} else if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  console.log(`
Cancer Core Agentic Framework - AI platform for cancer research

Usage: cancer-cli [options] [prompt]

Modes:
  cancer-cli                    Start interactive shell
  cancer-cli "prompt"           Start with initial prompt
  cancer-cli -q "prompt"        Quick mode - single query
  echo "prompt" | cancer-cli    Pipe mode

Research Commands:
  "search literature <topic>"       Search PubMed for publications
  "find clinical trials <cancer>"   Search ClinicalTrials.gov
  "analyze gene <symbol>"           Get gene and mutation data
  "find drug targets <gene>"        Search for drug targets
  "pathway analysis <gene>"         Analyze pathway involvement

Options:
  -v, --version          Show version
  -h, --help             Show this help
  -q, --quick            Quick mode (non-interactive)
  --key KEY              Set API key (default: NCBI_API_KEY)
  --key-name NAME        Specify which key to set
  --self-test            Run connectivity tests

API Keys (set via --key or /secrets command):
  NCBI_API_KEY           PubMed/NCBI E-utilities (free)
  DRUGBANK_API_KEY       DrugBank database (paid)
  COSMIC_API_KEY         COSMIC mutations (registration)
  TAVILY_API_KEY         Web search capability

Commands (in interactive mode):
  /model                 Switch AI model
  /secrets               Manage API keys
  /agents                List available research agents
  /help                  Show commands
  /clear                 Clear screen

Available Agents:
  GenomicsAgent          Mutation analysis, gene expression
  DrugDiscoveryAgent     Drug-target interactions, screening
  LiteratureAgent        Research papers, evidence synthesis
  ClinicalTrialAgent     Trial matching, eligibility analysis
  PatientAnalysisAgent   Biomarkers, treatment recommendations
  PathwayAnalysisAgent   Signaling pathways, network analysis

Examples:
  cancer-cli "Find PARP inhibitors for BRCA1 mutations"
  cancer-cli "Search clinical trials for melanoma immunotherapy"
  cancer-cli "Analyze TP53 mutation pathogenicity"
  cancer-cli "Find drug targets in PI3K/AKT pathway"
`);
  process.exit(0);
} else {
  void main();
}

async function main(): Promise<void> {
  // Force color support for TTY terminals
  if (process.stdout.isTTY && !process.env['NO_COLOR']) {
    process.env['FORCE_COLOR'] = process.env['FORCE_COLOR'] ?? '1';
  }

  // Self-test mode - test API connectivity
  if (rawArgs.includes('--self-test')) {
    await runConnectivityTest();
    return;
  }

  // Quick mode
  if (rawArgs.includes('--quick') || rawArgs.includes('-q')) {
    const { runQuickMode } = await import('../headless/quickMode.js');
    runQuickMode({ argv: rawArgs }).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
    return;
  }

  const isTTY = process.stdin.isTTY && process.stdout.isTTY;

  if (isTTY) {
    // Interactive shell
    const { runInteractiveShell } = await import('../headless/interactiveShell.js');
    runInteractiveShell({ argv: rawArgs }).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
  } else {
    // Pipe mode
    const { runQuickMode } = await import('../headless/quickMode.js');
    runQuickMode({ argv: rawArgs }).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
  }
}

/**
 * Run connectivity tests for cancer research data sources
 */
async function runConnectivityTest(): Promise<void> {
  console.log('\n🧬 Cancer Core - Data Source Connectivity Test\n');
  console.log('Testing connections to scientific databases...\n');

  const tests = [
    {
      name: 'PubMed/NCBI',
      test: async () => {
        const { createPubMedClient } = await import('../datasources/ncbi/pubmedClient.js');
        const client = createPubMedClient();
        return client.testConnection();
      },
    },
    {
      name: 'ClinicalTrials.gov',
      test: async () => {
        const { createClinicalTrialsClient } = await import('../datasources/clinical/clinicalTrialsClient.js');
        const client = createClinicalTrialsClient();
        return client.testConnection();
      },
    },
    {
      name: 'UniProt',
      test: async () => {
        const { createUniProtClient } = await import('../datasources/protein/uniprotClient.js');
        const client = createUniProtClient();
        return client.testConnection();
      },
    },
    {
      name: 'RCSB PDB',
      test: async () => {
        const { createPDBClient } = await import('../datasources/protein/pdbClient.js');
        const client = createPDBClient();
        return client.testConnection();
      },
    },
    {
      name: 'cBioPortal',
      test: async () => {
        const { createCBioPortalClient } = await import('../datasources/genomics/cbioportalClient.js');
        const client = createCBioPortalClient();
        return client.testConnection();
      },
    },
    {
      name: 'KEGG',
      test: async () => {
        const { createKEGGClient } = await import('../datasources/pathway/keggClient.js');
        const client = createKEGGClient();
        return client.testConnection();
      },
    },
    {
      name: 'ChEMBL',
      test: async () => {
        const { createChEMBLClient } = await import('../datasources/drug/chemblClient.js');
        const client = createChEMBLClient();
        return client.testConnection();
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    process.stdout.write(`  ${name.padEnd(20)}`);
    try {
      const success = await test();
      if (success) {
        console.log('✓ Connected');
        passed++;
      } else {
        console.log('✗ Failed');
        failed++;
      }
    } catch (error) {
      console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.log('\nNote: Some APIs (DrugBank, COSMIC) require API keys for full access.');
  console.log('Use "cancer-cli --key YOUR_KEY --key-name KEY_NAME" to configure.');

  process.exit(failed > 0 ? 1 : 0);
}
