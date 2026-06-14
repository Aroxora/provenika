<!-- OSS Capital — Joseph Jacks (commercial open-source) -->

---

**To:** hello@oss.capital
**Subject:** COSS for regulated science: re-verifiable provenance as the moat (Provenika)

Joseph —

OSS Capital has been the only fund underwriting commercial open source as a category since 2018, so I'll skip the "open source is eating software" preamble and get to the COSS-specific bet.

**Provenika** is an open-source *auditable evidence engine* for oncology drug-discovery research. It turns free public data (ChEMBL, UniProt, PDB, PubMed, ClinicalTrials.gov) into ranked, fully-cited hypotheses — target triage, ligand shortlists, structures, docking setup, feasibility. The product principle is **"compute or cite, never assert"**: no figure shown to a human originates from a language model. Every number is fetched-and-cited or deterministically computed, and a one-command verifier (`verify.py`) re-pulls each figure from its public source and returns **PASS / DRIFT / FAIL**.

**Why this is a COSS company, not a repo.** The community asset is *trust infrastructure*: re-verifiable provenance that any scientist, reviewer, or auditor can re-run independently. Open source is the only credible distribution for this — a closed "trust us" box is a contradiction in regulated science. That's also the wedge against the incumbents (Open Targets, Schrödinger, Insilico, Causaly, BenchSci): they ship **closed, black-box outputs you cannot audit**. We make fabrication impossible to hide.

**Open-core path (the commercial layer).** The OSS core stays free and earns the trust. The proprietary edge lives **behind the customer's firewall**: private-data fusion (internal assay/screening data merged with public evidence) and **audit-ready, version-pinned provenance snapshots** for regulated teams who need a frozen, re-verifiable record for IND filings, IP, and internal review. The moat isn't the data — it's the *re-verifiability*, which compounds as a standard.

**Honest weaknesses (you'll find them anyway).** All sources are public — no data moat; the moat is provenance + open-core surface. Open Targets gives the headline triage away free. And this is **research-only — not a cure, drug, diagnosis, or medical advice.**

**Traction:** [fill in — users / design partners / GitHub stars / verifier runs]. **Stage / raise:** [fill in].

**The ask:** 30 minutes to walk through the verifier live (`python3 cad/verify.py --target EGFR` — open any URL it prints) and pressure-test the open-core monetization with someone who has seen the COSS playbook more times than anyone.

Bo Shang — bo@shang.software / bo@trenchwork.org / +1 508-260-0326
