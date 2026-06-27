# Experimental-validation request — GTPase KRas

> **What this is:** a computational *prioritization* from Provenika (public ChEMBL bioactivity re-ranked by structure-aware AutoDock Vina docking). These are **hypotheses for the bench, not validated hits** — no binding, cell activity, selectivity, or safety has been measured. Every figure is fetched-from-source or deterministically computed and re-checkable with `cad/verify.py`. Research only; not medical advice.

> **中国实验路线 (China bench routes).** Bench routes below are mainland-China CROs (no cross-border compound shipping, domestic invoicing, Chinese-language contact). Capabilities were verified against each company's own site; confirm current scope, eligibility and pricing directly.

> **就地运行 (run locally).** Inside China: run this locally — `python3 cad/run_pipeline.py …` then `python3 cad/validation_package.py --run <dir> --region cn`. The hosted site (Firebase/Google) may be blocked; the CLI and these files are not. For the optional plain-language layer use DeepSeek (China-accessible): set DEEPSEEK_API_KEY and run cad/explain.py.

## Candidates to test (5)

| # | ChEMBL ID | predicted ΔG (kcal/mol)* | consensus pChEMBL | record |
|---|---|---|---|---|
| 1 | CHEMBL5573020 | — | 9.85 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5573020/) |
| 2 | CHEMBL5562993 | — | 9.8 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5562993/) |
| 3 | CHEMBL5572821 | — | 9.77 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5572821/) |
| 4 | CHEMBL5570195 | — | 9.74 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5570195/) |
| 5 | CHEMBL5569602 | — | 9.72 | [ChEMBL](https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL5569602/) |

_*Vina ΔG is a predicted ranking aid, NOT a measured affinity. SMILES in the run's `hits.csv` / `docked_hits.csv`._

## Independent target validation (Open Targets) — KRAS

**Read-out:** strong human genetic support for gastric cancer (genetic-evidence score 0.90) — genetically-supported mechanisms are ~2x more likely to be approved (Nelson 2015).

