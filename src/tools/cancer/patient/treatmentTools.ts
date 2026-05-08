/**
 * Treatment Recommendation Tools
 *
 * Tools for generating treatment recommendations, risk stratification,
 * and personalized medicine analysis.
 */

import type { ToolDefinition } from '../../../core/toolRuntime.js';

/**
 * Therapy type for treatment recommendations
 */
type TherapyType =
  | 'surgery'
  | 'chemotherapy'
  | 'radiation'
  | 'targeted_therapy'
  | 'immunotherapy'
  | 'hormone_therapy'
  | 'combination';

/**
 * Treatment response status
 */
type ResponseStatus =
  | 'complete_response'
  | 'partial_response'
  | 'stable_disease'
  | 'progressive_disease';

/**
 * Treatment recommendation based on cancer characteristics
 */
interface TreatmentRecommendation {
  primaryTherapy: {
    type: TherapyType;
    name: string;
    rationale: string;
    evidenceLevel: string;
  };
  additionalTherapies: Array<{
    type: TherapyType;
    name: string;
    timing: 'neoadjuvant' | 'adjuvant' | 'concurrent' | 'maintenance';
    rationale: string;
  }>;
  considerations: string[];
  contraindications: string[];
  clinicalTrialEligibility: string;
}

/**
 * Risk stratification result
 */
interface RiskStratification {
  overallRisk: 'very_low' | 'low' | 'intermediate' | 'high' | 'very_high';
  recurrenceRisk: number; // percentage
  survivalEstimate: {
    fiveYear: number;
    tenYear?: number;
  };
  riskFactors: Array<{
    factor: string;
    contribution: 'increases' | 'decreases' | 'neutral';
    weight: number;
  }>;
  riskScore?: {
    name: string;
    value: number;
    interpretation: string;
  };
}

/**
 * Generate treatment recommendations
 */
