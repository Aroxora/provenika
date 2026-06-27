#!/usr/bin/env python3
"""
README generator — "How cancer is actually being cured, and where AI saves the experiment."

The README leads with the honest, fact-checked cure narrative (full cited version in
docs/CURING-CANCER.md — every headline claim corroborated across independent sources via Tavily and
cleared by an independent DeepSeek-v4-pro adversarial review). The per-limit technical detail (the
drug-discovery computational angles, also literature-verified) is appended from
cicd/experimental_limits_body.md. Edit either, then run `python3 cicd/generate_readme.py`.
"""

from pathlib import Path

ROOT = Path(__file__).parent.parent

LEAD = r"""# How cancer is actually being cured — and where AI saves the experiment

> ## ⚠️ Not for patient care
> This is a research-strategy map, not medical advice — it does not diagnose, treat, or advise any
> patient. A computational result is a hypothesis for the wet lab, never evidence a therapy works.

**There is no single cure.** "Cancer" is hundreds of diseases, and real progress is the *sum* of five
levers: **prevent it · find it earlier · hit it precisely · turn the immune system on it · stay ahead
of resistance.** AI — most clearly **AlphaFold-style structure prediction** — genuinely compresses the
cheap, in-silico *front* of each, so **fewer experiments are run and fewer dead-end molecules get
made.** It never runs the experiment that proves a person is protected, a tumour shrinks, or a therapy
is safe. Every claim is literature-verified (corroborated across independent sources); investigational
work is labelled as such.

**▶ The full, cited version: [`docs/CURING-CANCER.md`](docs/CURING-CANCER.md)** · live at
**[provenika.com](https://provenika.com)**.
**▶ In mainland China (本地运行 + 国内 CRO 实验路线 + 中文 pitch): [`docs/CHINA.md`](docs/CHINA.md).**

| Lever | Proven today | Where AI saves the experiment | Still irreducibly experimental |
|---|---|---|---|
| **Prevention** | HPV vaccine → **87%** lower cervical cancer (Falcaro, *Lancet* 2021); HBV → liver cancer; aspirin → **~60%** in Lynch (CAPP2) | Risk models (Mirai, Sybil, AVE) sharpen *who* to screen | Immunity/safety in people over years; behaviour & policy |
| **Early detection** | FDA-cleared AI: **Paige Prostate**, **GI Genius**, AI mammography (MASAI trial) | Reads the scan/slide already taken; cuts misses + workload | Must image/sample a body; mortality benefit needs trials |
| **Targeted therapy** | EGFR/BTK/BRAF/KRAS-G12C inhibitors | **AlphaFold2/3** structures (CASP14 GDT 92.4) + **FEP** rank what to synthesise | Predicted ≠ holo; every candidate synthesised & assayed |
| **Immunotherapy** | Checkpoint inhibitors; **CAR-T** (Kymriah, 2017); mRNA neoantigen vaccine **−49%** melanoma recurrence (KEYNOTE-942, investigational) | Neoantigen prediction (NetMHCpan) pre-filters the vaccine | The immune response; per-patient manufacturing; the trial |
| **Resistance** | EGFR T790M → **osimertinib** | Predict resistance mutations; model the mutant to design next-gen | ΔΔG ≠ binding effect; somatic evolution read in patients |
| **Translation** | — | Biomarker & trial-patient matching | Phase 1–3 trials (**~3.4%** oncology PoS); approval; access |

**The honest payoff: AI gets to the cure with fewer experiments — it does not get there without them.**

"""

ATTRIB = r"""
---

Developed by **[ErosolarAI](https://erosolarai.com)**. In-silico triage only. MIT — research and
decision-support only; **not** a substitute for professional medical advice, diagnosis, or treatment.
"""

TECH_HEADER = "\n---\n\n# Appendix — the drug-discovery limits, in technical detail\n\n"


def generate_readme() -> str:
    body = (ROOT / "cicd" / "experimental_limits_body.md").read_text().rstrip()
    return LEAD + TECH_HEADER + body + "\n" + ATTRIB


def main():
    (ROOT / "README.md").write_text(generate_readme())
    print("  README.md updated (how-cancer-is-actually-being-cured)")


if __name__ == "__main__":
    main()
