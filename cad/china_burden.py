#!/usr/bin/env python3
"""
China cancer-burden lens — pick targets for the cancers that actually kill Chinese patients.

To "cure cancer in China" you first work on the RIGHT cancers: China's burden differs sharply from the
West. This encodes China's highest-burden cancers from the authoritative national source and maps a
target's disease association onto that burden, so a researcher in China can prioritise genetically-
validated targets toward the diseases with the most lives at stake domestically.

Source (every figure below is from it; nothing here is model-produced): Han B, Zeng H, Chen W, et al.,
"Cancer incidence and mortality in China, 2022", Journal of the National Cancer Center, 2024
(PMID 39036382; National Cancer Center of China). 2022 estimates: ~4,824,700 new cancer cases and
~2,574,200 cancer deaths. The five leading causes of cancer DEATH — lung, liver, stomach, colorectum,
oesophagus — account for 67.5% of all cancer deaths; the five most COMMON — lung, colorectum, thyroid,
liver, stomach — account for 57.4% of new cases.

Honesty: ranks/figures are the national 2022 estimates, not per-program forecasts; mapping a target to a
cancer uses its disease name and is a relevance heuristic, not a claim the target cures that cancer.
Research only; not medical advice. 仅供研究，非医疗建议。
"""

from __future__ import annotations

SOURCE = ("Han B, Zeng H, Chen W, et al. Cancer incidence and mortality in China, 2022. "
          "J Natl Cancer Center 2024 (PMID 39036382; National Cancer Center of China).")
SOURCE_URL = "https://pubmed.ncbi.nlm.nih.gov/39036382/"

# China's highest-burden cancers. mortality_rank = rank among the 5 leading causes of cancer death in
# China, 2022 (1 = most deaths). Figures are the national 2022 estimates from SOURCE. `match` = substrings
# used to recognise the cancer in a disease label. `cn` = 中文 name. `driver` = the dominant, well-
# established aetiology in China (textbook epidemiology).
CHINA_TOP_CANCERS = [
    {"key": "lung", "name": "Lung cancer", "cn": "肺癌", "mortality_rank": 1,
     "new_cases_2022": 1060600, "asmr_2022": 26.7,
     "driver": "tobacco + ambient/household air pollution",
     "china_note": "China's #1 cancer for both new cases and deaths. EGFR-activating mutations are far "
                   "more common in East-Asian/Chinese NSCLC (~38–53%) than Western (~10–15%), so "
                   "EGFR-targeted therapy reaches a disproportionately large share of Chinese patients.",
     "match": ("lung", "nsclc", "non-small cell", "non small cell", "pulmonary")},
    {"key": "liver", "name": "Liver cancer (HCC)", "cn": "肝癌", "mortality_rank": 2,
     "new_cases_2022": 367700, "asmr_2022": 12.6,
     "driver": "chronic hepatitis B (HBV); aflatoxin, alcohol, NAFLD",
     "china_note": "Disproportionately a Chinese disease via endemic HBV; prevention (HBV vaccination) "
                   "is the proven lever, and HCC is hard to target with small molecules.",
     "match": ("liver", "hepatocellular", "hcc", "hepatic", "hepatoma")},
    {"key": "stomach", "name": "Stomach (gastric) cancer", "cn": "胃癌", "mortality_rank": 3,
     "new_cases_2022": 358700, "asmr_2022": 9.4,
     "driver": "Helicobacter pylori; diet (salt, preserved foods)",
     "china_note": "Among the highest national burdens worldwide; H. pylori eradication is the proven "
                   "prevention lever.",
     "match": ("gastric", "stomach")},
    {"key": "colorectal", "name": "Colorectal cancer", "cn": "结直肠癌", "mortality_rank": 4,
     "new_cases_2022": 517100, "asmr_2022": 8.6,
     "driver": "diet/lifestyle, obesity; incidence rising in China",
     "china_note": "2nd most common new cancer in China (2022) and rising — a growing target population.",
     "match": ("colorectal", "colon", "rectal", "rectum", "bowel", "colorectum")},
    {"key": "esophagus", "name": "Oesophageal cancer", "cn": "食管癌", "mortality_rank": 5,
     "new_cases_2022": None, "asmr_2022": None,
     "driver": "hot beverages, alcohol/tobacco, diet; regional 'cancer belts'",
     "china_note": "China carries a very large share of the world's oesophageal cancer; mostly squamous "
                   "histology, with limited targeted-therapy options today.",
     "match": ("esophag", "oesophag")},
    # High INCIDENCE / important in women, below the mortality top-5 — included for relevance mapping.
    {"key": "breast", "name": "Breast cancer", "cn": "乳腺癌", "mortality_rank": None,
     "new_cases_2022": None, "asmr_2022": None,
     "driver": "the leading cancer in Chinese women by incidence",
     "china_note": "Top cancer in women; large target population (HER2/PIK3CA/ER biology).",
     "match": ("breast",)},
]

_BY_KEY = {c["key"]: c for c in CHINA_TOP_CANCERS}


def priority_for_disease(name: str | None) -> dict | None:
    """Map a disease label to the China-burden cancer it represents, or None. Returns the record
    (with mortality_rank, driver, china_note, source)."""
    n = (name or "").lower()
    if not n:
        return None
    for c in CHINA_TOP_CANCERS:
        if any(m in n for m in c["match"]):
            return c
    return None


def _rank_value(c: dict) -> tuple:
    # Sort key: a real mortality top-5 rank beats incidence-only (breast); lower rank = higher priority.
    return (0 if c.get("mortality_rank") else 1, c.get("mortality_rank") or 99)


def scan_diseases(disease_names) -> dict | None:
    """Given an iterable of a target's disease labels, return the HIGHEST-priority China-burden cancer it
    touches (so a target whose top genetic cancer is niche still surfaces if it also hits a major one)."""
    hits = [priority_for_disease(d) for d in (disease_names or [])]
    hits = [h for h in hits if h]
    return min(hits, key=_rank_value) if hits else None


def burden_brief_markdown() -> str:
    """A short, fully-cited brief of China's cancer burden — the 'why these cancers' grounding."""
    L = ["## China's cancer burden — which cancers to work on", "",
         "China, 2022: **~4.82 million** new cancer cases and **~2.57 million** cancer deaths. The five "
         "leading causes of cancer **death** — lung, liver, stomach, colorectum, oesophagus — are "
         "**67.5%** of all cancer deaths. Pursuing genetically-validated targets *for these cancers* is "
         "where work matters most for Chinese patients.", "",
         "| Cancer | 中文 | China death rank | 2022 new cases | Dominant driver in China |",
         "|---|---|---|---|---|"]
    for c in sorted(CHINA_TOP_CANCERS, key=_rank_value):
        rank = f"#{c['mortality_rank']}" if c.get("mortality_rank") else "— (high incidence)"
        cases = f"{c['new_cases_2022']:,}" if c.get("new_cases_2022") else "—"
        L.append(f"| {c['name']} | {c['cn']} | {rank} | {cases} | {c['driver']} |")
    L += ["", f"_Source: {SOURCE} <{SOURCE_URL}>. National 2022 estimates, not per-program forecasts; "
          "target↔cancer mapping is a relevance heuristic. Research only; not medical advice._"]
    return "\n".join(L)
