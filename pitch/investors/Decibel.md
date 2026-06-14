<!-- Decibel Partners — Dan Nguyen-Huu (dev/data/security infra) -->

---

**Subject: Provenika — CI-gated provenance infrastructure for scientific evidence (OSS)**

Dan, Alessio —

Decibel backs essential infrastructure for developer, data, and security teams, and your OSS Spotlight is the reason I'm writing rather than pitching a closed product. **Provenika** ([provenika.com](https://provenika.com)) treats *trust as a primitive* for scientific compute — the way your security portfolio treats trust for code.

**The problem.** "AI for drug discovery" runs on a broken contract: the model emits a confident number, and you cannot tell whether it was fetched, computed, or hallucinated. Incumbents (Open Targets, Schrödinger, Insilico, Causaly, BenchSci) ship black-box outputs you cannot audit. In science, an unverifiable figure is worse than no figure.

**The wedge: re-verifiable provenance, enforced in CI.** Provenika is an open-source auditable evidence engine for the cheap, in-silico front of oncology research — target triage, ligand shortlist, structure, docking setup, feasibility. One rule, mechanically enforced: *compute or cite, never assert.* Every figure is either **fetched live** from a named public source (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) or **deterministically computed** from open code whose formula is cited. The LLM orchestrates and explains; it is never a source of facts.

What makes that a primitive and not a promise:
- **Provenance manifest** (`cad/provenance.py`) — tags each value `fetched`/`computed` with a re-verification URL; the code *raises* if asked to record a model-origin value.
- **Independent verifier** (`cad/verify.py`) — re-pulls every figure from its live source and emits **PASS / DRIFT / FAIL** (SMILES checked byte-equal to ChEMBL via a separate HTTP path).
- **CI gate** — a non-zero verifier exit fails the build (`.github/workflows/ci.yml`). Drift in upstream public data breaks the pipeline, exactly like a failing test.

Anyone can re-run a single command and watch each number resolve against its public URL.

**Honest weaknesses I won't hide.** All data is public — there's no data moat, and Open Targets gives the headline triage feature away free. The defensibility is the verification layer and developer trust, not the inputs. This is **research-only**: not a cure, drug, diagnosis, or medical advice.

**Traction:** [fill in].

**The ask.** 20 minutes to show the verifier live and pressure-test the "provenance-as-infrastructure" thesis — and your read on whether this fits the OSS Spotlight.

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326