function recommendTreatment(params: {
  cancerType: string;
  stage: string;
  histology?: string;
  biomarkers?: Record<string, string | number | boolean>;
  patientFactors?: {
    age?: number;
    performanceStatus?: number;
    comorbidities?: string[];
  };
}): TreatmentRecommendation {
  const { cancerType, stage, histology, biomarkers, patientFactors } = params;

  const cancer = cancerType.toLowerCase();
  const stageNum = parseInt(stage.replace(/[^0-9]/g, ''), 10) || 0;

  // Default recommendation structure
  const recommendation: TreatmentRecommendation = {
    primaryTherapy: {
      type: 'surgery',
      name: 'Surgical resection',
      rationale: 'Standard of care for localized disease',
      evidenceLevel: 'Category 1',
    },
    additionalTherapies: [],
    considerations: [],
    contraindications: [],
    clinicalTrialEligibility: 'Consider clinical trial enrollment for novel approaches',
  };

  // Cancer-specific treatment logic
  if (cancer.includes('breast')) {
    const er = biomarkers?.ER || biomarkers?.er;
    const pr = biomarkers?.PR || biomarkers?.pr;
    const her2 = biomarkers?.HER2 || biomarkers?.her2;

    if (stageNum <= 2) {
      recommendation.primaryTherapy = {
        type: 'surgery',
        name: er || pr ? 'Breast-conserving surgery' : 'Mastectomy',
        rationale: 'Standard surgical approach for early-stage breast cancer',
        evidenceLevel: 'Category 1',
      };

      if (her2 === 'positive' || her2 === true) {
        recommendation.additionalTherapies.push({
          type: 'targeted_therapy',
          name: 'Trastuzumab + Pertuzumab',
          timing: 'adjuvant',
          rationale: 'HER2-targeted therapy for HER2-positive disease',
        });
      }

      if (er === 'positive' || er === true) {
        recommendation.additionalTherapies.push({
          type: 'hormone_therapy',
          name: patientFactors?.age && patientFactors.age < 50 ? 'Tamoxifen' : 'Aromatase inhibitor',
          timing: 'adjuvant',
          rationale: 'Endocrine therapy for hormone receptor-positive disease',
        });
      }

      if (stageNum >= 2 || her2 === 'positive') {
        recommendation.additionalTherapies.push({
          type: 'chemotherapy',
          name: 'AC-T or TC regimen',
          timing: her2 === 'positive' ? 'neoadjuvant' : 'adjuvant',
          rationale: 'Systemic chemotherapy for intermediate/high-risk disease',
        });
      }
    } else {
      recommendation.primaryTherapy = {
        type: 'chemotherapy',
        name: 'Systemic therapy',
        rationale: 'Systemic control for advanced disease',
        evidenceLevel: 'Category 1',
      };
    }
  } else if (cancer.includes('lung') || cancer.includes('nsclc')) {
    const egfr = biomarkers?.EGFR || biomarkers?.egfr;
    const alk = biomarkers?.ALK || biomarkers?.alk;
    const pdl1 = biomarkers?.['PD-L1'] || biomarkers?.pdl1;

    if (stageNum <= 2) {
      recommendation.primaryTherapy = {
        type: 'surgery',
        name: 'Lobectomy with lymph node dissection',
        rationale: 'Curative surgical approach for early-stage NSCLC',
        evidenceLevel: 'Category 1',
      };

      if (stageNum >= 2) {
        recommendation.additionalTherapies.push({
          type: 'chemotherapy',
          name: 'Cisplatin-based doublet',
          timing: 'adjuvant',
          rationale: 'Adjuvant chemotherapy improves survival in stage II-III',
        });
      }
    } else if (stageNum === 3) {
      recommendation.primaryTherapy = {
        type: 'combination',
        name: 'Concurrent chemoradiation',
        rationale: 'Standard for unresectable stage III NSCLC',
        evidenceLevel: 'Category 1',
      };

      recommendation.additionalTherapies.push({
        type: 'immunotherapy',
        name: 'Durvalumab consolidation',
        timing: 'maintenance',
        rationale: 'Improves PFS and OS after chemoradiation',
      });
    } else {
      // Stage IV
      if (egfr === 'mutated' || egfr === true) {
        recommendation.primaryTherapy = {
          type: 'targeted_therapy',
          name: 'Osimertinib',
          rationale: 'First-line EGFR TKI for EGFR-mutant NSCLC',
          evidenceLevel: 'Category 1',
        };
      } else if (alk === 'positive' || alk === true) {
        recommendation.primaryTherapy = {
          type: 'targeted_therapy',
          name: 'Alectinib',
          rationale: 'First-line ALK inhibitor for ALK-positive NSCLC',
          evidenceLevel: 'Category 1',
        };
      } else if (pdl1 && (pdl1 === 'high' || (typeof pdl1 === 'number' && pdl1 >= 50))) {
        recommendation.primaryTherapy = {
          type: 'immunotherapy',
          name: 'Pembrolizumab monotherapy',
          rationale: 'First-line IO for PD-L1 ≥50% without driver mutations',
          evidenceLevel: 'Category 1',
        };
      } else {
        recommendation.primaryTherapy = {
          type: 'combination',
          name: 'Platinum doublet + Pembrolizumab',
          rationale: 'Standard first-line for metastatic NSCLC without drivers',
          evidenceLevel: 'Category 1',
        };
      }
    }
  } else if (cancer.includes('colorectal') || cancer.includes('colon')) {
    const msi = biomarkers?.MSI || biomarkers?.msi;
    const ras = biomarkers?.RAS || biomarkers?.KRAS || biomarkers?.kras;
    const braf = biomarkers?.BRAF || biomarkers?.braf;

    if (stageNum <= 2) {
      recommendation.primaryTherapy = {
        type: 'surgery',
        name: 'Colectomy with lymphadenectomy',
        rationale: 'Curative resection for localized colorectal cancer',
        evidenceLevel: 'Category 1',
      };

      if (stageNum === 2 && msi !== 'MSI-H') {
        recommendation.considerations.push(
          'Consider adjuvant chemotherapy for high-risk stage II'
        );
      }
    } else if (stageNum === 3) {
      recommendation.primaryTherapy = {
        type: 'surgery',
        name: 'Colectomy with lymphadenectomy',
        rationale: 'Surgical resection followed by adjuvant therapy',
        evidenceLevel: 'Category 1',
      };

      recommendation.additionalTherapies.push({
        type: 'chemotherapy',
        name: 'FOLFOX or CAPOX',
        timing: 'adjuvant',
        rationale: 'Standard adjuvant chemotherapy for stage III',
      });
    } else {
      // Stage IV
      if (msi === 'MSI-H' || msi === 'high') {
        recommendation.primaryTherapy = {
          type: 'immunotherapy',
          name: 'Pembrolizumab or Nivolumab + Ipilimumab',
          rationale: 'First-line IO for MSI-H metastatic CRC',
          evidenceLevel: 'Category 1',
        };
      } else if (ras === 'wild-type' && (!braf || braf === 'wild-type')) {
        recommendation.primaryTherapy = {
          type: 'combination',
          name: 'FOLFOX/FOLFIRI + Cetuximab/Panitumumab',
          rationale: 'Anti-EGFR therapy for RAS wild-type left-sided tumors',
          evidenceLevel: 'Category 1',
        };
      } else {
        recommendation.primaryTherapy = {
          type: 'combination',
          name: 'FOLFOX/FOLFIRI + Bevacizumab',
          rationale: 'Standard first-line for metastatic CRC',
          evidenceLevel: 'Category 1',
        };
      }
    }
  }

  // Add patient-specific considerations
  if (patientFactors) {
    if (patientFactors.age && patientFactors.age > 75) {
      recommendation.considerations.push(
        'Consider dose modifications for elderly patients'
      );
    }

    if (patientFactors.performanceStatus && patientFactors.performanceStatus >= 2) {
      recommendation.considerations.push(
        'Poor performance status may limit treatment intensity'
      );
    }

    if (patientFactors.comorbidities?.length) {
      recommendation.considerations.push(
        `Comorbidities to consider: ${patientFactors.comorbidities.join(', ')}`
      );

      if (patientFactors.comorbidities.some((c) => c.toLowerCase().includes('cardiac'))) {
        recommendation.contraindications.push(
          'Caution with cardiotoxic agents (anthracyclines, trastuzumab)'
        );
      }

      if (patientFactors.comorbidities.some((c) => c.toLowerCase().includes('renal'))) {
        recommendation.contraindications.push(
          'Dose adjustment or avoidance of nephrotoxic agents (cisplatin)'
        );
      }
    }
  }

  return recommendation;
}

