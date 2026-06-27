# Experimental-validation request — Phosphatidylinositol 4,5-bisphosphate 3-kinase catalytic subunit alpha isoform

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | clinical status | record |
|---|---|---|---|---|---|
| 1 | CHEMBL5198796 | — | 10.37 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5198796/) |
| 2 | CHEMBL5199631 | — | 10.38 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5199631/) |
| 3 | CHEMBL5916599 | — | 10.4 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5916599/) |
| 4 | CHEMBL3770993 | — | 10.66 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3770993/) |
| 5 | CHEMBL5209168 | — | 10.28 | research/preclinical | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5209168/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

**All 5 prioritized candidates are research/preclinical compounds** — novel chemical-matter starting points, not approved drugs (a fresh-scaffold programme, not repurposing).

## Independent target validation (Open Targets) — PIK3CA

**Read-out:** strong human genetic support for breast cancer (genetic-evidence score 0.92) — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| breast cancer | 0.754 | 0.919 | — | 0.931 | [OT](https://platform.opentargets.org/evidence/ENSG00000121879/MONDO_0007254) |
| ovarian cancer | 0.734 | 0.786 | 0.874 | 0.178 | [OT](https://platform.opentargets.org/evidence/ENSG00000121879/MONDO_0008170) |
| breast adenocarcinoma | 0.728 | — | 0.916 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000121879/MONDO_0004988) |
| hepatocellular carcinoma | 0.674 | 0.695 | 0.709 | 0.076 | [OT](https://platform.opentargets.org/evidence/ENSG00000121879/MONDO_0007256) |
| non-small cell lung carcinoma | 0.668 | — | 0.764 | 0.188 | [OT](https://platform.opentargets.org/evidence/ENSG00000121879/MONDO_0005233) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000121879). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

## Standard of care for this target (what a new molecule must beat)

Drugs that already act on this target, from ChEMBL's known-mechanism data — the existing bar. A new candidate has to earn its place against these on **potency, selectivity, resistance coverage, or tolerability**, not just bind.

| Drug | Stage | mechanism | record |
|---|---|---|---|
| Alpelisib | approved | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL2396661/) |
| Copanlisib Hydrochloride | approved | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3545068/) |
| Copanlisib | approved | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3218576/) |
| Inavolisib | approved | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL4650215/) |
| Fimepinostat | phase 2 | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3622533/) |
| Serabelisib | phase 2 | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3935857/) |
| Bay-1082439 | phase 1 | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3644672/) |
| Pki-179 | phase 1 | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL1258517/) |
| Pwt-33579 | phase 1 | inhibitor | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL3545323/) |

**Already approved against this target:** Alpelisib, Copanlisib Hydrochloride, Copanlisib, Inavolisib. The honest goal for a new molecule is a differentiated advantage over these, not merely activity.

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
Subject: Collaboration — experimental validation of Phosphatidylinositol 4,5-bisphosphate 3-kinase catalytic subunit alpha isoform candidate(s)

Hello,

I'm sharing a small, fully-cited computational prioritization for Phosphatidylinositol 4,5-bisphosphate 3-kinase catalytic subunit alpha isoform: public ChEMBL bioactivity re-ranked by structure-aware docking, with CHEMBL5198796 among the top candidates. These are hypotheses, not validated hits — I'm looking for a collaborator (or quote) to run the first experimental step: a biochemical IC50/Ki to confirm binding, then a selectivity panel.

Every figure is traceable to a public source and re-checkable in one command; I can send the SMILES, the docking poses, and the provenance manifest. Would this be a fit for your group/services, or is there a better route (e.g. an NCI DTP screening submission)?

Thank you,
[your name]
```
