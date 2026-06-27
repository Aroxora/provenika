# Using Provenika in mainland China · 在中国大陆实践使用

This is the practical guide for running Provenika **from inside mainland China** — where the network and
the bench look different. Everything here is real and verified; nothing is a workaround that hides a
limitation. Research only; not medical advice. 仅供研究，非医疗建议。

---

## 1. Run it locally — the hosted site may be blocked

The website ([provenika.com](https://provenika.com)) is on **Firebase Hosting (Google)**, which is
unreliable behind the Great Firewall, and it loads **Google Analytics**, also blocked. So **inside China,
use the command line** — the CADD pipeline is standard-library Python and runs entirely on your machine;
the analysis and its Markdown outputs do not depend on Google.

```bash
python3 cad/run_pipeline.py --target KRAS --modality small_molecule --phase phase1 \
    --incidence 60000 --price 150000 --out runs/kras
python3 cad/verify.py --run runs/kras                       # re-prove every figure from source
python3 cad/validation_package.py --run runs/kras --region cn   # China CROs + 中文 pitch (see §4)
```

## 2. Install with a domestic mirror (faster, reliable)

PyPI and the npm registry are slow or flaky from China; use a domestic mirror.

```bash
# Python deps via Tsinghua TUNA mirror
python3 -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
# (docking-grade extras, optional) Meeko + pdb2pqr:
python3 -m pip install -r cad/requirements-docking.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Node tools (only if you build the web app) via npmmirror
npm config set registry https://registry.npmmirror.com && npm install
```

## 3. Data sources — reachability from China

Every figure is fetched live from public sources. Reachability, in practice:

| Source | Used for | From China |
|---|---|---|
| **ChEMBL** (EBI, UK) | bioactivity triage | reachable; can be slow |
| **UniProt / RCSB / PDBe** | structures | reachable; PDBe (EU) is often faster than RCSB (US) |
| **Open Targets** (EBI) | target genetic validation | reachable; can be slow |
| **Europe PMC** | literature | reachable |
| **DeepSeek** (深度求索, China) | *optional* plain-language layer | **fast & domestic** — use this LLM |

For the **optional** explanation layer (`cad/explain.py`), use **DeepSeek** — it is China-accessible and
fast, and it is held to the same anti-hallucination contract (a number-guard rejects any figure the model
introduces that is not in the input data):

```bash
export DEEPSEEK_API_KEY=sk-...        # from platform.deepseek.com — keep it out of git
python3 cad/explain.py --run runs/kras
```

The core pipeline needs **no LLM and no key**; the explanation layer is the only place one is used.

## 4. Take it to the bench — domestic CROs (the practical advantage)

This is where being in China is an **advantage, not a constraint**: China hosts the world's largest
concentration of contract research organisations. Testing a hypothesis domestically means **no
cross-border compound shipping, domestic-currency invoicing, and Chinese-language contact.**

`python3 cad/validation_package.py --run <dir> --region cn` writes a `VALIDATION-REQUEST.md` whose
experiment chain points at **real, verified Chinese CROs**, and appends a ready-to-send **Simplified-
Chinese pitch** (it sends nothing; you decide who to contact). Capabilities below were each confirmed
against the company's own website — confirm current scope, eligibility and pricing directly.

| Step | Domestic route (verified) |
|---|---|
| **Confirm binding** (生化结合) | **Viva Biotech 维亚生物** — SPR/biophysics, X-ray co-crystallography, biochemical IC50 (SBDD) · **WuXi AppTec 药明康德** · **GenScript 金斯瑞** (make the purified target protein) |
| **Selectivity** (选择性) | **Pharmaron 康龙化成** — kinase profiling / off-target panels · **WuXi AppTec 药明康德** |
| **Cell** (细胞活性) | **Crown Bioscience 冠科生物** — 1000+ cancer cell lines, target engagement · **ChemPartner 睿智医药** |
| **ADMET / PK** | **Pharmaron 康龙化成 (DMPK)** — microsomes, hERG, Caco-2, in-vivo PK · **WuXi AppTec 药明康德 (DMPK)** |
| **In-vivo / translation** | **Crown Bioscience 冠科生物** — 2,500+ PDX & 200+ CDX oncology models · **SIMM 上海药物所 / 国家新药筛选中心** (academic collaboration) |
| **Clinical registry** | **ChiCTR 中国临床试验注册中心** — WHO ICTRP primary registry |

> The candidates are **public-data-prioritised hypotheses, not validated hits** — no binding, cell
> activity, selectivity, or safety has been measured. The Chinese pitch states this plainly
> (计算预测的候选化合物，尚未经过任何实验验证) and asks only for the first step: a biochemical IC50.

## 5. Honesty

Provenika replaces the *cheap, in-silico front* of discovery so fewer experiments are wasted — it does
**not** replace the wet lab or the clinic, in China or anywhere. Every number is fetched-from-source or
deterministically computed and re-checkable with `cad/verify.py`. No efficacy or safety claim is made.
仅供研究与决策支持，非医疗建议、非诊断、非治疗方案。
