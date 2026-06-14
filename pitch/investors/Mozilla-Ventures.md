<!-- Mozilla Ventures — Mohamed Nanabhay (responsible AI) -->

---

**Provenika — auditable evidence engine for cancer-drug-discovery research**
*Submission for Mozilla Ventures*

**The thesis Mozilla already shares.** The most dangerous failure of "AI for science" is the confident, plausible, fabricated number — opaque output you're asked to trust. Provenika makes that impossible to hide. Our single governing rule: **no figure shown to a human originates from a language model.** Every number is either fetched live from a named public database or computed by open, deterministic code whose formula is cited. The LLM orchestrates and explains; it is never a source of facts. This is responsible AI, transparency, and human dignity as working code — directly aligned with the Mozilla Manifesto.

**What it does.** Provenika turns *free public* data (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) into ranked, fully-cited oncology research hypotheses: target triage → ligand shortlist → structure → docking setup → feasibility. It accelerates the cheap, in-silico *front* of drug discovery for human scientists.

**The defensible wedge: re-verifiable provenance.** Every figure carries a re-verification URL. A one-command verifier (`python3 cad/verify.py --target EGFR`) re-pulls each number from its live public source and returns PASS / DRIFT / FAIL — non-zero exit gates CI. The code *cannot* record a value whose origin is "model"; it raises. Docking wraps AutoDock Vina and never invents a score. Incumbents (Open Targets, Schrödinger, Insilico, Causaly, BenchSci) ship closed, black-box outputs you cannot independently audit. Provenika is open-source and built to be checked by anyone.

**Honest weaknesses (we won't hide them).** All data sources are public — no data moat. Open Targets gives the headline target-triage feature away for free. And this is **research-only**: not a cure, drug, diagnosis, or medical advice. Our moat is the auditability layer and the verifier, not the data.

**Why a fund, why now.** Auditable, re-verifiable AI is a public good. The sustainable model: open core + hosted verification/provenance-as-a-service and audit tooling for labs, biotechs, and journals that need every claim traceable — a standard that generalizes beyond oncology to any evidence-driven domain.

**Traction:** [fill in — users, design partners, GitHub stars; do not invent].
**Raising:** [fill in].
**Ask:** A 20-minute call to walk through the live verifier and the open-core plan.

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326 · provenika.com
