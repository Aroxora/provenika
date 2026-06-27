# CADD pipeline summary — BTK

## Target dossier
- UniProt: Q06187 (659 aa)
- PDB structures: 133 (structure-based docking: structures exist — confirm one is holo and covers the site (not auto-checked))
- ChEMBL bioactivity records (any pChEMBL, not potency-filtered, counts records not molecules): 17224
- Known mechanism drugs: 21

## Ligand triage
- 20 ranked candidates → `hits.csv` (SMILES + ChEMBL links)
- 3-D structures → `hits.sdf` (load directly into docking/visualization tools)

## Structural liabilities (RDKit — PAINS / Brenk / developability)
- 0/20 hits carry a PAINS (assay-interference) alert; 17/20 carry a Brenk (reactive/unstable-group) alert → `liabilities.json`.
- 0/20 fall in the Pfizer 3/75 zone (cLogP>3 & TPSA<75 — elevated in-vivo tox risk; Hughes 2008).
- Scrutinize before pursuing: CHEMBL5824452, CHEMBL6029889, CHEMBL5886785, CHEMBL5741138, CHEMBL5993286, CHEMBL5836429 …
- Synthetic accessibility (Ertl 2009): median SA 3.5/10; all readily synthesizable.
_Structural alerts are heuristic medicinal-chemistry filters, not disqualifiers — review each in context._

## Structure
- 5P9J.pdb → `structures/`
- covers only ~42% of the protein — likely a single domain/fragment; confirm it includes the binding site. holo: a non-solvent ligand makes protein contacts (defines a docking box); confirm it is the intended, ligandable site; mutations are NOT checked (no allele requested)

## Binding-site / docking box
- Reference ligand: 8E8 (chain A, 33 atoms) in 5P9J
- Box center (Å): [19.74, 8.39, 4.54] · size (Å): [26.4, 23.1, 28.5]

## Cost-benefit / feasibility
_Modality/phase-level benchmark (small_molecule @ phase1) from public priors — **not** a target-specific prediction. Identical inputs give identical figures for any target; it does not 'know' this target. Treat as a transparent planning heuristic._
- P(approval) from phase1: 5.1%
- Expected remaining cost: $360M over 8.0 yr
- Risk-adjusted gross profit: $308M; benefit/cost 0.86
- **Marginal — sensitive to price/penetration/PoS; de-risk first**

## Next step: dock (stage 6)
- Confirm the docking stack is installed: `python3 cad/dock.py --check`
- Batch-dock the shortlist: re-run with `--dock-top-n 10`, or one ligand: `python3 cad/dock.py --receptor examples/portfolio/btk/structures/5P9J.pdb --smiles "<hit SMILES from hits.csv>" --box-json examples/portfolio/btk/binding_site.json`
## Provenance
- Every figure above is fetched-and-cited or deterministically computed — see `provenance.json`.
- Re-prove it: `python3 cad/verify.py --run examples/portfolio/btk`  (re-pulls each number from its live source).

_Research only. Every figure points to a public source — verify before relying on it._