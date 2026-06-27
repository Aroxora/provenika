# Experimental-validation request — Tyrosine-protein kinase BTK

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | record |
|---|---|---|---|---|
| 1 | CHEMBL5824452 | — | 10.0 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5824452/) |
| 2 | CHEMBL6029889 | — | 10.0 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL6029889/) |
| 3 | CHEMBL5886785 | — | 10.03 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5886785/) |
| 4 | CHEMBL5741138 | — | 10.3 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5741138/) |
| 5 | CHEMBL5993286 | — | 10.22 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5993286/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

## Independent target validation (Open Targets) — BTK

**Read-out:** weak human genetic support for neoplasm (genetic-evidence score 0.20).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| B-cell chronic lymphocytic leukemia | 0.719 | — | 0.608 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0004948) |
| mantle cell lymphoma | 0.693 | — | 0.456 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0018876) |
| neoplasm | 0.593 | 0.195 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0005070) |
| non-Hodgkin lymphoma | 0.544 | — | 0.397 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0018908) |
| diffuse large B-cell lymphoma | 0.526 | — | 0.529 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0018905) |
| lymphoplasmacytic lymphoma | 0.473 | — | 0.456 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000010671/MONDO_0000432) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000010671). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

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
Subject: Collaboration — experimental validation of Tyrosine-protein kinase BTK candidate(s)

Hello,

I'm sharing a small, fully-cited computational prioritization for Tyrosine-protein kinase BTK: public ChEMBL bioactivity re-ranked by structure-aware docking, with CHEMBL5824452 among the top candidates. These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to run the first experimental step: a biochemical IC50/Ki to confirm binding, then a selectivity panel.

Every figure is traceable to a public source and re-checkable in one command; I can send the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your group/services, or is there a better route (e.g. an NCI DTP screening submission)?

Thank you,
[your name]
```
