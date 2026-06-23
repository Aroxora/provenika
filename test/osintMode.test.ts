import { matchOsintQuery, extractPrompt } from '../src/headless/osintMode.js';

// The keyless OSINT fast-path turns the documented research one-liners into direct,
// no-API-key data-source lookups. These tests pin the pattern→tool routing and the
// argv prompt extraction so a regression can't silently re-break the keyless promise.
describe('osintMode keyless dispatcher', () => {
  describe('matchOsintQuery', () => {
    it('routes each documented command to the right tool + payload', () => {
      expect(matchOsintQuery('search literature EGFR lung cancer')).toMatchObject({
        rule: { tool: 'PubMedSearch', arg: 'query' },
        payload: 'EGFR lung cancer',
      });
      expect(matchOsintQuery('find clinical trials melanoma')).toMatchObject({
        rule: { tool: 'ClinicalTrialSearch', arg: 'condition' },
        payload: 'melanoma',
      });
      expect(matchOsintQuery('analyze gene TP53')).toMatchObject({
        rule: { tool: 'GetProteinInfo', arg: 'gene' },
        payload: 'TP53',
      });
      expect(matchOsintQuery('pathway analysis BRAF')).toMatchObject({
        rule: { tool: 'FindPathwaysForGene', arg: 'gene' },
        payload: 'BRAF',
      });
      expect(matchOsintQuery('find drug targets EGFR')).toMatchObject({
        rule: { tool: 'FindDrugsForTarget', arg: 'target' },
        payload: 'EGFR',
      });
      expect(matchOsintQuery('find targets for disease melanoma')).toMatchObject({
        rule: { tool: 'FindTargetsForDisease', arg: 'disease' },
        payload: 'melanoma',
      });
    });

    it('disambiguates "drug targets <gene>" (ChEMBL) from "targets for disease <name>" (Open Targets)', () => {
      // The two target rules must not collide: "drug" → ChEMBL, "for disease" → Open Targets.
      expect(matchOsintQuery('find drug targets BRAF')?.rule.tool).toBe('FindDrugsForTarget');
      expect(matchOsintQuery('find targets for disease lung adenocarcinoma')).toMatchObject({
        rule: { tool: 'FindTargetsForDisease' },
        payload: 'lung adenocarcinoma',
      });
      expect(matchOsintQuery('targets for disease breast carcinoma')?.payload).toBe(
        'breast carcinoma',
      );
    });

    it('is case-insensitive, trims, and strips a leading "for"/"on"', () => {
      expect(matchOsintQuery('  SEARCH LITERATURE  BRCA1 ')?.payload).toBe('BRCA1');
      expect(matchOsintQuery('Find Clinical Trials for pancreatic cancer')?.payload).toBe(
        'pancreatic cancer',
      );
      expect(matchOsintQuery('search clinical trials on glioma')?.payload).toBe('glioma');
    });

    it('returns null for non-research prompts (they fall through to the LLM agent)', () => {
      expect(matchOsintQuery('what is the best treatment for AML')).toBeNull();
      expect(matchOsintQuery('design a CAR-T protocol')).toBeNull();
      expect(matchOsintQuery('search literature')).toBeNull(); // no payload
      expect(matchOsintQuery('')).toBeNull();
    });
  });

  describe('extractPrompt', () => {
    it('joins positional tokens and ignores flags (incl. flag values)', () => {
      expect(extractPrompt(['search literature EGFR'])).toBe('search literature EGFR');
      expect(extractPrompt(['-q', 'analyze gene TP53'])).toBe('analyze gene TP53');
      expect(extractPrompt(['--key', 'SECRET', 'pathway analysis BRAF'])).toBe(
        'pathway analysis BRAF',
      );
      expect(extractPrompt(['--self-test'])).toBe('');
    });
  });
});
