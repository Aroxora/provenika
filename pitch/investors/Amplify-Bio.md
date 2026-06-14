<!-- Amplify Partners / Amplify Bio — Elliot Hershberg -->

---

**To: Elliot Hershberg, Amplify Partners** (warm intro preferred; else info@amplifypartners.com)
**Re: Provenika — an auditable evidence engine for oncology R&D (OSS-infra × bio)**

Elliot — you've written more clearly than almost anyone about why open bioinformatics tooling matters and why "The Century of Biology" runs on reproducible, inspectable software. Provenika sits exactly on the seam between Amplify's two practices: it's a dev-tools / OSS-infra product whose users happen to be drug-discovery researchers.

**The thesis.** LLMs made biomedical synthesis trivially cheap, which makes *trustworthy* synthesis the scarce thing. Every AI-for-discovery tool — Schrödinger, Insilico, Causaly, BenchSci, even Open Targets — ships outputs you cannot independently audit. In a field where one fabricated affinity value can misdirect a program, that's a liability, not a feature.

**The product.** Provenika (open source, public data, no API keys) is an "auditable evidence engine" for the cheap in-silico front of discovery: target triage → ranked ligand shortlist → structure → docking setup → feasibility. Its one rule is **compute or cite, never assert** — no figure shown to a human originates from a language model. Every number is either fetched live from a named source (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) or computed by deterministic, cited code.

**The wedge is the part you'll appreciate as an infra investor: re-verifiable provenance.** A provenance manifest tags every figure `fetched`/`computed` with a re-verification URL — the code literally *raises* if it tries to record a model-origin value. Then `cad/verify.py` re-pulls each number from its live source and returns PASS / DRIFT / FAIL, byte-comparing top-hit SMILES against ChEMBL over a separate raw-HTTP path and recomputing every deterministic score. Non-zero exit gates CI. You can re-prove a result yourself today: `python3 cad/verify.py --target EGFR`.

**What I won't hide.** All sources are public — no data moat. Open Targets gives the headline triage feature away free. This is research-only: not a cure, drug, diagnosis, or medical-advice company. The moat is trust + re-verifiable provenance + private-data fusion behind the customer firewall — the one thing black boxes structurally can't offer.

**Why Amplify.** You evaluate OSS-infra-meets-bio for a living and can pressure-test the "verifier as the product" bet faster than a generalist.

**Traction:** [fill in: GitHub stars, contributors, pipeline runs, web visits, design partners]. Live demo + verifier are public now.

**Ask:** a 30-minute call to walk through the verifier and the open-core + private-data-fusion plan; I'd value a warm intro if one exists.

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326 / provenika.com
