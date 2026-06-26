# Redocking validation — a real, passing run (with docking-grade prep)

This is an **actual** run of `cad/validate.py --redock` against AutoDock Vina, so the pipeline's
docking is *measured*, not asserted. It is the honest answer to "is it validated?": we ran the
standard redocking test — dock a known co-crystal ligand back into its receptor and measure RMSD to
the crystallographic pose (≤ 2 Å = correct) — and report exactly what came out.

## The result (reproducible)

| Complex | Ligand | Redock RMSD | Correct (≤2 Å)? |
|---|---|---|---|
| **1M17** | erlotinib | **1.21 Å** | ✅ yes |
| **3POZ** | TAK-285 | **1.13 Å** | ✅ yes |
| **1IEP** | imatinib | — | ⚠️ docks, but crystal-vs-docked perception won't RMSD-match |

**2 of 2 evaluable complexes redocked correctly (mean 1.17 Å).** Machine-readable record:
[`results.json`](results.json).

## How it was produced (reproducible)

```bash
# Vina + Open Babel via micromamba (standalone, no admin); Meeko + pdb2pqr via pip
micromamba create -p ./dockenv -c conda-forge vina openbabel
pip install meeko pdb2pqr
export PATH=$PWD/dockenv/bin:$PATH
python3 cad/validate.py --redock cad/validation_benchmark.json --out runs/validation --json
```

Tooling: **AutoDock Vina 1.2.7**, **Meeko 0.7.1** (ligand prep), **pdb2pqr** (receptor protonation),
**Open Babel 3.1.1**, RDKit 2026.03.2. RMSD via `obrms` (symmetry-aware, in-place). A **fixed seed
(42)** and a **focused 4 Å box** make the run reproducible.

## The honest story behind these numbers

This passing result was *earned*, and the failures along the way are the point of validation:

1. **First run exposed a harness bug:** the validator produced docked poses but errored on *every*
   RMSD ("topology mismatch") — it measured nothing. Fixed (RCSB SMILES template for docking + `obrms`).
2. **Then the crude prep failed the science:** with Open Babel-only prep, erlotinib redocked at
   **7.9 Å** (wrong pose) and imatinib wouldn't prep at all. So "it has a validation harness" was not
   the same as "it validates."
3. **Docking-grade prep fixed it:** Meeko (ligand) + pdb2pqr (receptor protonation) + a focused box
   brought erlotinib to **1.21 Å** and TAK-285 to **1.13 Å**. `dock.py` now uses these when present
   and falls back to Open Babel otherwise.

## What it does NOT mean

A redocking benchmark — especially a **3-complex starter set** — measures **pose reproduction**, a
*necessary but not sufficient* check. It is **not** prospective accuracy, **not** enrichment or
affinity validation, and emphatically **not** clinical validation. One ligand (imatinib) still can't
be RMSD-scored here. A rigorous claim would need a large public benchmark (Astex/PDBbind) and
cross-docking. The honest headline stands: research-grade in-silico triage; docking output is a
hypothesis for the wet lab, and the tool is **never** a clinical instrument.
