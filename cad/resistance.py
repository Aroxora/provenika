#!/usr/bin/env python3
"""
Clinical resistance landscape — where a next-generation molecule actually earns its place.

Targeted therapies usually fail not because they never worked, but because the tumour evolves a
resistance mutation. The highest-value new molecule for an already-drugged target is therefore the one
that covers the resistance the approved drugs do NOT — osimertinib mattered because it covered EGFR
T790M; pirtobrutinib because it covered BTK C481S; ponatinib/asciminib because they cover ABL1 T315I.
This surfaces, per target, the well-established on-target clinical resistance mutations and which drug (if
any) covers each — turning "another potent binder" into a specific, unmet-need-anchored hypothesis.

Honesty: this is a CURATED, literature-cited reference (like docs/CURING-CANCER.md), scoped to targets
where the on-target resistance story is textbook and unambiguous — not an exhaustive or fetched dataset.
Resistance is often polyclonal and pathway-level too; absence of a target here is not a claim it has no
resistance. Every entry names its source. Research only; not medical advice.
"""

from __future__ import annotations

# Keyed by gene symbol. Each mutation: the change, what it confers resistance to, what (if anything)
# covers it, and a real citation. `unmet` names the live gap a new molecule could fill.
RESISTANCE = {
    "EGFR": {
        "context": "EGFR-mutant NSCLC, on EGFR TKIs",
        "mutations": [
            {"mut": "T790M", "confers": "resistance to 1st/2nd-gen TKIs (gefitinib, erlotinib, afatinib)",
             "covered_by": "osimertinib (3rd-gen) — this is why osimertinib mattered",
             "ref": "Thress, Nat Med 2015; Jänne, NEJM 2015"},
            {"mut": "C797S", "confers": "resistance to osimertinib (3rd-gen), especially in cis with T790M",
             "covered_by": "no approved TKI fully covers it — 4th-gen inhibitors are still investigational",
             "ref": "Wang et al., J Hematol Oncol 2016",
             "url": "https://jhoonline.biomedcentral.com/articles/10.1186/s13045-016-0290-1"},
        ],
        "unmet": "a molecule covering C797S (the post-osimertinib gap) is a live, named unmet need.",
    },
    "BTK": {
        "context": "CLL / lymphoma, on covalent BTK inhibitors",
        "mutations": [
            {"mut": "C481S", "confers": "resistance to covalent BTKis (ibrutinib, acalabrutinib, zanubrutinib) "
             "by removing the covalent-binding cysteine",
             "covered_by": "pirtobrutinib (non-covalent) — active regardless of C481S status",
             "ref": "Mato, NEJM 2023 (pirtobrutinib after covalent BTKi)",
             "url": "https://www.nejm.org/doi/full/10.1056/NEJMoa2300696"},
            {"mut": "T474 / kinase-dead second-site", "confers": "emerging resistance to non-covalent pirtobrutinib",
             "covered_by": "no approved agent — an open frontier",
             "ref": "Naeem et al., Blood Adv 2023",
             "url": "https://ashpublications.org/bloodadvances/article/7/9/1929/486896"},
        ],
        "unmet": "agents covering post-pirtobrutinib (T474 / kinase-dead) BTK resistance are an open frontier.",
    },
    "ABL1": {
        "context": "BCR::ABL1+ CML, on ABL TKIs",
        "mutations": [
            {"mut": "T315I", "confers": "the 'gatekeeper' mutation — resistance to imatinib and all 2nd-gen TKIs "
             "(dasatinib, nilotinib, bosutinib)",
             "covered_by": "ponatinib (3rd-gen) and asciminib (allosteric/STAMP) cover T315I",
             "ref": "Réa, asciminib review, Leukemia 2023",
             "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10133857/"},
        ],
        "unmet": "ponatinib+asciminib-resistant compound mutants (e.g. T315M, E255V/T315I) remain hard.",
    },
    "ALK": {
        "context": "ALK-rearranged NSCLC, on ALK TKIs",
        "mutations": [
            {"mut": "G1202R", "confers": "solvent-front mutation — resistance to 1st/2nd-gen ALK TKIs "
             "(crizotinib, alectinib, ceritinib, brigatinib)",
             "covered_by": "lorlatinib (3rd-gen), designed to retain activity against G1202R",
             "ref": "Gainor et al., Cancer Discov 2016; Shaw, NEJM 2020 (lorlatinib)"},
        ],
        "unmet": "lorlatinib-resistant compound mutations (e.g. G1202R + L1196M) are the next gap.",
    },
}

# Common aliases → canonical symbol.
_ALIAS = {"BCR-ABL": "ABL1", "BCR::ABL1": "ABL1", "BCRABL": "ABL1", "HER2": "ERBB2"}


def resistance_for(symbol: str | None) -> dict | None:
    if not symbol:
        return None
    s = symbol.strip().upper()
    s = _ALIAS.get(s, s)
    return RESISTANCE.get(s)


def landscape_markdown(symbol: str) -> str:
    """A 'resistance landscape' section for the validation request, or '' if the target has no curated
    entry (silent, never fabricated)."""
    r = resistance_for(symbol)
    if not r:
        return ""
    L = ["## Resistance landscape — where a next-gen molecule earns its place", "",
         f"Known on-target clinical resistance for **{symbol}** ({r['context']}). A new candidate's "
         f"highest value is covering what the approved drugs do **not**.", "",
         "| Mutation | Confers | Covered by | source |", "|---|---|---|---|"]
    for m in r["mutations"]:
        ref = f"[{m['ref']}]({m['url']})" if m.get("url") else m["ref"]
        L.append(f"| {m['mut']} | {m['confers']} | {m['covered_by']} | {ref} |")
    L += ["", f"**Unmet need:** {r['unmet']}",
          "", "_Curated, literature-cited; scoped to textbook on-target resistance, not exhaustive. "
          "Resistance is often polyclonal/pathway-level too. Research only; not medical advice._"]
    return "\n".join(L)
