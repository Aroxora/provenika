<!-- Y Combinator application (founder: Bo Shang) -->

# Y Combinator Application — Provenika

**One-line description (what you make):**
Provenika is an open-source "auditable evidence engine" for oncology drug-discovery research: it turns free public data into ranked, fully-cited hypotheses where every number is re-verifiable from its source — compute or cite, never assert.

**What's new / our insight:**
Every AI tool in drug discovery now produces plausible-looking outputs you cannot check. The bottleneck isn't generating hypotheses — it's *trusting* them. Our insight: in a regulated, high-stakes field, provenance is the product. Provenika never asserts a fact; every figure is either fetched-and-cited (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) or deterministically computed, and a one-command verifier re-pulls each number from its public source and returns PASS / DRIFT / FAIL. Incumbents ship black-box rankings; we ship a result a skeptic can independently reconstruct. That's a different artifact, not a better model.

**Why us / founder-market fit:**
Bo Shang — engineer who builds end-to-end. [Fill in: relevant biology/cheminformatics, prior companies, technical depth, why this problem.] The working pipeline (target triage, ligand shortlists, structures, docking setup, feasibility) already exists in `cad/` and the auto-verified provenance layer is the hard part we've built.

**Competitors / who we fear:**
Open Targets (free) — gives the headline triage feature away; we are downstream and complementary, betting auditability + workflow is the moat, not the ranking. Schrödinger and Insilico own physics/wet-lab; Causaly and BenchSci own literature search. The real fear is Open Targets or a foundation model bolting on a "show your sources" mode. Our honest defensibility is execution and the verifier, not data — all sources are public.

**How we make money (open-core):**
Core engine stays OSS to win trust and adoption. We charge for (1) private-data fusion — securely joining a lab's proprietary assays/structures to the public graph; (2) audit-ready provenance snapshots — timestamped, signed, re-verifiable evidence packages for IP, grants, and regulatory filings.

**How big it could be:**
Honestly: open-science infrastructure with a thin commercial wedge, not a venture rocket. Realistic path is mid-market SaaS into biotechs, CROs, and academic labs that need defensible evidence. The bigger swing: become the citation/provenance standard for AI-generated scientific claims.

**Honest caveats:**
Research-only — not a cure, drug, diagnostic, lab, or medical-advice company. No data moat. No traction to overstate: [fill in users / design partners / revenue].

**The ask:**
[Fill in: amount, what it funds — likely first design partners + verifier hardening.]

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326 — provenika.com