| Disease | Overall | Genetic | Somatic | Known-drug | evidence |
|---|---|---|---|---|---|
| non-small cell lung carcinoma | 0.804 | — | 0.84 | 0.946 | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0005233) |
| gastric cancer | 0.768 | 0.896 | 0.684 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0001056) |
| acute myeloid leukemia | 0.749 | 0.803 | 0.789 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0018874) |
| lung adenocarcinoma | 0.703 | — | 0.822 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0005061) |
| urinary bladder cancer | 0.702 | 0.828 | 0.789 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0001187) |
| juvenile myelomonocytic leukemia | 0.693 | 0.747 | 0.724 | — | [OT](https://platform.opentargets.org/evidence/ENSG00000133703/MONDO_0011908) |

_Source: [Open Targets Platform (platform.opentargets.org)](https://platform.opentargets.org/target/ENSG00000133703). Open Targets aggregates evidence; scores are heuristic, not outcome predictions. Human genetic support raises a population-level prior of clinical success (Nelson, Nat Genet 2015), not a per-program forecast; absence is not evidence against. Germline signal translates imperfectly to somatic oncology. Research only._

## The experiments that would validate it (in order)

### 1. Confirm it binds
- **Question:** Does the prioritized compound actually bind the target, and how tightly?
- **Assay:** Biochemical potency (enzyme IC50/Ki) and a biophysical binding readout (SPR/ITC) on the prioritized compounds against the purified target.
- **Why now:** motivated by the ChEMBL consensus potency + the structure-aware docking re-rank (a predicted ΔG, not a measured Kd).
- **Where it can be run:**
  - [Viva Biotech 维亚生物](https://www.vivabiotech.com) — SPR/biophysical binding, X-ray co-crystallography & biochemical IC50 on a structure-based (SBDD) platform — Shanghai
  - [WuXi AppTec 药明康德 (WuXi Biology)](https://www.wuxiapptec.com) — biochemical & binding assays across an integrated biology platform — Shanghai
  - [GenScript 金斯瑞](https://www.genscript.com) — gene synthesis + recombinant protein/peptide production to make the purified target for binding assays — Nanjing

### 2. Prove selectivity
- **Question:** Is it selective, or a promiscuous binder (a primary oncology liability)?
- **Assay:** An off-target / kinome selectivity panel on the top candidates.
- **Why now:** motivated by the run's n_potent_targets / selectivity flag (a ChEMBL proxy, not a measured panel).
- **Where it can be run:**
  - [Pharmaron 康龙化成](https://www.pharmaron.com) — in-vitro biology incl. kinase profiling & biochemistry for off-target / selectivity panels — Beijing
  - [WuXi AppTec 药明康德](https://www.wuxiapptec.com) — biology selectivity / target-profiling panels

### 3. Engage the target in a cell
- **Question:** Does it cross into cells, hit the target in situ, and kill the cancer cell?
- **Assay:** Cellular target-engagement (CETSA/NanoBRET) + viability/apoptosis in relevant tumour lines; NCI-60 for breadth.
- **Why now:** motivated by the computed developability flags (PAINS/Brenk, permeability liabilities).
- **Where it can be run:**
  - [Crown Bioscience 冠科生物](https://www.crownbio.com) — oncology cell assays across 1000+ cancer cell lines; viability & target-engagement — Suzhou/Taicang
  - [ChemPartner 睿智医药](https://www.chempartner.com) — in-vitro pharmacology — oncology functional & cell-based assays — Shanghai

### 4. Establish ADMET / PK
- **Question:** Is it developable and safe enough to advance?
- **Assay:** In-vitro ADME (microsomes, hERG, Caco-2) and, if it advances, animal PK/tox.
- **Why now:** motivated by the computed physicochemical / Pfizer-3-75 / GSK-4-400 flags.
- **Where it can be run:**
  - [Pharmaron 康龙化成 (DMPK)](https://www.pharmaron.com) — in-vitro ADMET (liver microsomes, hERG, Caco-2) + in-vivo PK — Beijing/Ningbo
  - [WuXi AppTec 药明康德 (DMPK)](https://www.wuxiapptec.com) — integrated DMPK / ADME testing platform

## Translation / collaboration routes

- [Crown Bioscience 冠科生物](https://www.crownbio.com) — in-vivo oncology efficacy — 2,500+ PDX and 200+ CDX models — Suzhou/Taicang
- [SIMM 上海药物所 (CAS) / National Center for Drug Screening 国家新药筛选中心](https://www.simm.cas.cn) — academic drug-discovery collaboration & high-throughput screening route (not fee-for-service) — Shanghai
- [ChiCTR 中国临床试验注册中心](https://www.chictr.org.cn) — China's primary clinical-trial registry (WHO ICTRP primary registry)

---
_Generated by `cad/validation_package.py` from a re-verifiable run. Provenika hands off a hypothesis; the wet lab decides what to test. Developed by ErosolarAI._

## 可直接发送的中文邮件（草稿 — 不会自动发送）

```
主题：合作咨询 — GTPase KRas 候选化合物的实验验证

您好，

我们基于公开的 ChEMBL 生物活性数据，并结合基于蛋白结构的 AutoDock Vina 分子对接进行重新打分排序，得到了一小批针对 GTPase KRas 的候选化合物（其中 CHEMBL5573020 位列前茅）。

需要特别说明：这些是计算预测的候选化合物，尚未经过任何实验验证 —— 结合活性、细胞活性、选择性与安全性均未测定。

我们希望寻找合作方（或获取报价）来完成第一步实验：生化 IC50/Ki 以确认与靶点的结合，随后进行选择性测定（off-target / 激酶谱）。

所有数值均可追溯至公开数据来源，并可用一条命令复核；我可提供化合物 SMILES、对接构象以及完整的数据来源清单。请问这是否符合贵公司/团队的服务范围？如有更合适的方案，也烦请告知。

顺颂
商祺
[您的姓名]
```
