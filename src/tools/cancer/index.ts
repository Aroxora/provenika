/**
 * Cancer Research Tools
 *
 * Comprehensive toolset for cancer research, drug discovery, and clinical analysis.
 */

import type { ToolDefinition } from '../../core/toolRuntime.js';

// Import all tool creators
import { createPubMedTools } from './literature/pubmedTools.js';
import { createClinicalTrialTools } from './clinical/trialTools.js';
import { createVariantTools } from './genomics/variantTools.js';
import { createTargetTools } from './drug-discovery/targetTools.js';
import { createPathwayTools } from './pathway/pathwayTools.js';
import { createBiomarkerTools } from './patient/biomarkerTools.js';
import { createTreatmentTools } from './patient/treatmentTools.js';
import { createResearchTools } from './research/researchTools.js';
import { createCurativeTools } from './biotech/curativeTools.js';
import { createCADTools } from './discovery/cadTools.js';
import { createOralTherapyTools } from './discovery/oralTherapyTools.js';
import { createGapAnalysisTools } from './discovery/gapAnalysisTools.js';
import { createOralDrugPipelineTools } from './discovery/oralDrugPipeline.js';

// Re-export individual tool modules
export * from './literature/index.js';
export * from './clinical/index.js';
export * from './genomics/index.js';
export * from './drug-discovery/index.js';
export * from './pathway/index.js';
export * from './patient/index.js';
export * from './research/index.js';
export * from './biotech/index.js';
export * from './discovery/index.js';

/**
 * Create all cancer research tools
 *
 * @param tavilyApiKey - Optional Tavily API key for research tools
 */
export function createCancerTools(tavilyApiKey?: string): ToolDefinition[] {
  return [
    ...createPubMedTools(),
    ...createClinicalTrialTools(),
    ...createVariantTools(),
    ...createTargetTools(),
    ...createPathwayTools(),
    ...createBiomarkerTools(),
    ...createTreatmentTools(),
    ...createResearchTools(tavilyApiKey),
    ...createCurativeTools(tavilyApiKey),
    ...createCADTools(tavilyApiKey),
    ...createOralTherapyTools(tavilyApiKey),
    ...createGapAnalysisTools(tavilyApiKey),
    ...createOralDrugPipelineTools(),
  ];
}

/**
 * Create tools by category
 */
export const CancerToolCategories = {
  literature: createPubMedTools,
  clinical: createClinicalTrialTools,
  genomics: createVariantTools,
  drugDiscovery: createTargetTools,
  pathway: createPathwayTools,
  patient: () => [...createBiomarkerTools(), ...createTreatmentTools()],
  research: createResearchTools,
  curativeBiotech: createCurativeTools,
  cad: createCADTools,
  oralTherapy: createOralTherapyTools,
  gapAnalysis: createGapAnalysisTools,
  oralDrugPipeline: createOralDrugPipelineTools,
} as const;

/**
 * Get tool names by category
 */
export function getToolNamesByCategory(tavilyApiKey?: string): Record<string, string[]> {
  return {
    literature: createPubMedTools().map(t => t.name),
    clinical: createClinicalTrialTools().map(t => t.name),
    genomics: createVariantTools().map(t => t.name),
    drugDiscovery: createTargetTools().map(t => t.name),
    pathway: createPathwayTools().map(t => t.name),
    patient: [...createBiomarkerTools(), ...createTreatmentTools()].map(t => t.name),
    research: createResearchTools(tavilyApiKey).map(t => t.name),
    curativeBiotech: createCurativeTools(tavilyApiKey).map(t => t.name),
    cad: createCADTools(tavilyApiKey).map(t => t.name),
    oralTherapy: createOralTherapyTools(tavilyApiKey).map(t => t.name),
    gapAnalysis: createGapAnalysisTools(tavilyApiKey).map(t => t.name),
    oralDrugPipeline: createOralDrugPipelineTools().map(t => t.name),
  };
}
