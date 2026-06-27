# CADD pipeline summary — EGFR

## Target dossier
- UniProt: P00533 (1210 aa)
- PDB structures: 354 (structure-based docking: structures exist — confirm one is holo and covers the site (not auto-checked))
- ChEMBL bioactivity records (any pChEMBL, not potency-filtered, counts records not molecules): 21342
- Known mechanism drugs: 49

## Ligand triage
- 20 ranked candidates → `hits.csv` (SMILES + ChEMBL links)
- 3-D structures → `hits.sdf` (load directly into docking/visualization tools)

## Structural liabilities (RDKit — PAINS / Brenk / developability)
- 1/20 hits carry a PAINS (assay-interference) alert; 5/20 carry a Brenk (reactive/unstable-group) alert → `liabilities.json`.
- 12/20 fall in the Pfizer 3/75 zone (cLogP>3 & TPSA<75 — elevated in-vivo tox risk; Hughes 2008).
- Scrutinize before pursuing: CHEMBL6170958, CHEMBL420624, CHEMBL363815, CHEMBL3613702, CHEMBL55729
- Synthetic accessibility (Ertl 2009): median SA 2.4/10; all readily synthesizable.
_Structural alerts are heuristic medicinal-chemistry filters, not disqualifiers — review each in context._

## Structure
- 4UV7.pdb → `structures/`
- no confirmed holo structure among the top 6 candidate(s) — using the top-ranked entry 4UV7, which may be apo (no bound ligand). The docking-box step needs a co-crystal ligand; supply a holo PDB explicitly (--pdb) if so.; mutations are NOT checked (no allele requested)

## Cost-benefit / feasibility
_Modality/phase-level benchmark (small_molecule @ phase1) from public priors — **not** a target-specific prediction. Identical inputs give identical figures for any target; it does not 'know' this target. Treat as a transparent planning heuristic._
- P(approval) from phase1: 5.1%
- Expected remaining cost: $360M over 8.0 yr
- Risk-adjusted gross profit: $308M; benefit/cost 0.86
- **Marginal — sensitive to price/penetration/PoS; de-risk first**

## Next step: dock (stage 6)
- No experimental box available; pick a pocket (fpocket/P2Rank) or an AlphaFold model first.
## Provenance
- Every figure above is fetched-and-cited or deterministically computed — see `provenance.json`.
- Re-prove it: `python3 cad/verify.py --run examples/portfolio/egfr`  (re-pulls each number from its live source).

_Research only. Every figure points to a public source — verify before relying on it._