# Redocking validation — real, measured on AWS

This is an **actual** run of the pipeline's docking against AutoDock Vina, so its accuracy is
*measured*, not asserted. Dock a known co-crystal ligand back into its receptor and measure the
heavy-atom RMSD to the crystallographic pose (≤ 2 Å = correct), over a 39-complex oncology set.

## The result (produced on AWS)

Run on an **AWS EC2 c6i.2xlarge** with the conda-forge stack — **AutoDock Vina f458505-mod, Open
Babel 3.1.0, Meeko 0.7.1, pdb2pqr 3.7.1** (fixed seed 42, focused box, RMSD by symmetry-aware
`obrms` with an RDKit template fallback). Machine-readable: [`batch_results.json`](batch_results.json);
runner: [`batch_redock.py`](batch_redock.py).

| Metric | Value |
|---|---|
| Candidates | 39 |
| **Evaluable** | **38** |
| **Correct pose (≤ 2 Å)** | **20 / 38 = 52.6%** |
| Median RMSD | **1.90 Å** |
| Mean RMSD | 2.68 Å |

Examples both ways (from `batch_results.json`): excellent — 4Z3V (BTK) 0.22 Å, 1KE5 (CDK2) 0.41 Å,
1A9U (p38) 0.53 Å, 3CS9 0.55 Å, 1T46 (imatinib/KIT) 0.63 Å, 1IEP (imatinib/ABL) 1.90 Å; poor (real
docking misses, honestly kept) — 1OUK 6.5 Å, 2J5F 6.1 Å, 3OG7 5.9 Å.

## Two real bugs this run surfaced (and fixed)

Executing on a clean host — not just unit-testing — caught two genuine bugs:

1. **All-chains reference extraction.** The crystal reference was built from the ligand resname
   across *every chain*, so a multi-copy structure compared 2 copies against the 1-copy docked pose
   and the RMSD exploded to **50–70 Å** (physically impossible in a focused box). Fixed to extract the
   single copy the box was built from. This alone lifted the score **37.8% → 52.6%**, mean **13.2 → 2.7 Å**
   (1IEP 62 → 1.9, 2HYY 53 → 1.2, 4XUF 70 → 1.4, 1UWH 27 → 0.7, 4RZV 39 → 1.5).
2. **Missing `gemmi`.** Meeko 0.7+ imports `gemmi`, which pip didn't pull in; without it dock.py
   silently fell back to the ~7.9 Å Open-Babel prep. Now declared in `cad/requirements-docking.txt`.

## How to reproduce (any Vina-equipped host)

```bash
make setup-docking          # conda vina+openbabel + pip meeko pdb2pqr gemmi rdkit
python3 cad/dock.py --check # expect: Ready to dock (docking-grade prep)
make redock                 # the 39-complex batch (parallel)
# Re-derive the committed summary from its own rows, offline (no Vina, no network):
python3 cad/validate.py --recheck examples/validation-redock/batch_results.json
```

**52.6% at a 1.90 Å median** is squarely in the published range for AutoDock Vina redocking on diverse
sets. It is a real, honest figure — redocking reproduces a *known* binding mode, a necessary check,
**not** proof of prospective accuracy. Research only; not medical advice.