/**
 * Calculate risk stratification
 */
function stratifyRisk(params: {
  cancerType: string;
  stage: string;
  grade?: number;
  tumorSize?: number;
  lymphNodes?: number;
  biomarkers?: Record<string, string | number | boolean>;
  patientAge?: number;
}): RiskStratification {
  const { cancerType, stage, grade, tumorSize, lymphNodes, biomarkers, patientAge } = params;

  const cancer = cancerType.toLowerCase();
  const stageNum = parseInt(stage.replace(/[^0-9]/g, ''), 10) || 0;

  const riskFactors: RiskStratification['riskFactors'] = [];
  let baseRisk = 0;

  // Stage-based risk
  if (stageNum <= 1) {
    riskFactors.push({ factor: `Stage ${stage}`, contribution: 'decreases', weight: 2 });
    baseRisk += 10;
  } else if (stageNum === 2) {
    riskFactors.push({ factor: `Stage ${stage}`, contribution: 'neutral', weight: 1 });
    baseRisk += 25;
  } else if (stageNum === 3) {
    riskFactors.push({ factor: `Stage ${stage}`, contribution: 'increases', weight: 2 });
    baseRisk += 45;
  } else {
    riskFactors.push({ factor: `Stage ${stage}`, contribution: 'increases', weight: 3 });
    baseRisk += 70;
  }

  // Grade-based risk
  if (grade) {
    if (grade === 1) {
      riskFactors.push({ factor: 'Grade 1 (well differentiated)', contribution: 'decreases', weight: 1 });
      baseRisk -= 5;
    } else if (grade === 2) {
      riskFactors.push({ factor: 'Grade 2 (moderately differentiated)', contribution: 'neutral', weight: 0.5 });
    } else {
      riskFactors.push({ factor: 'Grade 3 (poorly differentiated)', contribution: 'increases', weight: 1.5 });
      baseRisk += 10;
    }
  }

  // Tumor size
  if (tumorSize) {
    if (tumorSize <= 2) {
      riskFactors.push({ factor: `Tumor ≤2cm`, contribution: 'decreases', weight: 1 });
      baseRisk -= 5;
    } else if (tumorSize <= 5) {
      riskFactors.push({ factor: `Tumor 2-5cm`, contribution: 'neutral', weight: 0.5 });
    } else {
      riskFactors.push({ factor: `Tumor >5cm`, contribution: 'increases', weight: 1.5 });
      baseRisk += 10;
    }
  }

  // Lymph node involvement
  if (lymphNodes !== undefined) {
    if (lymphNodes === 0) {
      riskFactors.push({ factor: 'Node negative', contribution: 'decreases', weight: 2 });
      baseRisk -= 10;
    } else if (lymphNodes <= 3) {
      riskFactors.push({ factor: `1-3 positive nodes`, contribution: 'increases', weight: 1 });
      baseRisk += 10;
    } else {
      riskFactors.push({ factor: `≥4 positive nodes`, contribution: 'increases', weight: 2 });
      baseRisk += 20;
    }
  }

  // Cancer-specific biomarker risk
  if (cancer.includes('breast') && biomarkers) {
    const er = biomarkers.ER || biomarkers.er;
    const her2 = biomarkers.HER2 || biomarkers.her2;

    if (er === 'positive' || er === true) {
      riskFactors.push({ factor: 'ER positive', contribution: 'decreases', weight: 1 });
      baseRisk -= 5;
    } else {
      riskFactors.push({ factor: 'ER negative', contribution: 'increases', weight: 1 });
      baseRisk += 5;
    }

    if (her2 === 'positive' || her2 === true) {
      riskFactors.push({ factor: 'HER2 positive', contribution: 'increases', weight: 1 });
      baseRisk += 5;
    }
  }

  // Age factor
  if (patientAge) {
    if (patientAge < 40) {
      riskFactors.push({ factor: 'Young age (<40)', contribution: 'increases', weight: 1 });
      baseRisk += 5;
    } else if (patientAge > 70) {
      riskFactors.push({ factor: 'Older age (>70)', contribution: 'increases', weight: 0.5 });
      baseRisk += 3;
    }
  }

  // Normalize risk
  const recurrenceRisk = Math.max(5, Math.min(95, baseRisk));

  // Calculate survival estimates
  const fiveYearSurvival = Math.max(5, Math.min(99, 100 - recurrenceRisk * 0.8));
  const tenYearSurvival = Math.max(3, Math.min(95, 100 - recurrenceRisk * 1.1));

  // Determine overall risk category
  let overallRisk: RiskStratification['overallRisk'];
  if (recurrenceRisk <= 10) {
    overallRisk = 'very_low';
  } else if (recurrenceRisk <= 25) {
    overallRisk = 'low';
  } else if (recurrenceRisk <= 50) {
    overallRisk = 'intermediate';
  } else if (recurrenceRisk <= 75) {
    overallRisk = 'high';
  } else {
    overallRisk = 'very_high';
  }

  return {
    overallRisk,
    recurrenceRisk,
    survivalEstimate: {
      fiveYear: Math.round(fiveYearSurvival),
      tenYear: Math.round(tenYearSurvival),
    },
    riskFactors,
    riskScore: {
      name: 'Composite Risk Score',
      value: Math.round(baseRisk),
      interpretation: `${overallRisk.replace('_', ' ')} risk based on ${riskFactors.length} evaluated factors`,
    },
  };
}

