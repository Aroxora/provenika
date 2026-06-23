# CADD pipeline summary — EGFR

## Target dossier
- UniProt: P00533 (1210 aa)
- PDB structures: 354 (docking feasible: yes)
- Potent ChEMBL activities: 21342
- Known mechanism drugs: 49

## Ligand triage
- 25 ranked candidates → `hits.csv` (SMILES + ChEMBL links)

## Structural liabilities (RDKit — PAINS / Brenk alerts)
- 0/25 hits carry a PAINS (assay-interference) alert; 10/25 carry a Brenk (reactive/unstable-group) alert → `liabilities.json`.
- Scrutinize before pursuing: CHEMBL420624, CHEMBL474147, CHEMBL285063, CHEMBL516022, CHEMBL334697, CHEMBL52913 …
_Structural alerts are heuristic medicinal-chemistry filters, not disqualifiers — review each in context._

## Structure
- 8A27.pdb → `structures/`

## Binding-site / docking box
- Reference ligand: KY9 (chain A, 48 atoms) in 8A27
- Box center (Å): [23.81, -10.62, -11.55] · size (Å): [34.2, 24.1, 30.0]

## Cost-benefit / feasibility
_Modality/phase-level benchmark (small_molecule @ phase1) from public priors — **not** a target-specific prediction. Identical inputs give identical figures for any target; it does not 'know' this target. Treat as a transparent planning heuristic._
- P(approval) from phase1: 5.1%
- Expected remaining cost: $360M over 8.0 yr
- Risk-adjusted revenue: $370M; benefit/cost 1.03
- **Marginal — sensitive to price/penetration/PoS; de-risk first**

## Next step: dock (stage 6)
- Confirm AutoDock Vina + Open Babel are installed: `python3 cad/dock.py --check`
- `python3 cad/dock.py --receptor examples/sample-run-egfr/structures/8A27.pdb --smiles "<hit SMILES from hits.csv>" --box-json examples/sample-run-egfr/binding_site.json`
## Provenance
- Every figure above is fetched-and-cited or deterministically computed — see `provenance.json`.
- Re-prove it: `python3 cad/verify.py --run examples/sample-run-egfr`  (re-pulls each number from its live source).

_Research only. Every figure points to a public source — verify before relying on it._