/**
 * Biomarker Analysis Tools
 *
 * Tools for analyzing cancer biomarkers, interpreting panels, and assessing
 * diagnostic/prognostic markers.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';
import type {
  Biomarker,
  BiomarkerType,
  BiomarkerPanel,
  BiomarkerResult,
} from '../../../domain/clinical/biomarker.js';

/**
 * Analyze a specific biomarker value
 */
function analyzeBiomarker(params: {
  biomarkerName: string;
  value: number;
  unit: string;
  cancerType?: string;
}): {
  biomarker: Partial<Biomarker>;
  interpretation: string;
  clinicalSignificance: string;
  recommendations: string[];
} {
  const { biomarkerName, value, unit, cancerType } = params;

  // Reference ranges for common cancer biomarkers
  const biomarkerRanges: Record<
    string,
    {
      normalMax: number;
      unit: string;
      type: BiomarkerType;
      cancerAssociations: string[];
    }
  > = {
    PSA: {
      normalMax: 4.0,
      unit: 'ng/mL',
      type: 'protein',
      cancerAssociations: ['prostate cancer'],
    },
    'CA-125': {
      normalMax: 35,
      unit: 'U/mL',
      type: 'protein',
      cancerAssociations: ['ovarian cancer', 'endometrial cancer'],
    },
    'CA 19-9': {
      normalMax: 37,
      unit: 'U/mL',
      type: 'protein',
      cancerAssociations: ['pancreatic cancer', 'colorectal cancer'],
    },
    CEA: {
      normalMax: 3.0,
      unit: 'ng/mL',
      type: 'protein',
      cancerAssociations: ['colorectal cancer', 'lung cancer'],
    },
    AFP: {
      normalMax: 10,
      unit: 'ng/mL',
      type: 'protein',
      cancerAssociations: ['hepatocellular carcinoma', 'germ cell tumors'],
    },
    'HER2/neu': {
      normalMax: 15,
      unit: 'ng/mL',
      type: 'protein',
      cancerAssociations: ['breast cancer', 'gastric cancer'],
    },
    'Ki-67': {
      normalMax: 14,
      unit: '%',
      type: 'protein',
      cancerAssociations: ['breast cancer', 'neuroendocrine tumors'],
    },
    LDH: {
      normalMax: 250,
      unit: 'U/L',
      type: 'protein',
      cancerAssociations: ['lymphoma', 'melanoma', 'leukemia'],
    },
  };

  const normalizedName = biomarkerName.toUpperCase().replace(/[_\s-]+/g, '-');
  const reference = biomarkerRanges[normalizedName] || biomarkerRanges[biomarkerName];

  let interpretation: string;
  let clinicalSignificance: string;
  const recommendations: string[] = [];

  if (reference) {
    const ratio = value / reference.normalMax;

    if (ratio <= 1) {
      interpretation = 'Within normal range';
      clinicalSignificance = 'No immediate concern based on this marker alone';
      recommendations.push('Continue routine monitoring as appropriate');
    } else if (ratio <= 2) {
      interpretation = 'Mildly elevated';
      clinicalSignificance = 'May warrant further investigation';
      recommendations.push('Consider repeat testing in 2-4 weeks');
      recommendations.push('Evaluate for non-malignant causes');
    } else if (ratio <= 5) {
      interpretation = 'Moderately elevated';
      clinicalSignificance = 'Suggestive of possible malignancy or significant pathology';
      recommendations.push('Recommend imaging studies');
      recommendations.push('Consider specialist referral');
    } else {
      interpretation = 'Significantly elevated';
      clinicalSignificance = 'Highly suggestive of malignancy';
      recommendations.push('Urgent specialist referral recommended');
      recommendations.push('Comprehensive staging workup indicated');
    }

    if (cancerType) {
      const isAssociated = reference.cancerAssociations.some(
        (c) => c.toLowerCase().includes(cancerType.toLowerCase())
      );
      if (isAssociated) {
        clinicalSignificance += `. This biomarker is specifically associated with ${cancerType}`;
      }
    }
  } else {
    interpretation = 'Reference range not available in database';
    clinicalSignificance = 'Clinical correlation required';
    recommendations.push('Consult laboratory reference ranges');
    recommendations.push('Consider clinical context for interpretation');
  }

  return {
    biomarker: {
      name: biomarkerName,
      type: reference?.type || 'protein',
      normalRange: reference ? { min: 0, max: reference.normalMax, unit: reference.unit } : undefined,
      cancerTypes: reference?.cancerAssociations || [],
    },
    interpretation,
    clinicalSignificance,
    recommendations,
  };
}

