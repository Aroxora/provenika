// Keyless OSINT fast-path for cancer-cli.
//
// The documented research one-liners ("search literature X", "find clinical trials X",
// "analyze gene X", "pathway analysis X", "find drug targets X") are deterministic
// public-database lookups — they should NOT require an LLM/API key. This module
// recognizes those patterns and dispatches them straight to the corresponding cancer
// tool's handler (which calls the public API directly), printing the result. Anything
// that doesn't match falls through to the normal LLM agent path.

import { createCancerTools } from '../tools/cancer/index.js';

interface OsintRule {
  re: RegExp; // captures the payload in group 1
  tool: string; // cancer tool name (see createCancerTools)
  arg: string; // the handler arg the payload maps to
  source: string; // public source, for error messages
}

const RULES: OsintRule[] = [
  { re: /^search\s+literature\s+(.+)$/i, tool: 'PubMedSearch', arg: 'query', source: 'PubMed' },
  { re: /^(?:find|search)\s+clinical\s+trials?\s+(?:for\s+|on\s+)?(.+)$/i, tool: 'ClinicalTrialSearch', arg: 'condition', source: 'ClinicalTrials.gov' },
  { re: /^analyze\s+gene\s+(.+)$/i, tool: 'GetProteinInfo', arg: 'gene', source: 'UniProt' },
  { re: /^pathway\s+analysis\s+(.+)$/i, tool: 'FindPathwaysForGene', arg: 'gene', source: 'KEGG' },
  { re: /^find\s+drug\s+targets?\s+(?:for\s+|in\s+)?(.+)$/i, tool: 'FindDrugsForTarget', arg: 'target', source: 'ChEMBL' },
];

export interface OsintMatch {
  rule: OsintRule;
  payload: string;
}

/** Match a free-text query against the keyless research patterns. Pure; testable. */
export function matchOsintQuery(query: string): OsintMatch | null {
  const q = (query ?? '').trim();
  for (const rule of RULES) {
    const m = rule.re.exec(q);
    if (m && m[1]?.trim()) return { rule, payload: m[1].trim() };
  }
  return null;
}

/** Positional (non-flag) tokens joined — mirrors quickMode's prompt parser, and
 *  skips the value of flags that take one (--key, --key-name, --profile). */
export function extractPrompt(argv: string[]): string {
  const valueFlags = new Set(['--key', '--key-name', '--profile', '-p']);
  const tokens: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t) continue;
    if (valueFlags.has(t)) {
      i += 1; // skip the flag's value
      continue;
    }
    if (t.startsWith('-')) continue; // any other flag (incl. --flag=value)
    tokens.push(t);
  }
  return tokens.join(' ').trim();
}

/**
 * If argv's prompt is one of the documented keyless research commands, run it directly
 * against the data-source tool and return true. Otherwise return false (the caller then
 * falls through to the LLM agent path). No API key required.
 */
export async function runOsintMode(argv: string[]): Promise<boolean> {
  const match = matchOsintQuery(extractPrompt(argv));
  if (!match) return false;

  const tool = createCancerTools().find(
    (t: { name?: string }) => t.name === match.rule.tool,
  ) as { handler?: (args: Record<string, unknown>) => unknown | Promise<unknown> } | undefined;
  if (!tool?.handler) return false; // tool missing/renamed — let the agent handle it

  try {
    const out = await tool.handler({ [match.rule.arg]: match.payload });
    const text = typeof out === 'string' ? out : JSON.stringify(out, null, 2);
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
  } catch (err) {
    process.stderr.write(
      `Live ${match.rule.source} query failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
  return true;
}
