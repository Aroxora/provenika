# Competition & the moat problem

The uncomfortable headline: **every one of this repo's three pillars is available free elsewhere,
usually from a better-resourced incumbent.** All figures cited; SEC/IR filings 🟢, press/secondary 🟡.

## The moat problem, stated plainly

| Our pillar | Who already does it | At what cost to the user |
|------------|--------------------|--------------------------|
| Target triage / target-disease prioritization | **Open Targets** (EMBL/Sanger + GSK/Pfizer/Sanofi/Genentech/MSD consortium, peer-reviewed) | **Free** — and more rigorous |
| Bioactivity / chemistry / structure inputs | **ChEMBL** (CC BY-SA), **RCSB PDB** (CC0, ~190k structures) | **Free, redistributable** — every competitor ingests the same |
| Literature / trial evidence synthesis | **Causaly**, **BenchSci**, **scite** (proprietary NLP + knowledge graphs over the same papers) | Paid, but far deeper |

"Free code over free data" ⇒ **no data moat**. A competitor reproduces the product by writing
equivalent code over the same public sources.

## The landscape, company by company

### Sell-the-software (our nominal category)
- **Schrödinger** (Nasdaq: SDGR) — physics+AI drug-design suite licensed to pharma *and* its own pipeline. FY2025 $255.9M revenue ($199.5M software), **net loss $103.3M** — even the category leader isn't profitable. [IR](https://ir.schrodinger.com/press-releases/news-details/2026/Schrdinger-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx) 🟢
- **Chemical Computing Group (MOE)** — long-established commercial CADD desktop/server suite; private since 1994; custom-quote licensing. [wiki](https://en.wikipedia.org/wiki/Chemical_Computing_Group) 🟡
- **Certara** — biosimulation / model-informed drug development; FY2024 $384.4M (software $155.0M). [IR](https://ir.certara.com/news-releases/news-release-details/certara-reports-fourth-quarter-2024-financial-results) 🟢
- **Iktos** (€15.5M Series A + €2.5M EIC grant) — **generative** de-novo design + AI retrosynthesis; **a trained model is the moat**, not public data. [PR](https://www.prnewswire.com/news-releases/iktos-secures-prestigious-eic-accelerator-grant-to-advance-its-automated-ai-and-robotics-platform-for-drug-discovery-302380470.html) 🟢
- **Cradle** ($73M Series B, >$100M total) — generative **protein** engineering. [src](https://www.cradle.bio/blog/series-b) 🟢

### TechBio (own the pipeline, not the software)
- **Recursion** (Nasdaq: RXRX) — proprietary **phenomics** data + own pipeline; ~$74.7M FY2025 rev, not profitable. [IR](https://ir.recursion.com/news-releases/news-release-details/recursion-reports-fourth-quarter-and-full-year-2025-financial) 🟢
- **Insilico Medicine** (HKEX, Dec 2025 IPO ~$293M; >$500M raised; ~$2.7B cap) — Pharma.AI SaaS (PandaOmics target ID, Chemistry42 generative chem) **plus** its own assets. [src](https://pharmaphorum.com/news/insilico-ends-2025-293m-hong-kong-ipo) 🟢

### Evidence-intelligence (the literature/knowledge-graph layer)
- **BenchSci** — ASCEND: reads biomedical literature + figures + customer internal data. >$200M raised ($95M Series D 2023); **16 of top-20 pharma, 50k+ scientists**. [src](https://www.generationim.com/our-thinking/news/benchsci-raises-95-million-series-d-funding-to-enable-drug-discovery-innovation-at-scale-with-its-groundbreaking-ai-platform-ascend/) 🟢
- **Causaly** — biomedical knowledge graph + research automation. ~$93M raised ($60M Series B 2023); **12 of top-20 pharma**. [src](https://www.causaly.com/news/causaly-raises-60-million-in-series-b-funding-to-catalyze-ai-powered-preclinical-discovery) 🟢
- **scite** — "Smart Citations" (>1B citation statements). Acquired by Research Solutions (Nov 2023), ~$3.6M ARR. [src](https://www.researchsolutions.com/resources/press-releases/research-solutions-announces-acquisition-of-scite) 🟢

### Enterprise R&D informatics (sticky infrastructure = the real moat)
- **Dotmatics** — acquired by **Siemens for $5.1B** (Jul 2025); FY2025 rev >$300M, >40% adj. EBITDA. [src](https://news.siemens.com/en-us/dotmatics-closing/) 🟢
- **Benchling** — cloud R&D platform/ELN; **$6.1B** valuation (2021 Series F), ~$412M raised. [src](https://sacra.com/c/benchling/) 🟡
- **Genedata** — enterprise R&D workflow software; ~$50–100M rev, 200+ customers; **acquired by Danaher** (Aug 2024). [src](https://www.swissbiotech.org/success-story/genedata/) 🟡

### The incumbent that *is* the problem
- **Open Targets** — free, peer-reviewed, pharma+EMBL/Sanger-funded; does our headline feature better, at $0. Not a competitor you out-price — you can only out-*differentiate*. [partners](https://www.opentargets.org/partners) 🟢

## Where defensibility actually lives (per the comparables)

1. **Proprietary wet-lab / phenomics data** (Recursion, Cradle)
2. **Trained generative models** (Insilico, Iktos)
3. **Curated knowledge graphs + figure/image NLP** (Causaly, BenchSci)
4. **Sticky enterprise R&D infrastructure** (Dotmatics $5.1B, Benchling $6.1B, Genedata→Danaher)

This repo has **none** of these — by design (research-only, no lab, open data). Its *only*
differentiator is the inverse of everyone else's black box: **openness, explainability, and
re-verifiable provenance**. That is a trust/brand wedge (see [BUSINESS-MODEL-AND-FUNDING.md](BUSINESS-MODEL-AND-FUNDING.md)),
not a data moat — and it monetizes only when fused with a customer's private data or compliance needs.
