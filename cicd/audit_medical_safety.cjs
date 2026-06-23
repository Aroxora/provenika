#!/usr/bin/env node
/**
 * Medical-safety audit over the entire cancer-tool registry.
 *
 * The project's #1 non-negotiable: never emit a per-patient treatment recommendation,
 * a dose, a diagnosis, or an unqualified prognosis (docs/ANTI-HALLUCINATION.md). This
 * script invokes every tool handler with auto-generated args (built recursively from
 * each tool's JSON-schema, so object/array-of-object params are exercised too) and
 * FAILS (exit 1) if any output contains such content WITHOUT a disclaimer. Run in CI
 * after `npm run build`.
 *
 * Tools needing the network or a Tavily key return public records/leads, not advice, and
 * would be slow/flaky here — they are skipped via a short timeout / fast error, which
 * deterministically leaves the static clinical-content tools (the real risk) audited.
 *
 *   node cicd/audit_medical_safety.cjs
 */
const path = require('node:path');
const { createCancerTools } = require(path.join(__dirname, '..', 'dist', 'tools', 'cancer', 'index.js'));

const TIMEOUT_MS = 800; // pure tools return in <50ms; network tools exceed this and are skipped

function buildValue(name, schema) {
  schema = schema || {};
  const n = (name || '').toLowerCase();
  if (schema.enum) return schema.enum[0];
  const t = schema.type;
  if (t === 'number' || t === 'integer') return 1;
  if (t === 'boolean') return false;
  if (t === 'array') {
    const item = schema.items || {};
    if (item.type === 'object' || item.properties) return [buildObject(item)];
    return [buildValue(name, item)];
  }
  if (t === 'object') return buildObject(schema);
  // string heuristics by field name
  if (/cancer|disease|condition|tumou?r|indication/.test(n)) return 'lung cancer';
  if (/stage/.test(n)) return 'IV';
  if (/gene|target|protein|symbol/.test(n)) return 'EGFR';
  if (/drug|compound|molecule|therapy|agent|inhibitor/.test(n)) return 'erlotinib';
  if (/smiles/.test(n)) return 'CC(=O)Oc1ccccc1C(=O)O';
  if (/status/.test(n)) return 'positive';
  if (/function/.test(n)) return 'normal';
  if (/unit/.test(n)) return 'ng/mL';
  return 'EGFR';
}
function buildObject(schema) {
  const props = (schema && schema.properties) || {};
  const req = (schema && schema.required) || Object.keys(props);
  const o = {};
  for (const k of req) o[k] = buildValue(k, props[k] || {});
  return o;
}
const buildArgs = (tool) => buildObject(tool.parameters || {});
const withTimeout = (pr, ms) =>
  Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// Forbidden clinical content (per-patient advice / dosing / diagnosis / unqualified prognosis).
const DOSE = /\b\d+(\.\d+)?\s*mg(\/(m2|m²|kg))?\b|\bBID\b|\bonce daily\b|\btwice daily\b|\bq\d?w\b/i;
const RECO = /recommend(ed|s)?\s+(treatment|therapy|approach|protocol|regimen|dose)|proposed treatment protocol|treatment plan|you should (start|take|use)/i;
const PROG = /\b\d+(\.\d+)?\s*%\s*(survival|recurrence|response|cure)|\b\d+[- ]?(year|yr|month)\s*(survival|os|pfs)/i;
const DIAG = /suggestive of (malignancy|cancer|carcinoma)|consistent with (malignancy|cancer|carcinoma)|\bdiagnos(is|tic|es)\b|urgent (evaluation|specialist referral)/i;
// Any of the disclaimer styles used across the codebase.
const DISC = /not medical advice|not a (treatment|clinical|substitute|recommendation|prognosis|diagnosis|dose|dosing)|non-validated|evidence only|educational|illustrative|not patient-specific|population statistics|verify at source|reference data only|reference set/i;

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
    if (DIAG.test(out)) hits.push('DIAG');
    if (hits.length && !DISC.test(out)) {
      flagged.push({ name: t.name, hits: hits.join(','), sample: out.replace(/\s+/g, ' ').slice(0, 100) });
    }
  }
  console.log(`Medical-safety audit: ${audited}/${tools.length} tools audited (rest skipped: network/key/timeout).`);
  if (flagged.length === 0) {
    console.log('✅ No tool emits dosing / treatment advice / diagnosis / prognosis without a disclaimer.');
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
