# Y Combinator application — draft answers

> Honest by construction (same rule as the product: *compute or cite, never assert*).
> **`[fill in]`** marks a real metric only you can supply — never invent traction.

## Company

**What is your company going to make?**
An **auditable evidence engine for drug discovery**. We turn free public biomedical data
(ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) into ranked, fully-cited, *independently
re-verifiable* hypotheses for oncology researchers — target triage, ligand shortlists, structures,
docking setups, feasibility — in one command. Every number we output is either fetched live from a
named public source or computed by deterministic open-source code, and a one-command verifier
re-pulls each figure from its source (`PASS`/`DRIFT`/`FAIL`). The wedge is the thing incumbents
structurally can't offer: **explainable, re-verifiable output instead of a black box.**

**Describe your company in 50 characters or less.**
`Re-verifiable evidence engine for drug R&D`

**Company URL / demo:** https://github.com/Aroxora/provenika · live verify: `python3 cad/verify.py --target EGFR`

## Founders & progress

**How far along are you?** `[fill in: GitHub stars, # pipeline runs, # targets precomputed (18 shipped), web app live URL, any users/design partners]`. Working today: the full CADD triage pipeline, the provenance manifest, the live verifier (CI-gated), an Angular web app, and an agentic outreach system — all open source.

**How long have you been working on this?** `[fill in]`

**Tech stack:** Python (stdlib-first) for the CADD pipeline + verifier; TypeScript OSINT CLI; Angular web app; AWS Lambda + Firestore for the outreach/RAG agent. No paid data dependencies.

## The idea

**Why did you pick this idea? Do you have domain expertise?** `[fill in: your background]`. The insight is not "AI cures cancer" — it's that the deadliest failure mode of AI-for-science is **fabrication**, and the entire industry ships confident black-box outputs you cannot audit. We built the opposite: a tool whose every figure links back to a public record and can be re-proven.

**What's new about what you're making?** Re-verifiable provenance as a first-class, enforced property. Open Targets, Schrödinger, Insilico, Causaly, and BenchSci all sell closed, model-driven outputs. We are the citation/reproducibility layer for people who must *defend* their reasoning — academics, reviewers, and regulated R&D teams.

**Who are your competitors, and who might become competitors? Who do you fear most?**
Open Targets (free, EMBL/Sanger + pharma consortium — does our headline feature, also at $0) is the one to beat on *differentiation*, not price. Commercial: Schrödinger (FY2024 software rev $180.4M), Certara ($384.4M), Causaly (~$93M raised), BenchSci (>$200M raised). The honest risk: our data sources are all public, so there's no data moat — our moat is trust/provenance + private-data integration. (Full analysis: [`/business`](../business/).)

**How will you make money? How big could it be?**
Open-core + services on top of free OSS: (1) on-prem fusion of a customer's **proprietary** assays/SAR with the public layer behind their firewall; (2) **version-pinned, audit-ready provenance snapshots** (IQ/OQ, 21 CFR Part 11-style) regulated teams can cite. Buyers are pharma/biotech R&D (~48% of a multi-$B informatics market; per-drug cost ≈ $2.23B, so timeline compression is valuable). We are clear-eyed that this is more efficient-growth/services-led than a pure-SaaS rocket — see the realistic-paths section in [`/business`](../business/BUSINESS-MODEL-AND-FUNDING.md).

## Why us, why now

**Why now?** Public biomedical data is finally rich and queryable; LLMs make synthesis cheap — and that same cheapness is flooding science with unverifiable AI output. The market need for *auditable* AI is new and growing (regulated AI, reproducibility crisis).

**What's your unfair advantage?** We shipped the hard, unglamorous part — enforced, tested, CI-gated anti-hallucination (provenance + an independent verifier) — that black-box incumbents have no incentive to build. Plus speed: a small team shipping a full pipeline + web app + agentic GTM in the open.

## The ask

**How much are you raising / what will you use it for?** `[fill in]`. Use of funds: design partners in academic + regulated R&D, the private-data integration layer, and provenance/compliance packaging.

**Anything else we should know?**
We deliberately removed every feature that crossed into medical advice (no per-patient recommendations, prognoses, or treatment plans) — both because it's right and because it keeps us out of FDA SaMD regulation. Honesty is our brand and our moat.
