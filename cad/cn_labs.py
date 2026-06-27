#!/usr/bin/env python3
"""
China-region experimental-validation routes (中国实验验证路线).

Why this exists: Provenika stops at a cited computational hypothesis; only the wet lab proves it. For a
researcher IN mainland China, the practical bench path is domestic — China hosts the world's largest
concentration of pharma CROs, so testing a hypothesis here means no cross-border compound shipping,
domestic-currency invoicing, Chinese-language contact, and shorter logistics. This maps each step of the
experimental chain to REAL, verified Chinese CROs (and one academic route), and provides a Simplified-
Chinese pitch a researcher can actually send.

Honesty / no-hallucination: every organisation named is a real, publicly-listed-or-well-known CRO, and
every capability stated was confirmed against that company's own website (see the commit that added this
file). URLs are root domains — confirm current service scope, eligibility, and pricing directly; no
price, turnaround, or contact email is invented. These are hypotheses for the bench, not validated hits;
no efficacy or safety claim is made. Research only; not medical advice.

This module is data + a Chinese pitch; cad/validation_package.py imports it under `--region cn`.
"""

from __future__ import annotations

# Keyed exactly like validation_package.PARTNERS (binding / selectivity / cell / admet / translation) so
# it is a drop-in region swap. Each entry: (display name incl. 中文, root URL, verified service note).
PARTNERS_CN = {
    "binding": [
        ("Viva Biotech 维亚生物", "https://www.vivabiotech.com",
         "SPR/biophysical binding, X-ray co-crystallography & biochemical IC50 on a structure-based (SBDD) platform — Shanghai"),
        ("WuXi AppTec 药明康德 (WuXi Biology)", "https://www.wuxiapptec.com",
         "biochemical & binding assays across an integrated biology platform — Shanghai"),
        ("GenScript 金斯瑞", "https://www.genscript.com",
         "gene synthesis + recombinant protein/peptide production to make the purified target for binding assays — Nanjing"),
    ],
    "selectivity": [
        ("Pharmaron 康龙化成", "https://www.pharmaron.com",
         "in-vitro biology incl. kinase profiling & biochemistry for off-target / selectivity panels — Beijing"),
        ("WuXi AppTec 药明康德", "https://www.wuxiapptec.com",
         "biology selectivity / target-profiling panels"),
    ],
    "cell": [
        ("Crown Bioscience 冠科生物", "https://www.crownbio.com",
         "oncology cell assays across 1000+ cancer cell lines; viability & target-engagement — Suzhou/Taicang"),
        ("ChemPartner 睿智医药", "https://www.chempartner.com",
         "in-vitro pharmacology — oncology functional & cell-based assays — Shanghai"),
    ],
    "admet": [
        ("Pharmaron 康龙化成 (DMPK)", "https://www.pharmaron.com",
         "in-vitro ADMET (liver microsomes, hERG, Caco-2) + in-vivo PK — Beijing/Ningbo"),
        ("WuXi AppTec 药明康德 (DMPK)", "https://www.wuxiapptec.com",
         "integrated DMPK / ADME testing platform"),
    ],
    "translation": [
        ("Crown Bioscience 冠科生物", "https://www.crownbio.com",
         "in-vivo oncology efficacy — 2,500+ PDX and 200+ CDX models — Suzhou/Taicang"),
        ("SIMM 上海药物所 (CAS) / National Center for Drug Screening 国家新药筛选中心", "https://www.simm.cas.cn",
         "academic drug-discovery collaboration & high-throughput screening route (not fee-for-service) — Shanghai"),
    ],
}

# A real, non-CRO reference for the later clinical stage — China's own trial registry.
CLINICAL_REGISTRY_CN = ("ChiCTR 中国临床试验注册中心", "https://www.chictr.org.cn",
                        "China's primary clinical-trial registry (WHO ICTRP primary registry)")

# One-line note shown above the China lab lists.
REGION_NOTE_CN = ("Bench routes below are mainland-China CROs (no cross-border compound shipping, domestic "
                  "invoicing, Chinese-language contact). Capabilities were verified against each company's "
                  "own site; confirm current scope, eligibility and pricing directly.")

# Practical reachability note — the deployed website is on Firebase (Google), which is unreliable behind
# the Great Firewall; the local CLI + this markdown is the China-reliable path; DeepSeek is the
# China-fast LLM for the optional explanation layer (cad/explain.py).
REACHABILITY_NOTE_CN = ("Inside China: run this locally — `python3 cad/run_pipeline.py …` then "
                        "`python3 cad/validation_package.py --run <dir> --region cn`. The hosted site "
                        "(Firebase/Google) may be blocked; the CLI and these files are not. For the "
                        "optional plain-language layer use DeepSeek (China-accessible): set "
                        "DEEPSEEK_API_KEY and run cad/explain.py.")


def pitch_email_cn(pkg: dict) -> str:
    """Ready-to-send Simplified-Chinese pitch. Honest (predicted candidates, not validated hits), asks
    only for the first step (biochemical IC50) as a quote/collaboration, invents no price/contact, and
    leaves [您的姓名] for the human to fill. Sends nothing."""
    t = pkg.get("target", "靶点")
    cands = pkg.get("candidates") or []
    top = cands[0]["chembl_id"] if cands else "若干优先候选化合物"
    return (
        f"主题：合作咨询 — {t} 候选化合物的实验验证\n\n"
        f"您好，\n\n"
        f"我们基于公开的 ChEMBL 生物活性数据，并结合基于蛋白结构的 AutoDock Vina 分子对接进行重新打分排序，"
        f"得到了一小批针对 {t} 的候选化合物（其中 {top} 位列前茅）。\n\n"
        f"需要特别说明：这些是计算预测的候选化合物，尚未经过任何实验验证 —— 结合活性、细胞活性、"
        f"选择性与安全性均未测定。\n\n"
        f"我们希望寻找合作方（或获取报价）来完成第一步实验：生化 IC50/Ki 以确认与靶点的结合，"
        f"随后进行选择性测定（off-target / 激酶谱）。\n\n"
        f"所有数值均可追溯至公开数据来源，并可用一条命令复核；我可提供化合物 SMILES、对接构象"
        f"以及完整的数据来源清单。请问这是否符合贵公司/团队的服务范围？如有更合适的方案，也烦请告知。\n\n"
        f"顺颂\n商祺\n[您的姓名]\n"
    )
