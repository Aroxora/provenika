import { createCancerTools } from '../src/tools/cancer/index.js';

// The project's #1 non-negotiable: never emit a per-patient treatment recommendation,
// dose, or unqualified prognosis (docs/ANTI-HALLUCINATION.md). These tools are the ones
// most likely to drift across that line — pin their runtime output so a regression fails
// CI instead of silently shipping medical advice.

type Tool = { name?: string; handler?: (a: Record<string, unknown>) => unknown | Promise<unknown> };

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  const tool = (createCancerTools() as Tool[]).find((t) => t.name === name);
  if (!tool?.handler) throw new Error(`tool not found: ${name}`);
  return String(await tool.handler(args));
}

const DISCLAIMER = /not medical advice|not a (treatment|clinical|substitute)|non-validated|evidence only|educational|illustrative/i;
// Specific, prescriptive content that must never appear in a patient-facing recommendation.
const PRESCRIBES_THERAPY = /\bprimaryTherapy\b|\bLobectomy\b|\bMastectomy\b|evidenceLevel|\b\d+(\.\d+)?\s*mg\/(m|kg)/i;

describe('medical-safety: no per-patient treatment advice', () => {
  it('RecommendTreatment returns a disclaimer and NO specific therapy recommendation', async () => {
    // Includes stage IV — the case that previously routed to "curative Lobectomy".
    const out = await runTool('RecommendTreatment', {
      cancerType: 'lung',
      stage: 'IV',
      patientFactors: { age: 70 },
    });
    expect(out).toMatch(DISCLAIMER);
    expect(out).not.toMatch(PRESCRIBES_THERAPY);
  });

  it('GetPrognosticAssessment leads with a non-validated disclaimer', async () => {
    const out = await runTool('GetPrognosticAssessment', {
      cancerType: 'lung',
      biomarkers: [{ name: 'PD-L1', value: 1 }],
    });
    expect(out).toMatch(DISCLAIMER);
  });

  it('StratifyRisk stays neutralized (disclaimer, no prescribed therapy)', async () => {
    const out = await runTool('StratifyRisk', { cancerType: 'breast', stage: 'II' });
    expect(out).toMatch(DISCLAIMER);
    expect(out).not.toMatch(PRESCRIBES_THERAPY);
  });

  it('AssessCurativePotential stays neutralized (disclaimer, not a recommendation)', async () => {
    const out = await runTool('AssessCurativePotential', { cancerType: 'lung', stage: 'IV' });
    expect(out).toMatch(DISCLAIMER);
    expect(out).not.toMatch(/recommended (treatment|therapy|approach)/i);
  });

  it('drug-reference tools that show dosing carry a not-a-dose disclaimer', async () => {
    // These legitimately surface label dosing (e.g. "80mg once daily"); they must frame it
    // as a reference, never as a dose for a patient.
    for (const [name, args] of [
      ['GetOralTherapyByTarget', { target: 'EGFR' }],
      ['ListAllOralDrugCandidates', {}],
    ] as const) {
      const out = await runTool(name, args as Record<string, unknown>);
      if (/\b\d+\s*mg\b|\bBID\b|once daily/i.test(out)) {
        expect(out).toMatch(/not medical advice|not a (dose|treatment|recommendation)|reference data only/i);
      }
    }
  });
});
