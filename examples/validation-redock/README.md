# Redocking validation — a real, measured run (not a badge)

This is an **actual** run of `cad/validate.py --redock` against AutoDock Vina, so the pipeline's
docking is *measured* rather than asserted. It is the honest answer to "is it validated?": we ran
the standard redocking test — dock a known co-crystal ligand back into its receptor and measure the
RMSD to the crystallographic pose (≤ 2 Å = correct) — and report exactly what came out.

## How it was produced (reproducible)

```bash
# Vina + Open Babel via micromamba (standalone, no admin) — see docs/REAL-CAD-ROADMAP.md
micromamba create -p ./dockenv -c conda-forge vina openbabel
export PATH=$PWD/dockenv/bin:$PATH
python3 cad/validate.py --redock cad/validation_benchmark.json --out runs/validation --json
```

Tooling: **AutoDock Vina 1.2.7**, **Open Babel 3.1.1**, RDKit 2026.03.2. RMSD via `obrms`
(symmetry-aware, in-place). See [`results.json`](results.json) for the machine-readable record.

## The result — reported straight

| Complex | Ligand | Redock RMSD | Correct (≤2 Å)? |
|---|---|---|---|
| **3POZ** | TAK-285 | **1.15 Å** | ✅ yes |
| **1M17** | erlotinib | **7.86 Å** | ❌ no |
| **1IEP** | imatinib | — | ⚠️ ligand prep failed (Open Babel PDBQT) |

**1 of 2 evaluable complexes redocked correctly (mean 4.5 Å).**

## What this honestly means

- The pipeline **can** reproduce a crystallographic binding mode (3POZ, 1.15 Å) — so the setup is
  not broken in principle.
- It **fails** on others (1M17, 7.86 Å). The likely causes are the **crude preparation** (no proper
  receptor protonation/charges; Open Babel ligand PDBQT rather than a docking-grade prep like Meeko)
  and flexible ligand tails that inflate all-atom RMSD; the oversized default box is a minor factor
  (tightening it from 8→2 Å padding moved 1M17 only from ~7.7 to ~4.7 Å).
- One ligand (imatinib) **could not be prepared** into a Vina-acceptable PDBQT at all.
- **Docking is stochastic** (Vina uses a random seed), so re-runs vary by a few Å — these are not
  fixed numbers.

## What it does NOT mean

A redocking benchmark — especially a 3-complex starter set — measures **pose reproduction**, a
*necessary but not sufficient* check. It is **not** prospective accuracy, **not** an enrichment or
affinity validation, and emphatically **not** clinical validation. The honest headline stands: this
is research-grade in-silico triage; treat docking output as a hypothesis for the wet lab.

## Where this leaves "is it validated?"

Better than before — **measured, not unrun** — but the measurement says the current docking setup
does **not** reliably reproduce known poses. Real validation would need a docking-grade prep
pipeline (Meeko + receptor protonation), a larger benchmark (Astex/PDBbind), and fixed seeds — and
even then it would validate the *method*, never make the tool clinical.
