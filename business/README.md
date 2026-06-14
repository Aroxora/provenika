# Can this be a real business? — an honest, cited analysis

> Asked seriously, with a skeptical pre-seed investor's eye and **real, sourced numbers**
> (every figure below is cited; SEC filings are flagged *high* confidence, market-research-firm
> projections *low*). Written with the same rule as the code: **compute or cite, never assert.**

## TL;DR verdict

**As a standalone venture-backed software company: pass. As open science with a thin commercial
edge: yes — and the edge is the thing this repo already does best.**

The product is **free code over free public data**. Its three pillars are each given away,
already, by better-resourced incumbents:

- **Target triage** → [Open Targets](https://www.opentargets.org/partners) (EMBL/Sanger + pharma consortium, peer-reviewed, **free**) does the headline feature more rigorously, also at $0.
- **Chemistry/structure inputs** → ChEMBL (CC BY-SA) and PDB (CC0, ~190k structures) are commodity public data every competitor also ingests.
- **Literature/trial synthesis** → thin next to the proprietary NLP/knowledge-graphs of [Causaly](https://www.causaly.com) (~$93M raised, 12 of top-20 pharma) and [BenchSci](https://www.benchsci.com) (>$200M raised, 16 of top-20 pharma, 50k+ scientists).

Free code over free data has, by definition, **no data moat** — the textbook reason a deep-tech-bio
investor passes. ([Why investors pass →](BUSINESS-MODEL-AND-FUNDING.md#why-investors-pass))

## But there *is* a defensible wedge — and we just built it

The one asset the heavy incumbents structurally lack is **re-verifiable, version-pinned
provenance and auditability**. Open Targets, Schrödinger, Insilico, Causaly and BenchSci all
sell **closed, model-driven outputs you cannot independently audit**. A tool whose entire
promise is *"open, explainable, re-verifiable, never fabricates a score"* can become the
**trusted citation / reproducibility layer** for academics, peer reviewers, and regulated teams
who must defend their reasoning.

That wedge is exactly what `cad/provenance.py` + `cad/verify.py` implement (every figure tagged
`fetched`/`computed` with a re-verification URL, re-pulled live with `PASS`/`DRIFT`/`FAIL`). It is
a **brand/trust/distribution moat, not a data or IP moat** — so it converts to revenue only when
bolted onto a customer's **private data** or **compliance posture**.

## The honest paths (in priority order)

1. **Grant / open-science sustainability (primary).** Fund maintenance via NIH/NSF/NCI-ITCR-style
   grants + a host institution — the proven [Galaxy](https://galaxyproject.org)/[Bioconductor](https://bioconductor.org) model for a free public-data tool that never charges end users.
2. **Open-core services & curation (narrow niche).** Keep the OSS triage free as distribution;
   sell what *can't* be self-served: on-prem fusion of a customer's **proprietary** assay/SAR data
   with the public layer; **version-pinned, audit-ready provenance snapshots** (IQ/OQ, 21 CFR Part 11-style).
3. **Lifestyle / consulting.** Bespoke target-triage and evidence dossiers for biotechs/academics/
   investors, with the OSS tool as the calling card.
4. **Strategic feeder / acqui-hire.** Be the transparent reproducibility layer that feeds paid
   tools → an attractive tuck-in for an evidence-intelligence incumbent (mirroring scite → Research Solutions).
5. **Venture pivot (different company).** Generate proprietary data or de-risk a specific oncology
   asset (the Recursion/Insilico model) — far more capital-intensive, and outside this project's
   research-only, no-lab scope.

## Two things to change today

- **Drop the "cure" framing.** A "cure cancer" name reads as overpromise — the canonical
  life-science fundraising red flag — and undercuts the credibility that is this project's best asset.
  (The README and product now lead with *"auditable evidence engine,"* not "cure.")
- **Double down on provenance.** It is the only durable wedge; make it the brand.

## Read more

- **[MARKET.md](MARKET.md)** — market sizing, who pays, with cited figures + confidence flags.
- **[COMPETITION.md](COMPETITION.md)** — the landscape and the moat problem, company by company.
- **[BUSINESS-MODEL-AND-FUNDING.md](BUSINESS-MODEL-AND-FUNDING.md)** — models, the wedge, why investors pass, IP reality, realistic paths.

---

*Analysis assembled from public sources (June 2026). Market-size projections from commercial
research firms are inherently low-confidence and definitionally inconsistent — see MARKET.md caveats.
This is strategic analysis, not financial advice or a solicitation.*
