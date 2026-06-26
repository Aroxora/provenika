# Redocking validation — real, measured, at benchmark scale

This is an **actual** run of the pipeline's docking against AutoDock Vina, so its accuracy is
*measured*, not asserted. It answers "is it validated?" the only honest way: run the standard
redocking test — dock a known co-crystal ligand back into its receptor and measure RMSD to the
crystallographic pose (≤ 2 Å = correct) — on a real set, and report exactly what came out.

## The benchmark-scale result

A 39-complex oncology co-crystal set (kinase inhibitors + a few others), ligands auto-detected,
prepped with **Meeko + pdb2pqr**, docked with **AutoDock Vina 1.2.7** (fixed seed, focused box),
RMSD by symmetry-aware **`obrms`**. Run in parallel locally (~20 min). Machine-readable:
[`batch_results.json`](batch_results.json); runner: [`batch_redock.py`](batch_redock.py).

| Metric | Value |
|---|---|
| Candidates | 39 |
| **Evaluable** (fetched + docked + RMSD-matched) | **27** |
| **Correct pose (≤2 Å)** | **17 / 27 = 63%** |
| Median RMSD | **1.39 Å** |
| Mean RMSD | 2.12 Å |
| Self-filtered | 12 (11 `obrms` couldn't match large flexible ligands; 1 no drug-like ligand) |

**63% success at a median 1.39 Å** is squarely in the published range for AutoDock Vina redocking
on diverse sets (~50–70% ≤2 Å). It is a real, honest figure — not cherry-picked.

Examples both ways (from `batch_results.json`): excellent — 4Z3V (BTK) 0.21 Å, 3G0E (KIT) 0.46 Å,
1T46 (imatinib/KIT) 0.62 Å, 3OG7 (vemurafenib/BRAF) 0.53 Å, 1M17 (erlotinib/EGFR) 1.39 Å; poor —
1XKK (lapatinib) 2.9 Å, 2ITY (gefitinib) 3.5 Å, 4HJO 5.8 Å.

## How to reproduce

```bash
# Vina + Open Babel via micromamba (standalone, no admin); Meeko + pdb2pqr via pip
micromamba create -p ./dockenv -c conda-forge vina openbabel && pip install meeko pdb2pqr
export PATH=$PWD/dockenv/bin:$PATH
python3 examples/validation-redock/batch_redock.py      # parallel, ~20 min
# or a single curated trio:
python3 cad/validate.py --redock cad/validation_benchmark.json --json
```

## The honest story behind these numbers

The passing figure was *earned*, and the failures along the way are the point of validation:
1. **The harness was broken** — it produced poses but errored on *every* RMSD. Fixed (RCSB SMILES
   template for docking + `obrms`).
2. **Crude prep failed the science** — Open Babel-only prep redocked erlotinib at 7.9 Å. Upgrading
   to Meeko + pdb2pqr brought it to ~1.4 Å. `dock.py` now uses them when present (Open Babel fallback).
3. **At scale it's 63%, not 100%** — the encouraging 2/2 on three complexes was optimistic; the
   honest at-scale number is lower, as it should be.

## Known limits of this validation (so a PASS isn't over-read)

- **`obrms` can't RMSD-match ~11 of the candidates** (large/flexible ligands like imatinib in ABL):
  they dock, but the crystal-vs-docked molecule graphs don't align. That's a comparison-robustness
  gap (a template-based atom map would help), not a docking failure — but it means the 27 evaluable
  skew toward smaller, more rigid ligands.
- A 39-complex set is **not** the full Astex/PDBbind; a rigorous claim needs hundreds of complexes
  and cross-docking.
- Redocking measures **pose reproduction** — *necessary, not sufficient*. It is **not** prospective
  accuracy, **not** affinity/enrichment validation, and **never** clinical validation.

Bottom line: the docking **reproduces known binding modes at a credible rate (63%, median 1.39 Å)** —
*measured*. The tool remains research-grade in-silico triage; its output is a hypothesis for the wet
lab, and it is never a clinical instrument.
