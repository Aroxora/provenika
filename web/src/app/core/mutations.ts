// Mutation/variant parsing — browser mirror of cad/mutations.py so the web triage handles an
// allele-specific oncology query ("KRAS G12C", "EGFR L858R/T790M") the same way the CLI does.
// Non-alphanumeric lookarounds (not \b, which can't anchor next to '*') keep it from firing inside
// ordinary gene names like MAP2K1 / PIK3CA while still matching a free-standing G12C or stop Q61*.

const AA = 'ACDEFGHIKLMNPQRSTVWY*';
const MUT = new RegExp(`(?<![A-Za-z0-9])([${AA}])(\\d{1,4})([${AA}])(?![A-Za-z0-9])`, 'g');

/** All mutation tokens in a string, upper-cased. 'KRAS G12C' -> {'G12C'}; 'EGFR' -> {}. */
export function parseVariants(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  for (const m of text.toUpperCase().matchAll(MUT)) out.add(m[0]);
  return out;
}

/** The bare gene/protein name with mutation tokens removed. 'KRAS G12C' -> 'KRAS'. */
export function stripVariants(text: string): string {
  if (!text) return text;
  const cleaned = text.replace(MUT, ' ').replace(/[\s/,;]+/g, ' ').trim();
  return cleaned || text.trim();
}

/** requested ⊆ record (set-superset): handles ChEMBL combination assays like 'C797S,L858R'. */
export function variantMatches(requested: Set<string>, recordText: string | null | undefined): boolean {
  const rec = parseVariants(recordText ?? '');
  for (const v of requested) if (!rec.has(v)) return false;
  return true;
}
