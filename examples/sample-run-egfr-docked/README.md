# EGFR — complete pipeline incl. structure-based docking (run on AWS)

The flagship example, run end-to-end **including the batch-docking stage that cannot run on a machine
without AutoDock Vina** — produced on an AWS EC2 host with the conda-forge stack (Vina f458505-mod,
Open Babel 3.1.0, Meeko 0.7.1, pdb2pqr 3.7.1, docking-grade prep).

## What it is

1. **Target dossier + ligand triage** from ChEMBL/UniProt → `dossier.json`, `hits.csv` (consensus
   potency, n_measurements, selectivity, …) + `liabilities.json` (PAINS/Brenk).
2. **Structure + box.** The holo-preferring auto-pick landed on an **apo** EGFR entry (4UV7, no
   co-crystal ligand) — the documented limitation — so the box + receptor were taken from a holo
   structure, **1M17 (erlotinib)**, `binding_site.json` (ligand AQ4, chain A).
3. **Batch docking → structure-aware re-rank.** The top-10 shortlist docked into the 1M17 ATP pocket
   → **`docked_hits.csv`**: `vina_best_dG_kcal_per_mol` + a NON-VALIDATED `rank_fusion` of the ligand
   score and the docking ΔG.

| rank | ChEMBL ID | Vina ΔG (kcal/mol) | fusion |
|---|---|---|---|
| 1 | CHEMBL5746224 | −9.5 | 0.94 |
| 2 | CHEMBL5790648 | −8.82 | 0.79 |
| 3 | CHEMBL174426 | −8.30 | 0.66 |
| 4 | CHEMBL176582 | −8.21 | 0.65 |

These are anilinoquinazoline EGFR-inhibitor chemotypes (the erlotinib/gefitinib family) placed in the
ATP pocket; ΔG −7.4 to −9.5 kcal/mol.

## Honesty

- **Vina ΔG is a predicted ranking aid, NOT a measured affinity** — never a Kd/IC50, never efficacy.
  The fused rank combines two unvalidated triage signals and is labeled `NONVALIDATED`.
- Every **fetched/computed** figure re-checks: `python3 cad/verify.py --run examples/sample-run-egfr-docked`
  → `ok, fail:0` (dossier, shortlist, box, cost-benefit re-pulled from the live public sources). The
  docking poses are not re-derivable without re-running Vina (docking is stochastic; fixed seed only).
- A computational hit is a **hypothesis for the wet lab**, never evidence a therapy works.

## Reproduce

```bash
make setup-docking
python3 cad/run_pipeline.py --target EGFR --dock-top-n 10 --out runs/egfr
# (if the auto-pick is apo, supply a holo PDB:)
python3 cad/fetch_structure.py --pdb 1M17 --out runs/egfr/structures
python3 cad/binding_site.py --pdb 1M17 --json > runs/egfr/binding_site.json
python3 cad/batch_dock.py --hits runs/egfr/hits.csv --box runs/egfr/binding_site.json \
    --receptor runs/egfr/structures/1M17.pdb --out runs/egfr --top-n 10
```
