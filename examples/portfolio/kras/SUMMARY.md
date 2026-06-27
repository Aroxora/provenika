# CADD pipeline summary — KRAS

## Target dossier
- UniProt: P01116 (189 aa)
- PDB structures: 427 (structure-based docking: structures exist — confirm one is holo and covers the site (not auto-checked))
- ChEMBL bioactivity records (any pChEMBL, not potency-filtered, counts records not molecules): 5089
- Known mechanism drugs: 2

## Ligand triage
- 20 ranked candidates → `hits.csv` (SMILES + ChEMBL links)
- 3-D structures → `hits.sdf` (load directly into docking/visualization tools)
- ⚠️ 10/10 top hits lack computed drug-likeness (e.g. macrocycles/peptides) — those rows are ranked on potency alone; treat with care.

## Structural liabilities (RDKit — PAINS / Brenk / developability)
- 0/20 hits carry a PAINS (assay-interference) alert; 6/20 carry a Brenk (reactive/unstable-group) alert → `liabilities.json`.
- 1/20 fall in the Pfizer 3/75 zone (cLogP>3 & TPSA<75 — elevated in-vivo tox risk; Hughes 2008).
- Scrutinize before pursuing: CHEMBL5612889, CHEMBL5172805, CHEMBL5205422, CHEMBL5930957, CHEMBL4849611, CHEMBL4632935
- Synthetic accessibility (Ertl 2009): median SA 7.7/10; 14 hit(s) look hard to make (SA>6).
_Structural alerts are heuristic medicinal-chemistry filters, not disqualifiers — review each in context._

## Structure
- 9IAY.pdb → `structures/`
- holo: a non-solvent ligand makes protein contacts (defines a docking box); confirm it is the intended, ligandable site; mutations are NOT checked (no allele requested)

## Binding-site / docking box
- Reference ligand: GDP (chain A, 40 atoms) in 9IAY
- Box center (Å): [26.73, 2.89, 21.5] · size (Å): [24.0, 25.6, 25.1]

## Cost-benefit / feasibility
_Modality/phase-level benchmark (small_molecule @ phase1) from public priors — **not** a target-specific prediction. Identical inputs give identical figures for any target; it does not 'know' this target. Treat as a transparent planning heuristic._
- P(approval) from phase1: 5.1%
- Expected remaining cost: $360M over 8.0 yr
- Risk-adjusted gross profit: $308M; benefit/cost 0.86
- **Marginal — sensitive to price/penetration/PoS; de-risk first**

## Next step: dock (stage 6)
- Confirm the docking stack is installed: `python3 cad/dock.py --check`
- Batch-dock the shortlist: re-run with `--dock-top-n 10`, or one ligand: `python3 cad/dock.py --receptor examples/portfolio/kras/structures/9IAY.pdb --smiles "<hit SMILES from hits.csv>" --box-json examples/portfolio/kras/binding_site.json`
## Provenance
- Every figure above is fetched-and-cited or deterministically computed — see `provenance.json`.
- Re-prove it: `python3 cad/verify.py --run examples/portfolio/kras`  (re-pulls each number from its live source).

_Research only. Every figure points to a public source — verify before relying on it._