/**
 * Interpret a biomarker panel
 */
function interpretPanel(params: {
  panelName: string;
  results: Array<{ name: string; value: number; unit: string }>;
  cancerType?: string;
}): {
  panel: Partial<BiomarkerPanel>;
  overallAssessment: string;
  abnormalMarkers: string[];
  recommendations: string[];
} {
  const { panelName, results, cancerType } = params;

  const analyzedResults: Array<{
    name: string;
    value: number;
    interpretation: string;
    isAbnormal: boolean;
  }> = [];

  const abnormalMarkers: string[] = [];
  const allRecommendations: string[] = [];

  for (const result of results) {
    const analysis = analyzeBiomarker({
      biomarkerName: result.name,
      value: result.value,
      unit: result.unit,
      cancerType,
    });

    const isAbnormal = !analysis.interpretation.toLowerCase().includes('normal');

    analyzedResults.push({
      name: result.name,
      value: result.value,
      interpretation: analysis.interpretation,
      isAbnormal,
    });

    if (isAbnormal) {
      abnormalMarkers.push(`${result.name}: ${analysis.interpretation}`);
      allRecommendations.push(...analysis.recommendations);
    }
  }

  // Deduplicate recommendations
  const uniqueRecommendations = [...new Set(allRecommendations)];

  // Generate overall assessment
  let overallAssessment: string;
  const abnormalCount = abnormalMarkers.length;
  const totalCount = results.length;

  if (abnormalCount === 0) {
    overallAssessment = 'All biomarkers within normal ranges. No immediate oncological concern.';
  } else if (abnormalCount <= totalCount / 3) {
    overallAssessment = `${abnormalCount} of ${totalCount} markers abnormal. Further evaluation recommended.`;
  } else if (abnormalCount <= (2 * totalCount) / 3) {
    overallAssessment = `${abnormalCount} of ${totalCount} markers abnormal. Significant findings requiring prompt investigation.`;
  } else {
    overallAssessment = `${abnormalCount} of ${totalCount} markers abnormal. Pattern highly suggestive of malignancy. Urgent evaluation indicated.`;
  }

  return {
    panel: {
      name: panelName,
      // Note: Actual Biomarker objects would be fetched from database in production
    },
    overallAssessment,
    abnormalMarkers,
    recommendations: uniqueRecommendations,
  };
}

/**
 * Get prognostic assessment based on biomarkers
 */
function getPrognosticAssessment(params: {
  cancerType: string;
  stage?: string;
  biomarkers: Array<{ name: string; value: number; status?: string }>;
}): {
  riskCategory: 'low' | 'intermediate' | 'high';
  prognosticFactors: Array<{ factor: string; impact: 'favorable' | 'unfavorable' | 'neutral' }>;
  summary: string;
} {
  const { cancerType, stage, biomarkers } = params;

  const prognosticFactors: Array<{
    factor: string;
    impact: 'favorable' | 'unfavorable' | 'neutral';
  }> = [];

  // Analyze each biomarker for prognostic significance
  for (const marker of biomarkers) {
    const name = marker.name.toUpperCase();
    const status = marker.status?.toLowerCase();

    if (name.includes('ER') || name.includes('ESTROGEN')) {
      if (status === 'positive' || marker.value > 1) {
        prognosticFactors.push({ factor: 'ER positive', impact: 'favorable' });
      } else {
        prognosticFactors.push({ factor: 'ER negative', impact: 'unfavorable' });
      }
    }

    if (name.includes('PR') || name.includes('PROGESTERONE')) {
      if (status === 'positive' || marker.value > 1) {
        prognosticFactors.push({ factor: 'PR positive', impact: 'favorable' });
      } else {
        prognosticFactors.push({ factor: 'PR negative', impact: 'unfavorable' });
      }
    }

    if (name.includes('HER2')) {
      if (status === 'positive' || status === 'amplified' || marker.value > 2) {
        prognosticFactors.push({ factor: 'HER2 positive', impact: 'unfavorable' });
      } else {
        prognosticFactors.push({ factor: 'HER2 negative', impact: 'favorable' });
      }
    }

    if (name.includes('KI-67') || name.includes('KI67')) {
      if (marker.value > 20) {
        prognosticFactors.push({ factor: `Ki-67 high (${marker.value}%)`, impact: 'unfavorable' });
      } else if (marker.value <= 10) {
        prognosticFactors.push({ factor: `Ki-67 low (${marker.value}%)`, impact: 'favorable' });
      } else {
        prognosticFactors.push({
          factor: `Ki-67 intermediate (${marker.value}%)`,
          impact: 'neutral',
        });
      }
    }

    if (name.includes('GRADE')) {
      if (marker.value === 1) {
        prognosticFactors.push({ factor: 'Grade 1 (well differentiated)', impact: 'favorable' });
      } else if (marker.value === 2) {
        prognosticFactors.push({
          factor: 'Grade 2 (moderately differentiated)',
          impact: 'neutral',
        });
      } else if (marker.value >= 3) {
        prognosticFactors.push({
          factor: 'Grade 3 (poorly differentiated)',
          impact: 'unfavorable',
        });
      }
    }
  }

  // Add stage as a prognostic factor
  if (stage) {
    const stageNum = parseInt(stage.replace(/[^0-9]/g, ''), 10);
    if (stageNum <= 1) {
      prognosticFactors.push({ factor: `Stage ${stage}`, impact: 'favorable' });
    } else if (stageNum === 2) {
      prognosticFactors.push({ factor: `Stage ${stage}`, impact: 'neutral' });
    } else {
      prognosticFactors.push({ factor: `Stage ${stage}`, impact: 'unfavorable' });
    }
  }

  // Calculate overall risk
  const favorable = prognosticFactors.filter((f) => f.impact === 'favorable').length;
  const unfavorable = prognosticFactors.filter((f) => f.impact === 'unfavorable').length;

  let riskCategory: 'low' | 'intermediate' | 'high';
  if (unfavorable === 0 && favorable >= 2) {
    riskCategory = 'low';
  } else if (unfavorable >= 3 || (unfavorable >= 2 && favorable === 0)) {
    riskCategory = 'high';
  } else {
    riskCategory = 'intermediate';
  }

  const summary = `${cancerType} with ${prognosticFactors.length} evaluated prognostic factors: ${favorable} favorable, ${unfavorable} unfavorable. Overall risk category: ${riskCategory}.`;

  return {
    riskCategory,
    prognosticFactors,
    summary,
  };
}

