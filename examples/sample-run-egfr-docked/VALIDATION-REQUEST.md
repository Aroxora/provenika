# Experimental-validation request — Epidermal growth factor receptor

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | record |
|---|---|---|---|---|
| 1 | CHEMBL5746224 | -9.5 | — | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5746224/) |
| 2 | CHEMBL5790648 | -8.82 | — | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5790648/) |
| 3 | CHEMBL174426 | -8.3 | — | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL174426/) |
| 4 | CHEMBL176582 | -8.21 | — | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL176582/) |
| 5 | CHEMBL6170958 | -7.77 | — | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL6170958/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

## Independent target validation (Open Targets) — EGFR

**Read-out:** strong human genetic support for head and neck squamous cell carcinoma (genetic-evidence score 0.82) — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| non-small cell lung carcinoma | 0.853 | 0.746 | 0.832 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0005233) |
| lung adenocarcinoma | 0.774 | 0.719 | 0.867 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0005061) |
| cancer | 0.737 | — | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0004992) |
| head and neck squamous cell carcinoma | 0.725 | 0.816 | 0.456 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0010150) |
| lung cancer | 0.717 | 0.794 | 0.699 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0008903) |
| breast cancer | 0.68 | 0.541 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000146648/MONDO_0007254) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000146648). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

## The experiments that would validate it (in order)

### 1. Confirm it binds
- **Question:** Does the prioritized compound actually bind the target, and how tightly?
- **Assay:** Biochemical potency (enzyme IC50/Ki) and a biophysical binding readout (SPR/ITC) on the prioritized compounds against the purified target.
- **Why now:** motivated by the ChEMBL consensus potency + the structure-aware docking re-rank (a predicted ΔG, not a measured Kd).
- **Where it can be run:**
  - [Reaction Biology](https://www.reactionbiology.com) — biochemical enzyme IC50/Ki + binding profiling
  - [Eurofins Discovery](https://www.eurofinsdiscovery.com) — enzyme & biophysical binding assays, custom IC50

### 2. Prove selectivity
- **Question:** Is it selective, or a promiscuous binder (a primary oncology liability)?
- **Assay:** An off-target / kinome selectivity panel on the top candidates.
- **Why now:** motivated by the run's n_potent_targets / selectivity flag (a ChEMBL proxy, not a measured panel).
- **Where it can be run:**
  - [Eurofins DiscoverX KINOMEscan](https://www.eurofinsdiscovery.com) — kinome-wide selectivity (competitive binding)
  - [Reaction Biology kinase panels](https://www.reactionbiology.com) — large biochemical kinase selectivity panels

### 3. Engage the target in a cell
- **Question:** Does it cross into cells, hit the target in situ, and kill the cancer cell?
- **Assay:** Cellular target-engagement (CETSA/NanoBRET) + viability/apoptosis in relevant tumour lines; NCI-60 for breadth.
- **Why now:** motivated by the computed developability flags (PAINS/Brenk, permeability liabilities).
- **Where it can be run:**
  - [NCI Developmental Therapeutics Program (NCI-60)](https://dtp.cancer.gov) — FREE 60-human-tumour-cell-line screening for qualifying compounds
  - [Charles River / WuXi AppTec](https://www.criver.com) — cellular potency, viability, and target-engagement assays

### 4. Establish ADMET / PK
- **Question:** Is it developable and safe enough to advance?
- **Assay:** In-vitro ADME (microsomes, hERG, Caco-2) and, if it advances, animal PK/tox.
- **Why now:** motivated by the computed physicochemical / Pfizer-3-75 / GSK-4-400 flags.
- **Where it can be run:**
  - [Charles River Laboratories](https://www.criver.com) — in-vitro ADME (microsomes, hERG, Caco-2) and PK
  - [Eurofins / WuXi ADME](https://www.eurofinsdiscovery.com) — ADMET liability panels

## Translation / collaboration routes

- [NCI Experimental Therapeutics (NExT)](https://dtp.cancer.gov/organization/dscb/index.htm) — NIH program supporting oncology agents through development
- [Structural Genomics Consortium (SGC)](https://www.thesgc.org) — open chemical-probe & target-validation collaborations

---
_Generated by `cad/validation_package.py` from a re-verifiable run. Provenika hands off a hypothesis; the wet lab decides what to test. Developed by ErosolarAI._

## Ready-to-send pitch (draft — sends nothing)

```
Subject: Collaboration — experimental validation of Epidermal growth factor receptor candidate(s)

Hello,

I'm sharing a small, fully-cited computational prioritization for Epidermal growth factor receptor: public ChEMBL bioactivity re-ranked by structure-aware docking, with CHEMBL5746224 among the top candidates. These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to run the first experimental step: a biochemical IC50/Ki to confirm binding, then a selectivity panel.

Every figure is traceable to a public source and re-checkable in one command; I can send the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your group/services, or is there a better route (e.g. an NCI DTP screening submission)?

Thank you,
[your name]
```
