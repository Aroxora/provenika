// Shared domain models for the Oncology OSINT / CADD web app.

export interface ChemblTarget {
  target_chembl_id: string;
  pref_name: string;
  target_type: string;
  organism: string;
}

export interface MoleculeProps {
  chembl_id: string;
  name: string;
  max_phase: number | null;
  dev_phase: string;
  mw: number | null;
  alogp: number | null;
  hbd: number | null;
  hba: number | null;
  psa: number | null;
  rtb: number | null;
  ro5_violations: number | null;
  qed: number | null;
  smiles: string | null;
}

export interface TriageHit extends MoleculeProps {
  best_pchembl: number;
  assay_type: string;
  drug_likeness: number;
  score: number;
  chembl_url: string;
}

export interface UniprotSummary {
  accession: string;
  name: string;
  length: number | null;
  function: string;
  pdb_count: number;
  pdbs: { id: string; method: string; resolution: string; res_num: number }[];
}

export interface Dossier {
  target: ChemblTarget;
  uniprot: UniprotSummary | null;
  potentActivityCount: number;
  knownDrugs: { molecule_chembl_id: string; action_type: string; mechanism: string }[];
  readout: string;
}

export interface Trial {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  conditions: string;
  url: string;
}

export interface CostBenefit {
  modality: string;
  phase: string;
  probabilityOfApproval: number;
  expectedCostMusd: number;
  expectedTimeYears: number;
  peakRevenueMusd: number;
  riskAdjustedRevenueMusd: number;
  benefitCostRatio: number;
  verdict: string;
}
