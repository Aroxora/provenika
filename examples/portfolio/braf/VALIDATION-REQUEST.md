# Experimental-validation request — Serine/threonine-protein kinase B-raf

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | record |
|---|---|---|---|---|
| 1 | CHEMBL500659 | — | 10.7 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL500659/) |
| 2 | CHEMBL5885861 | — | 10.7 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5885861/) |
| 3 | CHEMBL527029 | — | 10.3 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL527029/) |
| 4 | CHEMBL4776565 | — | 9.92 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL4776565/) |
| 5 | CHEMBL498344 | — | 10.4 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL498344/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

## Independent target validation (Open Targets) — BRAF

**Read-out:** strong human genetic support (best genetic-evidence score 0.94) — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| cardiofaciocutaneous syndrome | 0.877 | 0.944 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0015280) |
| Noonan syndrome | 0.838 | 0.877 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0018997) |
| melanoma | 0.82 | 0.699 | 0.796 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0005105) |
| cardiofaciocutaneous syndrome 1 | 0.764 | 0.939 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0007265) |
| Noonan syndrome 7 | 0.759 | 0.93 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0013379) |
| LEOPARD syndrome 3 | 0.756 | 0.891 | — | — | [OT](https://platform.opentargets.org/evidence/ENSG00000157764/MONDO_0013380) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000157764). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

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
Subject: Collaboration — experimental validation of Serine/threonine-protein kinase B-raf candidate(s)

Hello,

I'm sharing a small, fully-cited computational prioritization for Serine/threonine-protein kinase B-raf: public ChEMBL bioactivity re-ranked by structure-aware docking, with CHEMBL500659 among the top candidates. These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to run the first experimental step: a biochemical IC50/Ki to confirm binding, then a selectivity panel.

Every figure is traceable to a public source and re-checkable in one command; I can send the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your group/services, or is there a better route (e.g. an NCI DTP screening submission)?

Thank you,
[your name]
```
