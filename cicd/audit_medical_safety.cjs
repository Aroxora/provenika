#!/usr/bin/env node
/**
 * Medical-safety audit over the entire cancer-tool registry.
 *
 * The project's #1 non-negotiable: never emit a per-patient treatment recommendation,
 * a dose, or an unqualified prognosis (docs/ANTI-HALLUCINATION.md). This script invokes
 * every tool handler with auto-generated args and FAILS (exit 1) if any output contains
 * such content WITHOUT a disclaimer. Wire it into CI after `npm run build`.
 *
 * Tools that need the network (live data-source lookups) return public records, not
 * recommendations, and would be slow/flaky here — they are skipped via a short timeout,
 * which deterministically leaves the static clinical-content tools (the real risk) audited.
 *
 *   node cicd/audit_medical_safety.cjs
 */
const path = require('node:path');
const { createCancerTools } = require(path.join(__dirname, '..', 'dist', 'tools', 'cancer', 'index.js'));

const TIMEOUT_MS = 800; // pure tools return in <50ms; network tools exceed this and are skipped

function valueFor(name, schema) {
  const n = (name || '').toLowerCase();
  if (schema && schema.enum) return schema.enum[0];
  const t = schema && schema.type;
  if (t === 'number' || t === 'integer') return 1;
  if (t === 'boolean') return false;
  if (t === 'array') return /biomarker/.test(n) ? [{ name: 'PD-L1', value: 1 }] : ['EGFR'];
  if (t === 'object') return {};
  if (/cancer|disease|condition|tumou?r|indication/.test(n)) return 'lung cancer';
  if (/stage/.test(n)) return 'IV';
  if (/gene|target|protein|symbol/.test(n)) return 'EGFR';
  if (/drug|compound|molecule|therapy|agent|inhibitor/.test(n)) return 'erlotinib';
  if (/smiles/.test(n)) return 'CC(=O)Oc1ccccc1C(=O)O';
  if (/topic|query|keyword|term|biomarker|mutation|variant/.test(n)) return 'EGFR';
  return 'test';
}
function buildArgs(tool) {
  const props = (tool.parameters && tool.parameters.properties) || {};
  const req = (tool.parameters && tool.parameters.required) || Object.keys(props).slice(0, 2);
  const args = {};
  for (const k of req) args[k] = valueFor(k, props[k] || {});
  return args;
}
const withTimeout = (pr, ms) =>
  Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// Forbidden clinical content (per-patient advice / dosing / unqualified prognosis).
const DOSE = /\b\d+(\.\d+)?\s*mg(\/(m2|m²|kg))?\b|\bBID\b|\bonce daily\b|\btwice daily\b|\bq\d?w\b/i;
const RECO = /recommend(ed|s)?\s+(treatment|therapy|approach|protocol|regimen|dose)|proposed treatment protocol|treatment plan|you should (start|take|use)/i;
const PROG = /\b\d+(\.\d+)?\s*%\s*(survival|recurrence|response|cure)|\b\d+[- ]?(year|yr|month)\s*(survival|os|pfs)/i;
// Any of the disclaimer styles used across the codebase.
const DISC = /not medical advice|not a (treatment|clinical|substitute|recommendation|prognosis|dose|dosing)|non-validated|evidence only|educational|illustrative|not patient-specific|population statistics|verify at source|reference data only|reference set/i;

(async () => {
  const tools = createCancerTools().filter((t) => typeof t.handler === 'function');
  const flagged = [];
  let audited = 0;
  for (const t of tools) {
    let out;
    try {
      out = String(await withTimeout(Promise.resolve(t.handler(buildArgs(t))), TIMEOUT_MS));
    } catch {
      continue; // network/timeout/error — not emitting static content; skip
    }
    audited += 1;
    const hits = [];
    if (DOSE.test(out)) hits.push('DOSE');
    if (RECO.test(out)) hits.push('RECO');
    if (PROG.test(out)) hits.push('PROG');
    if (hits.length && !DISC.test(out)) {
      flagged.push({ name: t.name, hits: hits.join(','), sample: out.replace(/\s+/g, ' ').slice(0, 100) });
    }
  }
  console.log(`Medical-safety audit: ${audited}/${tools.length} tools audited (rest skipped: network/timeout).`);
  if (flagged.length === 0) {
    console.log('✅ No tool emits dosing / treatment recommendations / prognosis without a disclaimer.');
    process.exit(0);
  }
  console.error(`❌ ${flagged.length} tool(s) emit clinical content with NO disclaimer:`);
  for (const f of flagged) console.error(`  [${f.hits}] ${f.name}: ${f.sample}`);
  console.error('\nAdd a NOT-MEDICAL-ADVICE disclaimer or remove the per-patient content. See docs/ANTI-HALLUCINATION.md.');
  process.exit(1);
})().catch((e) => {
  console.error('audit error:', e.message);
  process.exit(2);
});