/**
 * Assess treatment response
 */
function assessResponse(params: {
  treatmentType: string;
  baselineMeasurement: number;
  currentMeasurement: number;
  measurementType: 'tumor_size' | 'biomarker' | 'lesion_count';
  timeOnTreatment?: number;
}): {
  responseCategory: ResponseStatus;
  percentChange: number;
  interpretation: string;
  recommendations: string[];
} {
  const { baselineMeasurement, currentMeasurement, measurementType, timeOnTreatment } = params;

  const percentChange = ((currentMeasurement - baselineMeasurement) / baselineMeasurement) * 100;

  let responseCategory: ResponseStatus;
  let interpretation: string;
  const recommendations: string[] = [];

  // RECIST-like criteria for tumor size
  if (measurementType === 'tumor_size' || measurementType === 'lesion_count') {
    if (currentMeasurement === 0) {
      responseCategory = 'complete_response';
      interpretation = 'Complete disappearance of all target lesions';
      recommendations.push('Continue current therapy per protocol');
      recommendations.push('Consider maintenance therapy options');
    } else if (percentChange <= -30) {
      responseCategory = 'partial_response';
      interpretation = `Significant decrease (${Math.abs(Math.round(percentChange))}%) in tumor burden`;
      recommendations.push('Continue current therapy');
      recommendations.push('Monitor for continued response');
    } else if (percentChange >= 20) {
      responseCategory = 'progressive_disease';
      interpretation = `Tumor growth (${Math.round(percentChange)}%) indicates disease progression`;
      recommendations.push('Consider alternative therapy');
      recommendations.push('Evaluate for clinical trial options');
    } else {
      responseCategory = 'stable_disease';
      interpretation = `Disease stable with ${Math.round(percentChange)}% change`;
      recommendations.push('Continue current therapy if tolerating well');
      recommendations.push('Close monitoring recommended');
    }
  } else {
    // Biomarker response
    if (percentChange <= -50) {
      responseCategory = 'complete_response';
      interpretation = 'Biomarker normalized or significantly decreased';
      recommendations.push('Excellent biomarker response');
    } else if (percentChange <= -25) {
      responseCategory = 'partial_response';
      interpretation = 'Meaningful biomarker decrease';
      recommendations.push('Good biomarker response, continue monitoring');
    } else if (percentChange >= 25) {
      responseCategory = 'progressive_disease';
      interpretation = 'Rising biomarker suggests disease activity';
      recommendations.push('Correlate with imaging');
      recommendations.push('Consider therapy modification');
    } else {
      responseCategory = 'stable_disease';
      interpretation = 'Biomarker stable';
      recommendations.push('Continue current approach');
    }
  }

  if (timeOnTreatment) {
    if (timeOnTreatment < 8 && responseCategory === 'progressive_disease') {
      recommendations.push('Early progression - consider primary resistance');
    } else if (timeOnTreatment > 24 && responseCategory === 'progressive_disease') {
      recommendations.push('Late progression - evaluate for acquired resistance mechanisms');
    }
  }

  return {
    responseCategory,
    percentChange: Math.round(percentChange * 10) / 10,
    interpretation,
    recommendations,
  };
}

