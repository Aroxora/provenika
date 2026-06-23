# Roadmap: real computer-aided drug discovery (CADD)

The reference/template layer of this repo (`src/tools/cancer/discovery/`) deliberately
does **not** claim to do computer-aided *design*. This document describes a real,
**open-source and runnable** CADD pipeline, what is implemented today, and the honest
limits of each stage.

> Nothing in a computational pipeline proves a molecule is safe or effective. Docking
> scores, QSAR predictions, and ADMET models are **triage and prioritisation aids** with
> well-documented error rates. Any hit must be confirmed in vitro and in vivo. None of
> this is medical advice.

## Pipeline stages

| Stage | What it does | Open tooling | Status in this repo |
|-------|--------------|--------------|---------------------|
| 1. Target selection & evidence | Confirm the target is real, druggable, disease-linked; count structures & known drugs | UniProt + ChEMBL + PDB | **implemented** — `cad/target_report.py` |
| 2. Ligand-based virtual triage | Rank known/active chemotypes by potency + drug-likeness; similarity; novelty filter; CSV export | ChEMBL REST; RDKit (descriptors, ECFP4 Tanimoto) | **implemented** — `cad/virtual_triage.py` |
| 3. Structure acquisition | Get a 3-D receptor structure (or a confident model) | RCSB PDB + AlphaFold DB | **implemented** — `cad/fetch_structure.py` |
| 4. Binding-site / docking box | Box from the co-crystal ligand envelope (center+size for Vina) | stdlib PDB parse | **implemented** — `cad/binding_site.py` (fpocket/P2Rank still optional for apo targets) |
| 5. Structure-based docking | Generate poses + scores for candidates vs. the pocket | AutoDock Vina + Open Babel | **implemented** — `cad/dock.py` (gated on the real binaries) |
| 6. Cheminformatics filtering / liabilities | Drug-likeness rule sets + PAINS/Brenk structural alerts + scaffold + similarity | RDKit | **implemented** — `cad/cheminformatics.py` |
| 7. Triage report | Combine evidence into a ranked, cited shortlist | this repo | **implemented** — `cad/run_pipeline.py` → `SUMMARY.md` |

**Strategy add-ons:** `cad/cost_benefit.py` scores a proposed program's approval probability,
expected cost/time, and risk-adjusted return (public BIO/Informa/DiMasi benchmarks);
`cad/news_update.py` (+ the `news-update` GitHub Action) keeps an intelligence digest current.
`cad/run_pipeline.py` runs stages 1–4, the optional cheminformatics liability pass (stage 6 —
PAINS/Brenk + GSK 4/400 / Pfizer 3/75 → `liabilities.json`, when RDKit is present), and the
cost-benefit add-on end-to-end, writing the triage report (`SUMMARY.md`). It degrades gracefully:
if one public source is down it emits a clearly-marked partial dossier rather than failing.
Structure-based docking (stage 5) is the explicit manual next step
because it needs a chosen pocket and the Vina binary — run `python3 cad/dock.py --check` first to
confirm Vina + Open Babel are installed. If the target can't be resolved, the pipeline writes
nothing and exits non-zero (no fabricated verdict).

## Stages 1–2 — implemented today

**Stage 1 — `cad/target_report.py`** produces a cited druggability dossier from UniProt
(protein, function, PDB-structure count → docking feasibility) and ChEMBL (number of
potent measured ligands, known mechanism-of-action drugs). Run it first to decide whether
a target is worth pursuing:

```bash
python3 cad/target_report.py --target EGFR          # human-readable dossier
python3 cad/target_report.py --target BTK --json    # machine-readable
```

**Stage 2 — `cad/virtual_triage.py`** is a working ligand-based triage built on real,
public, experimental data (ChEMBL bioactivities). It:

1. Resolves a target name to a ChEMBL target (prefers single human protein).
2. Pulls the most potent measured ligands (IC50/Ki/Kd/EC50 → pChEMBL).
3. Joins ChEMBL-computed physicochemical / drug-likeness properties
   (MW, cLogP, HBD/HBA, TPSA, Lipinski Ro5 violations, QED).
4. Ranks by a transparent score (potency + drug-likeness, optional 2-D similarity to a
   query molecule via RDKit ECFP4 Tanimoto).

```bash
python3 cad/virtual_triage.py --target EGFR --min-pchembl 8 --out egfr_hits.csv  # export
python3 cad/virtual_triage.py --target BTK --exclude-approved          # novel chemotypes only
python3 cad/virtual_triage.py --target BTK --query "CC(=O)Nc1cccnc1"   # similarity (needs RDKit)
python3 cad/virtual_triage.py --target "KRAS G12C" --json
```

Dependencies: Python 3 standard library. RDKit is optional (`pip install rdkit`) and
unlocks `--query` similarity and additional descriptors.

**Validity caveats.** This is hypothesis *generation*: it surfaces chemotypes with
measured activity against the target and reasonable drug-likeness. It does not establish
selectivity, cell activity, or safety, and ChEMBL coverage is uneven across targets.

## How to add Stages 3–6 (concrete, open-source)

```text
# Structure + pocket
- Pull receptor:  RCSB PDB (data.rcsb.org)  or  AlphaFold DB (alphafold.ebi.ac.uk)
- Detect pockets: fpocket  (https://github.com/Discngine/fpocket)
                  P2Rank   (https://github.com/rdk/p2rank)

# Docking (local, CPU)
- Prep ligands/receptor: Open Babel + Meeko (PDBQT)
- Dock:                  AutoDock Vina / Smina  ->  pose + ΔG estimate (kcal/mol)
- Rescore (optional):    Gnina (CNN scoring)

# ADMET / liabilities
- RDKit filters: PAINS, Brenk, reactive groups, Lipinski/Veber
- ADMET-AI (https://github.com/swansonk14/admet_ai) for absorption/tox endpoints
```

Each stage should write a cited, machine-readable artifact (JSON) so the final triage
report can show provenance for every number.

## Explicitly out of scope (for now)

- Generative / de novo molecule design (REINVENT, diffusion models) — high compute,
  high false-positive rate, needs careful evaluation harness.
- Free-energy perturbation (FEP) — accurate but expensive and force-field sensitive.
- Anything that produces a clinical recommendation. This pipeline outputs research
  hypotheses for experimental follow-up only.
