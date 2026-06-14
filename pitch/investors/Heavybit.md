<!-- Heavybit — James Lindenbaum (day-0 dev infra, OSS roots) -->

---

**Provenika — day-0 dev infrastructure for verifiable scientific compute**
*For Heavybit (James Lindenbaum / Jesse Robbins)*

James, Jesse — you backed Heroku and Chef on the same bet: when a workflow is painful, manual, and trust-dependent, the winning company turns it into infrastructure with an OSS-led wedge and a paid control plane on top. Provenika is that bet for scientific evidence.

**The wedge.** Every "AI for drug discovery" tool — Open Targets, Schrödinger, Insilico, Causaly, BenchSci — ships outputs you cannot audit. The deadliest failure mode of LLMs in research is a confident, fabricated number. Provenika's rule: **compute or cite, never assert.** Every figure is either fetched live from a named public DB (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) or computed by open deterministic code whose formula is cited. The LLM orchestrates; it is never a source of facts.

**Why it's infrastructure, not an app.** The product is a CLI + provenance manifest + verifier — the Snyk/LaunchDarkly shape, not a dashboard:

- `provenance.py` tags every value `fetched`/`computed` with a re-verification URL; it *raises* if asked to record a model-originated number.
- `verify.py` re-pulls each figure from its live source and emits PASS / DRIFT / FAIL, non-zero exit. It already **gates CI** in this repo.
- MIT-licensed core, runs locally in ~10 seconds against free public data.

That verifier is the product Heroku-style developers will adopt day-0: drop it in CI and fabricated or drifted numbers can't merge.

**Open-core GTM.** OSS engine drives adoption (the same playbook your portfolio runs). Paid layer = the control plane teams need but won't self-host: hosted continuous re-verification, drift alerting across a portfolio of targets, audit/attestation trails, private data connectors, SSO. Land via the free verifier; expand to teams that must *prove* their pipeline to a regulator, partner, or reviewer.

**Honest weaknesses I won't hide:** all data is public (no data moat — the moat is re-verifiable provenance + the verifier in the workflow); Open Targets gives the headline triage away free; this is **research-only**, not a cure, drug, diagnosis, or medical advice. Oncology is the beachhead; verifiable scientific compute is the market.

**Traction:** [fill in].

**The ask:** a day-0 / first-check conversation, and a working session on the open-core boundary and CI-native distribution motion. Repo and a 10-second `verify.py` demo ready on request.

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326

---

Submission channel (form): Heavybit's intake is a Typeform linked from their FAQ — **https://heavybit.typeform.com/to/tP7Lh7** (they "accept applications from early-stage technical startup founders year round" and "love to invest on day 0"). No traction metrics were invented; the one metric slot is marked `[fill in]`. All product claims above were verified against the actual repo at `/Users/bo/GitHub/cancer-cure-agent` (`cad/provenance.py`, `cad/verify.py`, `cad/run_pipeline.py`, MIT `LICENSE`, `.github/workflows/ci.yml`).
