# Market — who pays, how big, how solid the numbers are

**Confidence legend:** 🟢 high = company SEC filings / audited financials · 🟡 medium = widely-cited
research firm with disclosed base year & segmentation · 🔴 low = press-release / market-research
projection (directional only). Per the repo's rule, the figure, source, year and link are given so
you can verify each one.

## How big is the market? (treat top-line projections skeptically)

| Segment | Figure | Confidence | Source (year) |
|---------|--------|-----------|---------------|
| Computer-aided drug discovery (CADD) | $4.21B (2024) → $13.08B (2034), ~12% CAGR | 🔴 | [Precedence Research](https://www.precedenceresearch.com/computer-aided-drug-discovery-market) (2024) |
| CADD (alt. estimate, same category) | ~$3.8B (2024) → $9.9B (2034), ~10% CAGR | 🔴 | [OpenPR press release](https://www.openpr.com/news/4211753/computer-aided-drug-discovery-cadd-market-projected-growth) (2024) |
| AI in drug discovery | $1.49B (2023) → $9.17B (2030), 29.6% CAGR | 🟡 | [Grand View Research](https://www.grandviewresearch.com/horizon/outlook/artificial-intelligence-in-drug-discovery-ai-market-size/global) (2023) |
| AI in drug discovery (later vintage) | $2.35B (2025) → $13.77B (2033), 24.8% CAGR | 🟡 | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-drug-discovery-market) (2025) |
| AI in drug discovery (outlier) | → $35.42B by 2034, 29.6% CAGR | 🔴 | [Persistence MR (GlobeNewswire)](https://www.globenewswire.com/news-release/2024/12/17/2998006/0/en/AI-in-Drug-Discovery-Market-Share-to-Grow-At-29-6-CAGR-To-Hit-USD-35-42-Billion-by-2034-PMR.html) (2024) |
| Drug discovery **informatics** (closest category) | $3.65B (2024) → $7.03B (2030), 11.6% CAGR | 🟡 | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/drug-discovery-informatics-market) (2024) |
| Sci-tech publication (context for evidence tools) | $13.7B (2026) → $17.77B (2035), 3.3% CAGR | 🔴 | [Business Research Insights](https://www.businessresearchinsights.com/market-reports/scientific-and-technical-publication-market-107199) (2026) |

> **Caveat that matters more than the numbers:** "CADD," "AI in drug discovery," "in-silico
> discovery," and "drug discovery informatics" are sold as overlapping, inconsistently-defined
> categories, and **most top-line figures come from commercial research firms whose estimates for
> the *same* category diverge by 2–4×** (see the two CADD rows above). Use them for direction, not
> for a model.

## What's actually real — audited company financials 🟢

These are the trustworthy anchors: real revenue, real customers.

| Company | What it sells | FY figure | Source |
|---------|--------------|-----------|--------|
| **Schrödinger** (SDGR) | Physics/AI drug-design software (+ own pipeline) | FY2024 software rev **$180.4M** (+13%), total $207.5M; FY2025 total **$255.9M** ($199.5M software), net loss $103.3M | [IR FY2024](https://ir.schrodinger.com/press-releases/news-details/2025/Schrdinger-Reports-Strong-Fourth-Quarter-and-Full-Year-2024-Financial-Results/default.aspx), [IR FY2025](https://ir.schrodinger.com/press-releases/news-details/2026/Schrdinger-Reports-Fourth-Quarter-and-Full-Year-2025-Financial-Results/default.aspx) |
| **Certara** (CERT) | Biosimulation / model-informed drug development | FY2024 total **$384.4M** (software $155.0M +18%, services $229.4M); ~2,400 clients/66 countries | [IR](https://ir.certara.com/news-releases/news-release-details/certara-reports-fourth-quarter-2024-financial-results) |
| **Research Solutions** (RSSS) | Literature/evidence SaaS (Article Galaxy + scite) | FY2024 total **$44.6M**; platform ARR $17.4M (+84% YoY) | [PR](https://www.prnewswire.com/news-releases/research-solutions-reports-fourth-quarter-and-fiscal-year-2024-results-302253566.html) |

**The cautionary comparable:** **scite** — the closest "AI literature-evidence" analog — peaked at
only **~$3.6M ARR / ~21k subscribers** before being acqui-bought by Research Solutions (Nov 2023).
That is the realistic ceiling for a thin literature tool, not an aspiration. ([source](https://www.prnewswire.com/news-releases/research-solutions-announces-acquisition-of-scite-301997608.html), 🟢)

## Who pays

- **Pharma & biotech dominate.** Informatics buyers are ~**48.4%** pharma/biotech ([Grand View](https://www.grandviewresearch.com/industry-analysis/drug-discovery-informatics-market), 🟡); Schrödinger's base is **235 customers with ACV ≥ $100K** and **19 of the top-20 pharma** (~41% of software revenue) — concentrated, enterprise, already-served buyers (🟢/🟡).
- **The budget pool is huge but not the point.** Global pharma R&D ≈ **$260B** (2023, Statista 🟡); top spenders ~$194B aggregate, Merck #1 at $17.9B (2024, [Fierce Biotech](https://www.fiercebiotech.com/special-reports/top-10-pharma-rd-budgets-2024) 🟢); avg cost per new drug ≈ **$2.23B** (Deloitte 2024 🟢). Pharma pays for tools that **compress timelines** — but it will not pay for a free wrapper over data it already ingests directly.
- **Academia/public sector** funds the upstream science (NIH ≈ $187B tied to approved drugs, 2010–2019, [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10065281/) 🟡) — the natural home of a *free* public-data tool, via grants.

## So what does the market say for *this* repo?

The addressable market for **"access to public oncology data"** is effectively **$0** — Open Targets
gives it away. The real, payable markets adjacent to us — enterprise informatics (Certara/Schrödinger
scale) and evidence-intelligence (Causaly/BenchSci scale) — are won with **proprietary models,
proprietary data, or sticky enterprise integration**, none of which a public-data aggregator has.
Our beachhead is the **narrow, credibility-driven niche** of reproducibility/provenance, monetized
via grants and open-core services (see [BUSINESS-MODEL-AND-FUNDING.md](BUSINESS-MODEL-AND-FUNDING.md)).