/**
 * Create treatment tools
 */
export function createTreatmentTools(): ToolDefinition[] {
  return [
    {
      name: 'RecommendTreatment',
      description:
        'Generate evidence-based treatment recommendations based on cancer type, stage, and molecular profile',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Type of cancer (e.g., breast cancer, NSCLC, colorectal cancer)',
          },
          stage: {
            type: 'string',
            description: 'Cancer stage (e.g., I, IIA, IIIB, IV)',
          },
          histology: {
            type: 'string',
            description: 'Histological subtype if applicable',
          },
          biomarkers: {
            type: 'object',
            description: 'Object with biomarker names as keys and values/status as values',
          },
          patientFactors: {
            type: 'object',
            properties: {
              age: { type: 'number', description: 'Patient age' },
              performanceStatus: { type: 'number', description: 'ECOG performance status (0-4)' },
              comorbidities: { type: 'array', items: { type: 'string' }, description: 'List of comorbidities' },
            },
            description: 'Patient-specific factors',
          },
        },
        required: ['cancerType', 'stage'],
      },
      handler: async (params) => {
        const result = recommendTreatment(params as Parameters<typeof recommendTreatment>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'StratifyRisk',
      description:
        'Calculate risk stratification including recurrence risk and survival estimates',
      parameters: {
        type: 'object',
        properties: {
          cancerType: {
            type: 'string',
            description: 'Type of cancer',
          },
          stage: {
            type: 'string',
            description: 'Cancer stage',
          },
          grade: {
            type: 'number',
            description: 'Tumor grade (1-3)',
          },
          tumorSize: {
            type: 'number',
            description: 'Tumor size in cm',
          },
          lymphNodes: {
            type: 'number',
            description: 'Number of positive lymph nodes',
          },
          biomarkers: {
            type: 'object',
            description: 'Biomarker status',
          },
          patientAge: {
            type: 'number',
            description: 'Patient age in years',
          },
        },
        required: ['cancerType', 'stage'],
      },
      handler: async (params) => {
        const result = stratifyRisk(params as Parameters<typeof stratifyRisk>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
    {
      name: 'AssessTreatmentResponse',
      description:
        'Assess treatment response based on tumor measurements or biomarker changes',
      parameters: {
        type: 'object',
        properties: {
          treatmentType: {
            type: 'string',
            description: 'Type of treatment being assessed',
          },
          baselineMeasurement: {
            type: 'number',
            description: 'Baseline measurement before treatment',
          },
          currentMeasurement: {
            type: 'number',
            description: 'Current measurement after treatment',
          },
          measurementType: {
            type: 'string',
            enum: ['tumor_size', 'biomarker', 'lesion_count'],
            description: 'Type of measurement being compared',
          },
          timeOnTreatment: {
            type: 'number',
            description: 'Weeks on current treatment',
          },
        },
        required: ['treatmentType', 'baselineMeasurement', 'currentMeasurement', 'measurementType'],
      },
      handler: async (params) => {
        const result = assessResponse(params as Parameters<typeof assessResponse>[0]);
        return JSON.stringify(result, null, 2);
      },
    },
  ];
}
