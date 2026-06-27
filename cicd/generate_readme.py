#!/usr/bin/env python3
"""
README generator — "what AI can replace in the experiment, and what only the lab and clinic can do."

provenika.com leads with one honest claim: exactly how much of cancer-drug discovery AI/compute can
do, and the part they cannot — that only the wet lab, animals, and the clinic can. The detailed
per-limit body is the FACT-CHECKED output of a multi-agent literature-verification run (34 methods
kept, 1 dropped; every tool, citation and accuracy figure was adversarially checked against the
literature — no hallucination). It lives in `cicd/experimental_limits_body.md`; this file wraps it
with the leading framing + overview table. Edit either, then run `python3 cicd/generate_readme.py`.
"""

from pathlib import Path

ROOT = Path(__file__).parent.parent

LEAD = r"""# Provenika — what AI can replace in the experiment, and what only the lab and clinic can do to cure cancer

> ## ⚠️ Not for patient care
> Provenika does not diagnose, treat, or advise on any patient, and neither does this review.
> Nothing here is medical advice. A computational hit is a hypothesis for the wet lab, never
> evidence a therapy works.

**[provenika.com](https://provenika.com) leads with one honest claim:** here is exactly *how much* of
cancer-drug discovery AI and compute can do — and *the part they cannot do*, that only the wet lab,
animals, and the clinic can, to actually cure cancer in full.

AI is genuinely useful at the cheap, in-silico **front** of discovery: it can rank, prioritise, and
de-risk what to make and test, sometimes substituting for a *step* (a predicted structure, a proposed
route, a triaged shortlist). But **every computational method below narrows an experiment — none
replaces it.** The decision-grade truth (does it bind? can it be made? does it engage the target in a
cell? is it selective, safe, and effective in a human?) is still measured at the bench, in animals,
and in the clinic. That gap is why ~97% of oncology programs that enter trials never reach patients.

Each method below was **literature-verified** (real open-source tool, real citation, real accuracy
figure, honest limitation) — nothing is asserted that wasn't fact-checked.

## What AI can do — and what's still required (overview)

| Experimental limit | What AI/compute really does (verified) | What still *requires* experiment |
|---|---|---|
| **Binding affinity** | FEP/TI ΔΔG on a congeneric series (~1 kcal/mol floor); gnina/RTMScore pose rescoring | SPR / ITC / enzyme IC50 — a measured Kd |
| **Synthesis** | retrosynthesis routes (AiZynthFinder, ASKCOS); SA/SC/RA synthesizability scores | a chemist actually making the molecule |
| **Cell engagement** | permeability/efflux *liability* flags (ADMET-AI, BOILED-Egg) | CETSA / NanoBRET in-cell target-engagement assay |
| **Selectivity** | off-target *nominations* (SEA, PIDGIN, reverse-docking, kinome ML) | KinomeScan / radioligand safety panels |
| **ADMET / PK** | QSAR endpoint estimates (ADMET-AI, ADMETlab); PBPK if parameterised | in-vitro ADME (Caco-2, microsomes, hERG) + animal PK |
| **Missing structure / data** | predicted structures & co-folds (AlphaFold2/3, Boltz, Chai); active learning | X-ray / cryo-EM + new bioactivity measurement |
| **Efficacy & safety** | shifts the *population prior* (genetic validation ~2×, Open Targets) | **Phase 1–3 clinical trials** — nothing predicts this |

Read it as: **AI gets you to a better hypothesis, faster and cheaper. It does not get you to a cure.**
The rest of this document is the honest, cited detail behind each row.

"""

ATTRIB = r"""
---

Developed by **[ErosolarAI](https://erosolarai.com)**. In-silico triage only. MIT — research and
decision-support only; **not** a substitute for professional medical advice, diagnosis, or treatment.
"""


def generate_readme() -> str:
    body = (ROOT / "cicd" / "experimental_limits_body.md").read_text()
    return LEAD + "\n" + body.rstrip() + "\n" + ATTRIB


def main():
    (ROOT / "README.md").write_text(generate_readme())
    print("  README.md updated (AI-can-replace / what-only-lab-and-clinic-can-do)")


if __name__ == "__main__":
    main()
