# Sample pipeline run — EGFR (a real, committed snapshot)

This directory is a **real, unedited output** of the CADD triage pipeline for
[EGFR](https://www.uniprot.org/uniprotkb/P00533/entry) (epidermal growth factor
receptor, a validated oncology kinase target). It is committed so you can see
exactly what the tool produces **without installing or running anything** — and
then re-prove every number for yourself.

- **Generated:** 2026-06-23 from live public data (UniProt, ChEMBL, RCSB PDB).
- **Command that produced it** (run from the repo root):

  ```bash
  python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 \
      --incidence 60000 --price 150000 --out examples/sample-run-egfr
  ```

- **Re-prove every figure is real** (re-pulls each value from its live source and
  checks the top ligand SMILES are byte-equal to ChEMBL):

  ```bash
  python3 cad/verify.py --run examples/sample-run-egfr
  ```

  Counts in `dossier.json` (PDB structures, ChEMBL activity records, known drugs)
  grow as the public databases grow, so over time `verify.py` may report `DRIFT`
  (same order of magnitude — not a fabrication) rather than an exact `PASS`. The
  SMILES identity check and the deterministic recomputes should always `PASS`.
  Re-running the pipeline command above refreshes this snapshot to current values.

## What's in here

| File | What it is |
|------|------------|
| `SUMMARY.md` | One-page tie-together + the exact next (docking) command |
| `dossier.json` | Druggability snapshot: function, # PDB structures, ChEMBL ligands, known drugs |
| `hits.csv` | 25 ranked ligand candidates (SMILES + ChEMBL links) for docking/ADMET |
| `structures/8A27.pdb` | Best experimental EGFR structure (from RCSB PDB) |
| `binding_site.json` | Docking box computed from the co-crystal ligand envelope |
| `cost_benefit.json` | Modality/phase-level feasibility benchmark (**not** target-specific) |
| `provenance.json` | Every reported figure → origin (`fetched`/`computed`) + source + re-verify URL |

**Research only.** A computational hit is a hypothesis for experimental follow-up,
not proof of anything. Not medical advice, not a treatment recommendation.
