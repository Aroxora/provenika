/**
 * Pathway Domain Models
 *
 * Core types for biological pathway analysis in cancer research
 */

/**
 * Pathway database source
 */
export type PathwayDatabase = 'KEGG' | 'Reactome' | 'WikiPathways' | 'BioCarta' | 'PID' | 'Panther';

/**
 * Pathway category/classification
 */
export type PathwayCategory =
  | 'signaling'
  | 'metabolic'
  | 'cell_cycle'
  | 'apoptosis'
  | 'immune_response'
  | 'dna_repair'
  | 'transcription'
  | 'translation'
  | 'autophagy'
  | 'angiogenesis'
  | 'metastasis'
  | 'drug_metabolism'
  | 'other';

/**
 * Gene/protein node in a pathway
 */
export interface PathwayNode {
  readonly id: string;
  readonly name: string;
  readonly type: 'gene' | 'protein' | 'compound' | 'complex' | 'family' | 'abstract';
  readonly geneSymbol?: string;
  readonly uniprotId?: string;
  readonly entrezId?: string;
  readonly position?: { x: number; y: number };
  readonly isHub?: boolean;
}

/**
 * Interaction/edge in a pathway
 */
export interface PathwayInteraction {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly interactionType: InteractionType;
  readonly mechanism?: string;
  readonly evidence?: 'experimental' | 'curated' | 'predicted';
  readonly pubmedIds?: readonly string[];
  readonly isReversible?: boolean;
}

/**
 * Types of molecular interactions
 */
export type InteractionType =
  | 'activation'
  | 'inhibition'
  | 'phosphorylation'
  | 'dephosphorylation'
  | 'ubiquitination'
  | 'binding'
  | 'dissociation'
  | 'transcription'
  | 'translation'
  | 'catalysis'
  | 'transport'
  | 'complex_formation'
  | 'modification'
  | 'unknown';

/**
 * Core Pathway entity
 */
export interface Pathway {
  readonly id: string;
  readonly name: string;
  readonly database: PathwayDatabase;
  readonly externalId?: string;
  readonly description?: string;
  readonly category?: PathwayCategory;
  readonly organism?: string;
  readonly nodes: readonly PathwayNode[];
  readonly interactions: readonly PathwayInteraction[];
  readonly genes?: readonly string[];
  readonly cancerRelevance?: CancerRelevance;
  readonly url?: string;
  readonly version?: string;
  readonly lastUpdated?: string;
}

/**
 * Cancer relevance information for a pathway
 */
export interface CancerRelevance {
  readonly isOncogenic: boolean;
  readonly associatedCancerTypes?: readonly string[];
  readonly therapeuticTargets?: readonly string[];
  readonly biomarkers?: readonly string[];
  readonly description?: string;
}

/**
 * Pathway enrichment analysis result
 */
export interface PathwayEnrichmentResult {
  readonly pathway: Pathway;
  readonly pValue: number;
  readonly adjustedPValue: number;
  readonly enrichmentScore: number;
  readonly overlapGenes: readonly string[];
  readonly overlapCount: number;
  readonly pathwaySize: number;
  readonly foldEnrichment?: number;
  readonly direction?: 'up' | 'down' | 'mixed';
}

/**
 * Network analysis metrics for a node
 */
export interface NetworkMetrics {
  readonly nodeId: string;
  readonly degree: number;
  readonly inDegree?: number;
  readonly outDegree?: number;
  readonly betweennessCentrality?: number;
  readonly closenessCentrality?: number;
  readonly pageRank?: number;
  readonly clusteringCoefficient?: number;
  readonly isBottleneck?: boolean;
}

/**
 * Subnetwork or module within a larger network
 */
export interface NetworkModule {
  readonly id: string;
  readonly name?: string;
  readonly nodes: readonly string[];
  readonly interactions: readonly PathwayInteraction[];
  readonly score?: number;
  readonly enrichedPathways?: readonly PathwayEnrichmentResult[];
  readonly enrichedFunctions?: readonly FunctionEnrichment[];
}

/**
 * Functional enrichment result
 */
export interface FunctionEnrichment {
  readonly termId: string;
  readonly termName: string;
  readonly category: 'GO_BP' | 'GO_MF' | 'GO_CC' | 'KEGG' | 'Reactome' | 'other';
  readonly pValue: number;
  readonly adjustedPValue: number;
  readonly geneCount: number;
  readonly genes: readonly string[];
}

/**
 * Pathway perturbation analysis result
 */
export interface PathwayPerturbation {
  readonly pathwayId: string;
  readonly pathwayName: string;
  readonly perturbationScore: number;
  readonly direction: 'activated' | 'inhibited' | 'mixed';
  readonly affectedNodes: readonly AffectedNode[];
  readonly significance: number;
}

/**
 * Node affected in a perturbation
 */
export interface AffectedNode {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly expressionChange: number;
  readonly contributionScore?: number;
}

/**
 * Drug-pathway interaction
 */
export interface DrugPathwayInteraction {
  readonly drugId: string;
  readonly drugName: string;
  readonly pathwayId: string;
  readonly pathwayName: string;
  readonly targetGenes: readonly string[];
  readonly mechanism: string;
  readonly effect: 'activating' | 'inhibiting' | 'modulating';
  readonly evidenceLevel: string;
}

/**
 * Pathway search criteria
 */
export interface PathwaySearchCriteria {
  readonly keyword?: string;
  readonly database?: PathwayDatabase;
  readonly category?: PathwayCategory;
  readonly containsGene?: string;
  readonly cancerType?: string;
  readonly organism?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Cross-pathway analysis result
 */
export interface PathwayCrosstalk {
  readonly pathwayA: string;
  readonly pathwayB: string;
  readonly sharedGenes: readonly string[];
  readonly sharedInteractions?: readonly PathwayInteraction[];
  readonly crosstalkScore: number;
  readonly significance?: number;
}

/**
 * Upstream regulator prediction
 */
export interface UpstreamRegulator {
  readonly regulatorId: string;
  readonly regulatorName: string;
  readonly regulatorType: 'transcription_factor' | 'kinase' | 'cytokine' | 'receptor' | 'other';
  readonly activationZScore: number;
  readonly pValue: number;
  readonly targetGenes: readonly string[];
  readonly predictedState: 'activated' | 'inhibited' | 'unknown';
}
