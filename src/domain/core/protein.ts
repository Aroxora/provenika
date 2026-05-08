/**
 * Protein Domain Models
 *
 * Core types for protein structure and function in drug discovery
 */

/**
 * Amino acid sequence with metadata
 */
export interface ProteinSequence {
  readonly sequence: string;
  readonly length: number;
  readonly checksum?: string;
  readonly isoformId?: string;
}

/**
 * Protein domain annotation
 */
export interface ProteinDomain {
  readonly id: string;
  readonly name: string;
  readonly database: 'Pfam' | 'InterPro' | 'SMART' | 'CDD' | 'Prosite';
  readonly startPosition: number;
  readonly endPosition: number;
  readonly description?: string;
  readonly eValue?: number;
}

/**
 * Post-translational modification site
 */
export interface PTMSite {
  readonly position: number;
  readonly residue: string;
  readonly modificationType: 'phosphorylation' | 'ubiquitination' | 'acetylation' | 'methylation' | 'glycosylation' | 'sumoylation' | 'other';
  readonly kinase?: string;
  readonly evidence?: 'experimental' | 'predicted';
  readonly function?: string;
}

/**
 * Protein binding site information
 */
export interface BindingSite {
  readonly id: string;
  readonly name: string;
  readonly type: 'active_site' | 'allosteric' | 'protein_interface' | 'ligand_binding' | 'nucleotide_binding' | 'metal_binding';
  readonly residues: readonly number[];
  readonly residueNames?: readonly string[];
  readonly ligands?: readonly string[];
  readonly druggability?: DrugabilityScore;
}

/**
 * Druggability assessment for a binding site
 */
export interface DrugabilityScore {
  readonly score: number;
  readonly category: 'druggable' | 'difficult' | 'undruggable';
  readonly properties?: {
    readonly volume?: number;
    readonly hydrophobicity?: number;
    readonly enclosure?: number;
  };
}

/**
 * 3D structure information
 */
export interface ProteinStructure {
  readonly pdbId: string;
  readonly title?: string;
  readonly method: 'X-ray' | 'NMR' | 'cryo-EM' | 'AlphaFold' | 'other';
  readonly resolution?: number;
  readonly chainId?: string;
  readonly coverage?: number;
  readonly startResidue?: number;
  readonly endResidue?: number;
  readonly ligands?: readonly StructureLigand[];
  readonly depositionDate?: string;
}

/**
 * Ligand bound in a protein structure
 */
export interface StructureLigand {
  readonly id: string;
  readonly name: string;
  readonly type: 'small_molecule' | 'peptide' | 'nucleotide' | 'ion' | 'cofactor';
  readonly bindingAffinity?: number;
  readonly bindingAffinityUnit?: 'nM' | 'uM' | 'mM' | 'Kd' | 'Ki' | 'IC50';
}

/**
 * Protein-protein interaction
 */
export interface ProteinInteraction {
  readonly interactorA: string;
  readonly interactorB: string;
  readonly interactionType: 'physical' | 'genetic' | 'regulatory' | 'enzymatic';
  readonly evidence: 'experimental' | 'predicted' | 'curated';
  readonly score?: number;
  readonly source: 'STRING' | 'BioGRID' | 'IntAct' | 'MINT' | 'other';
  readonly pubmedIds?: readonly string[];
}

/**
 * Core Protein entity
 */
export interface Protein {
  readonly id: string;
  readonly uniprotId: string;
  readonly name: string;
  readonly geneName: string;
  readonly geneId?: string;
  readonly organism?: string;
  readonly sequence?: ProteinSequence;
  readonly domains?: readonly ProteinDomain[];
  readonly ptmSites?: readonly PTMSite[];
  readonly bindingSites?: readonly BindingSite[];
  readonly structures?: readonly ProteinStructure[];
  readonly interactions?: readonly ProteinInteraction[];
  readonly function?: string;
  readonly subcellularLocation?: readonly string[];
  readonly tissueExpression?: readonly TissueExpression[];
  readonly diseaseAssociations?: readonly ProteinDiseaseAssociation[];
}

/**
 * Tissue-specific expression data
 */
export interface TissueExpression {
  readonly tissue: string;
  readonly expressionLevel: 'high' | 'medium' | 'low' | 'not_detected';
  readonly tpm?: number;
  readonly reliability?: 'enhanced' | 'supported' | 'uncertain';
}

/**
 * Disease association for a protein
 */
export interface ProteinDiseaseAssociation {
  readonly diseaseId: string;
  readonly diseaseName: string;
  readonly associationType: 'causative' | 'modifying' | 'susceptibility' | 'biomarker';
  readonly evidence: string;
}

/**
 * Protein search criteria
 */
export interface ProteinSearchCriteria {
  readonly uniprotId?: string;
  readonly geneName?: string;
  readonly keyword?: string;
  readonly organism?: string;
  readonly hasStructure?: boolean;
  readonly hasDruggableSite?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Protein docking result
 */
export interface DockingResult {
  readonly proteinId: string;
  readonly ligandId: string;
  readonly bindingSiteId?: string;
  readonly score: number;
  readonly scoreType: 'docking_score' | 'binding_energy' | 'affinity_prediction';
  readonly pose?: DockingPose;
  readonly contacts?: readonly ResidueContact[];
}

/**
 * Docking pose information
 */
export interface DockingPose {
  readonly poseId: string;
  readonly rmsd?: number;
  readonly coordinates?: string;
  readonly format?: 'pdb' | 'mol2' | 'sdf';
}

/**
 * Residue contact in a binding interaction
 */
export interface ResidueContact {
  readonly residueNumber: number;
  readonly residueName: string;
  readonly contactType: 'hydrogen_bond' | 'hydrophobic' | 'ionic' | 'pi_stacking' | 'cation_pi';
  readonly distance?: number;
}
