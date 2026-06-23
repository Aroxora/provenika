#!/usr/bin/env node
/**
 * Cheminformatics data-contract check (Python producer ↔ TS consumer).
 *
 * The /explore PAINS/Brenk data is produced by cad/precompute_site_data.py and consumed by
 * the web app as the `ChemInfo` interface — a cross-language seam with no other test, where a
 * renamed field would silently blank the display. This reads ChemInfo's REQUIRED fields
 * straight from the TS interface (so the check can't drift from the consumer), then asserts
 * every committed precomputed compound conforms. Exit 1 on mismatch. Run in CI.
 *
 *   node cicd/check_cheminformatics_contract.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IFACE = path.join(ROOT, 'web', 'src', 'app', 'core', 'cheminformatics.service.ts');
const DATA = path.join(ROOT, 'web', 'public', 'data', 'cheminformatics');

function requiredFields() {
  const src = fs.readFileSync(IFACE, 'utf-8');
  const block = src.match(/export interface ChemInfo\s*\{([\s\S]*?)\}/);
  if (!block) {
    console.error('Could not find the ChemInfo interface in', IFACE);
    process.exit(2);
  }
  const fields = [];
  for (const decl of block[1].split(/[;\n]/)) {
    const m = decl.trim().match(/^([A-Za-z0-9_]+)(\??):\s*([A-Za-z0-9_$.<>[\] ]+)$/);
    if (!m) continue;
    const [, name, optional, type] = m;
    if (optional === '?') continue; // optional fields aren't part of the hard contract
    fields.push({ name, type: type.trim() });
  }
  return fields;
}
function typeOk(type, val) {
  if (type.endsWith('[]')) return Array.isArray(val);
  if (type === 'number') return typeof val === 'number';
  if (type === 'string') return typeof val === 'string';
  if (type === 'boolean') return typeof val === 'boolean';
  return val !== undefined; // unknown type → just require presence
}

const required = requiredFields();
if (!fs.existsSync(path.join(DATA, 'index.json'))) {
  console.log('No precomputed cheminformatics data committed — nothing to check.');
  process.exit(0);
}
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf-8'));
const errors = [];
let files = 0;
let compounds = 0;
for (const t of index.targets || []) {
  const fp = path.join(DATA, t.file);
  if (!fs.existsSync(fp)) {
    errors.push(`index.json references a missing file: ${t.file}`);
    continue;
  }
  const payload = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  for (const [id, c] of Object.entries(payload.byChembl || {})) {
    for (const f of required) {
      if (!(f.name in c) || !typeOk(f.type, c[f.name])) {
        errors.push(`${t.file}:${id} — field '${f.name}' (${f.type}) missing or wrong type`);
      }
    }
    compounds += 1;
  }
  files += 1;
}

console.log(
  `Cheminformatics contract: ${compounds} compounds across ${files} file(s) checked against ` +
  `${required.length} required ChemInfo fields (${required.map((f) => f.name).join(', ')}).`,
);
if (errors.length) {
  console.error(`❌ ${errors.length} contract violation(s) — producer/consumer have drifted:`);
  for (const e of errors.slice(0, 20)) console.error('  ' + e);
  console.error('\nFix cad/precompute_site_data.py (or ChemInfo) and regenerate the data.');
  process.exit(1);
}
console.log('✅ Every precomputed compound matches the ChemInfo contract the web /explore consumes.');
