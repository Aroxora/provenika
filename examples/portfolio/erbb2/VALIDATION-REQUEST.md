# Experimental-validation request — Receptor tyrosine-protein kinase erbB-2

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | clinical status | record |
|---|---|---|---|---|---|
| 1 | CHEMBL5221067 | — | 9.85 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5221067/) |
| 2 | CHEMBL941 | — | 10.22 | approved drug | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL941/) |
| 3 | CHEMBL54091 | — | 8.96 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL54091/) |
| 4 | CHEMBL202360 | — | 8.72 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL202360/) |
| 5 | CHEMBL378144 | — | 8.62 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL378144/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

**1 of 5 prioritized candidates are already in clinical development or approved** — treat those as repurposing / fast-follow context, not novel IP (per-candidate status above).

## Independent target validation (Open Targets) — ERBB2

**Read-out:** strong human genetic support for lung cancer (genetic-evidence score 0.67) — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| non-small cell lung carcinoma | 0.779 | — | 0.715 | 0.982 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0005233) |
| cancer | 0.775 | — | — | 0.897 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0004992) |
| gastric cancer | 0.729 | 0.549 | 0.547 | 0.927 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0001056) |
| breast carcinoma | 0.697 | — | 0.608 | 0.938 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0004989) |
| gastric adenocarcinoma | 0.69 | — | 0.699 | 0.884 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0005036) |
| neoplasm | 0.678 | 0.243 | 0.456 | 0.961 | [OT](https://platform.opentargets.org/evidence/ENSG00000141736/MONDO_0005070) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000141736). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

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
Subject: Collaboration — experimental validation of Receptor tyrosine-protein kinase erbB-2 candidate(s)

Hello,

I'm sharing a small, fully-cited computational prioritization for Receptor tyrosine-protein kinase erbB-2: public ChEMBL bioactivity re-ranked by structure-aware docking, with CHEMBL5221067 among the top candidates. These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to run the first experimental step: a biochemical IC50/Ki to confirm binding, then a selectivity panel.

Every figure is traceable to a public source and re-checkable in one command; I can send the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your group/services, or is there a better route (e.g. an NCI DTP screening submission)?

Thank you,
[your name]
```
