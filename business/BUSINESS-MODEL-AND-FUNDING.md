# Business model, the wedge, and funding reality

## The single most defensible wedge: re-verifiable provenance

Every heavy incumbent — Open Targets, Schrödinger, Insilico, Causaly, BenchSci — sells **closed,
model-driven outputs you cannot independently audit.** This repo's entire promise is the inverse:
**open, explainable, deterministic, re-verifiable, "never fabricates a score."**

That makes it a candidate to be the **trusted citation / reproducibility layer** for the people who
must *defend* their reasoning: academics, peer reviewers, grant writers, and regulated R&D teams.
The mechanism already exists in the codebase:

- `cad/provenance.py` → `provenance.json`: every figure tagged `fetched`/`computed` + source + a re-verification URL.
- `cad/verify.py`: re-pulls every figure from its live source (`PASS`/`DRIFT`/`FAIL`), checks SMILES byte-equality against ChEMBL, recomputes deterministic scores; CI-gated.

**This is a brand/trust/distribution moat, not a data or IP moat.** It is given away for free, so it
only converts to revenue when **bolted onto a customer's private data or compliance posture.**

## Candidate business models

| Model | What you'd sell | Real-world pattern | Honest assessment |
|-------|-----------------|--------------------|-------------------|
| **Grant / open science** | nothing to end users | Galaxy, Bioconductor (NIH/NSF/NCI-ITCR) | **Primary, most honest path** for a free public-data tool |
| **Open-core: private-data fusion** | on-prem join of customer's proprietary assays/SAR with the public layer, behind their firewall | Benchling, Snyk-enterprise (customer's data is the moat) | Real, defensible — but services-shaped, not fast-scaling SaaS |
| **Open-core: provenance/compliance** | version-pinned, deduped, lineaged, **audit-ready** public-data snapshots (IQ/OQ, 21 CFR Part 11-style) | DrugBank / UniProt-SwissProt curation; Red Hat support | The wedge made billable; narrow but durable |
| **Hosted / SLA** | managed runs, uptime, support | Hugging Face, Posit/RStudio | Thin on its own; bundle with the above |
| **Consulting / lifestyle** | bespoke triage & evidence dossiers | boutique CRO-adjacent practice | Real revenue, not venture-scale; OSS = lead-gen |
| **Drug-asset / pipeline pivot** | equity in de-risked assets | Recursion, Insilico | The only *venture-scale* version — but a **different, far more capital-intensive company** that needs proprietary wet-lab data this project does not have |

## Why investors pass (the brutal list)

1. **No data moat** — code is open; all five sources (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) are free, keyless, redistributable. Any competitor reproduces it.
2. **A free, better-funded incumbent already owns the headline feature** — Open Targets does target prioritization more rigorously, also at $0. There isn't even a price advantage to exploit.
3. **No proprietary models or validated outputs** — deterministic similarity triage (not de-novo generation), docking gated on a real Vina binary, cost-benefit from *published* public benchmarks. Nothing the customer couldn't compute themselves.
4. **No proprietary/wet-lab data engine** — techbio DD asks "what data can no one else replicate?" Here: none. Durable value lives in proprietary phenomics (Recursion), trained models (Insilico, Iktos), curated graphs (Causaly, BenchSci), or sticky infra (Dotmatics $5.1B, Benchling $6.1B).
5. **Low revenue ceiling** — the closest thin-literature comparable (scite) topped out at ~$3.6M ARR before an acqui-buy. Cautionary, not aspirational.
6. **Weak IP** — post-*Alice/Mayo/Myriad*, software over public biological relationships is essentially unpatentable; copyright protects only the specific code, not the function.
7. **Single-vendor open-core invites forks** — relicensing otherwise-open assets reliably triggers a community fork (Elastic→OpenSearch, HashiCorp/Terraform→OpenTofu).
8. **Wrong fundable shape + framing risk** — VCs fund the next de-risking inflection; platform-only with no asset and no proprietary data is the weakest fundable position. A "cure cancer" name reads as overpromise — the canonical life-science red flag.
9. **Concentrated, already-served buyers** — pharma/biotech (~48% of informatics spend; Schrödinger's 19-of-top-20) already buy validated enterprise tools and won't pay for a free wrapper.

## Regulatory positioning (a feature, not a bug)

Staying **research-only / not-medical-advice** keeps the tool **outside** FDA Software-as-a-Medical-
Device (SaMD) and Clinical Decision Support regulation. What would pull it *in* — and must be
avoided — is any output that **directs patient treatment** (a recommendation, a dose, a prognosis).
This is precisely why the medical-advice-shaped tools in this repo were neutralized (see
[`../docs/ANTI-HALLUCINATION.md`](../docs/ANTI-HALLUCINATION.md)). Honesty here is also the cheapest
moat-adjacent asset: **trust.**

## Recommendation

**Pass as a venture investment; back it as open science.**

Fund maintenance via **grants + a sponsoring institution**; build the **reproducibility/provenance
moat** into a genuine brand; pursue a **thin open-core services layer** (private-data fusion +
audit-ready snapshots) or a **strategic-feeder / acqui-hire** outcome. Reserve any venture
conversation for a *different* company that owns proprietary data or a de-risked oncology asset.
And **drop the "cure" framing** — it overpromises and undercuts the credibility that is this
project's single best asset.

---

*Sources for every company/figure referenced here are in [COMPETITION.md](COMPETITION.md) and
[MARKET.md](MARKET.md). Strategic analysis, not financial advice or a solicitation.*
