# Pitch — the auditable evidence engine for drug discovery

> One rule, in the product and in this pitch: **compute or cite, never assert.**
> `[fill in]` = a real metric only you can supply. We never invent traction.

## One-liner
We turn free public biomedical data into ranked, fully-cited, **re-verifiable** drug-discovery
hypotheses — the explainable alternative to black-box AI in pharma R&D.

## Elevator (30s)
Every AI-for-drug-discovery tool — Schrödinger, Insilico, Causaly, BenchSci — ships outputs you
**cannot audit**. In a field where a fabricated number can cost millions or mislead a trial, that's
a liability. We built the opposite: an open-source engine where every figure is fetched from a named
public source or computed by deterministic code, and a one-command verifier re-pulls it live. We're
the citation/reproducibility layer for researchers, reviewers, and regulated R&D teams.

## Problem
- AI-for-science is drowning in **confident, unverifiable output**; reproducibility is in crisis.
- Pharma spends ≈ **$2.23B per approved drug** (Deloitte 2024) and pays for anything that compresses
  timelines — but won't trust outputs it can't defend to a regulator or a tumor board.
- Existing tools optimize for a slick answer, not an **auditable** one.

## Solution
A one-command pipeline: target → druggability dossier → ranked ligand shortlist → 3-D structure →
docking box → feasibility → **provenance manifest** → **verifier**. Open source, public data, no API
keys. The differentiator is enforced honesty: origin-tagged figures, an independent re-fetch verifier
(`PASS`/`DRIFT`/`FAIL`), docking that refuses to fake a score, and a hard no-medical-advice line.

## Why now
Public data (ChEMBL/PDB/UniProt) is rich and queryable; LLMs make synthesis trivially cheap — which
is exactly why **trustworthy, auditable** synthesis is suddenly the scarce thing. Regulated-AI and
reproducibility pressure are rising.

## Market
Pharma/biotech R&D — ~48% of a multi-$B drug-discovery informatics market ([Grand View](https://www.grandviewresearch.com/industry-analysis/drug-discovery-informatics-market)); real comparables: Schrödinger FY2024 software **$180.4M**, Certara **$384.4M**. Full sizing + confidence flags: [`/business/MARKET.md`](../business/MARKET.md).

## Competition & our moat
Incumbents win on proprietary data/models/integration; we don't have a data moat (all sources are
public — Open Targets even gives the headline feature away free). **Our moat is trust + re-verifiable
provenance + private-data integration** — the one thing the black boxes can't credibly offer.
([Honest competitive map →](../business/COMPETITION.md))

## Business model
Open-core + services: free OSS for distribution/trust; paid (1) private-data fusion behind the
customer firewall, (2) audit-ready provenance/compliance snapshots. ([Detail →](../business/BUSINESS-MODEL-AND-FUNDING.md))

## Traction
`[fill in: GitHub stars, contributors, pipeline runs, web visits, design partners, LOIs]`. Live and
verifiable today — anyone can run `python3 cad/verify.py --target EGFR` and re-prove our output.

## Team
`[fill in: founders, relevant background, why you]`

## The ask
`[fill in: amount, round]` to land academic + regulated-R&D design partners and build the private-data
integration + compliance layer.

## Why we'll win
We shipped the hard, unglamorous, defensible part — enforced anti-hallucination — that no black-box
incumbent is motivated to build, and we did it in the open, fast.
