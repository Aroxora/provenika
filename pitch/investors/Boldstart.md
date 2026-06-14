<!-- Boldstart Ventures — Ed Sim (inception dev-first infra/security) -->

---

# Provenika — trust & audit as a dev primitive for regulated R&D

**To:** Shomik Ghosh / Ed Sim, Boldstart Ventures
**From:** Bo Shang
**Ask:** Inception pre-seed to take Provenika from open-source engine to the verification layer for scientific evidence.

**The Snyk pattern, applied to research claims.** Snyk made security a thing developers run, not a gate they wait on. BigID made data governance queryable. Provenika does this for scientific evidence: it turns trust and auditability into a dev primitive — a command you run, not a report you take on faith.

**What it is.** Provenika (open source, provenika.com) is an auditable evidence engine for oncology drug discovery. Its rule is **"compute or cite, never assert."** It ingests *free public data* (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) and emits ranked, fully-cited, target-triage and ligand hypotheses — every figure either fetched-and-cited or deterministically computed in `cad/` (provenance.py, verify.py today).

**The wedge: re-verifiable provenance.** Open Targets, Schrödinger, Insilico, Causaly, BenchSci ship *closed, black-box* outputs you cannot independently check. Provenika ships a one-command verifier that re-pulls every number from its public source and returns **PASS / DRIFT / FAIL**. The artifact isn't the answer — it's the *checkable* answer. For regulated R&D (IND filings, audit trails, reproducibility mandates), that's the difference between a slide and an exhibit.

**Why developer-first / why now.** Scientists and ML teams are wiring LLMs into discovery and inheriting a hallucination liability nobody can audit. Provenika is the audit primitive for that pipeline: CLI/CI-native, deterministic, diffable provenance. Land via open source and individual researchers; expand to a hosted verification + drift-monitoring service for biotech/pharma teams who need a defensible chain of custody on every claim.

**What I won't hide.** All sources are public — no data moat; the moat is the verification layer and trust. Open Targets gives the headline triage away free; we win on *auditability*, not the headline. This is research-only — not a cure, drug, medical-advice, or lab company.

**Traction:** [fill in — users / stars / design partners]. **Built:** working open-source pipeline (`cad/`) with provenance + verifier already in repo.

**The ask.** Boldstart leads pre-product for developer-first infra/security — Provenika is exactly that, aimed at scientific evidence. I'd like Inception capital and your enterprise-infra GTM to make re-verifiable provenance the default for regulated R&D. Open to a 30-minute call.

— Bo Shang · bo@shang.software · bo@trenchwork.org · +1 508-260-0326
