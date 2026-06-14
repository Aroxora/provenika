<!-- Lux Capital — Shaq Vayda (biotech × software) -->

---

**To:** Lux Capital (general inbox) — for Shaq Vayda / Tess van Stekelenburg
**Re:** Provenika — an auditable evidence engine for oncology discovery (warm intro preferred)

Shaq, Tess —

You'll raise the right objection first, so let me put it on the table before the pitch: **Provenika has no data moat.** Every source we touch — ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov — is free and public. Open Targets gives away the headline target-triage feature. I'm not going to pretend otherwise.

Here's why I think that's the wrong axis to evaluate us on.

The bottleneck in computational discovery isn't access to data — it's *trust* in derived outputs. Recursion and Enveda both spent enormous effort making their internal results reproducible and auditable, because a confident, plausible, fabricated number is the deadliest failure mode in this field. Today every tool that *interprets* public data for you — Schrödinger, Insilico, Causaly, BenchSci, even Open Targets — ships a **closed, black-box answer you cannot independently re-verify.** You take the ranking on faith.

Provenika's wedge is the opposite contract: **compute or cite, never assert.** No figure shown to a human originates from a language model. Every number is either fetched live from a named public database or computed by deterministic open-source code whose formula is cited. The product enforces this — the code literally *raises* if it tries to record a model-originated value — and a one-command verifier re-pulls every figure from its live source and returns PASS / DRIFT / FAIL, including byte-equal SMILES checks against ChEMBL via a separate code path. The LLM orchestrates and explains; it is never a source of facts.

That reframes the moat. We're not defending *the data* — we're the trusted, re-verifiable provenance layer on top of it. Open being our distribution wedge, not our weakness.

The commercial path — and the part I'd want your read on — is **private-data integration**: the same verifier contract pointed at a customer's internal assay results, proprietary structures, and chemistry. The provenance/audit substrate is the durable asset; the public corpus is just the free, credible proof-of-concept.

**Honest limits:** research-only — not a cure, drug, diagnosis, or medical advice. The guarantee covers figures in machine-readable artifacts, not free-text prose. Traction: **[fill in]**.

**The ask:** 20 minutes, or a warm intro to whoever on the team owns the biotech×software thesis. I'll run the live verifier on a target of your choosing on the call.

Bo Shang — bo@shang.software · bo@trenchwork.org · +1 508-260-0326