/**
 * Create biomarker analysis tools
 */
export function createBiomarkerTools(): ToolDefinition[] {
  return [
    {
      name: 'AnalyzeBiomarker',
      description:
        'Analyze a single cancer biomarker value and provide interpretation, clinical significance, and recommendations',
      parameters: {
        type: 'object',
        properties: {
          biomarkerName: {
            type: 'string',
            description: 'Name of the biomarker (e.g., PSA, CA-125, CEA, AFP)',
          },
          value: {
            type: 'number',
            description: 'Measured value of the biomarker',
          },
          unit: {
            type: 'string',
            description: 'Unit of measurement (e.g., ng/mL, U/mL)',
          },
          cancerType: {
            type: 'string',
            description: 'Optional cancer type for context-specific interpretation',
          },
        },
        required: ['biomarkerName', 'value', 'unit'],
      },
      handler: async (params) => {
        const result = analyzeBiomarker(params as Parameters<typeof analyzeBiomarker>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'InterpretBiomarkerPanel',
      description:
        'Interpret a panel of multiple biomarkers and provide overall assessment with recommendations',
      parameters: {
        type: 'object',
        properties: {
          panelName: {
            type: 'string',
            description: 'Name of the biomarker panel',
          },
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Biomarker name' },
                value: { type: 'number', description: 'Measured value' },
                unit: { type: 'string', description: 'Unit of measurement' },
              },
              required: ['name', 'value', 'unit'],
            },
            description: 'Array of biomarker results',
          },
          cancerType: {
            type: 'string',
            description: 'Optional cancer type for context',
          },
        },
        required: ['panelName', 'results'],
      },
      handler: async (params) => {
        const result = interpretPanel(params as Parameters<typeof interpretPanel>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'GetPrognosticAssessment',
      description:
        'Generate a prognostic assessment based on cancer type, stage, and biomarker profile',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Type of cancer (e.g., breast cancer, lung cancer)',
          },
          stage: {
            type: 'string',
            description: 'Cancer stage (e.g., I, II, IIIA, IV)',
          },
          biomarkers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Biomarker name' },
                value: { type: 'number', description: 'Measured value or score' },
                status: { type: 'string', description: 'Status (positive/negative/amplified)' },
              },
              required: ['name', 'value'],
            },
            description: 'Array of biomarkers with values and optional status',
          },
        },
        required: ['cancerType', 'biomarkers'],
      },
      handler: async (params) => {
        const result = getPrognosticAssessment(
          params as Parameters<typeof getPrognosticAssessment>[0]
        );
        return JSON.stringify(result, null, 2);
      },
    },
  ];
}
