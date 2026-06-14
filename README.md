# Provenika — auditable oncology evidence engine *(compute or cite, never assert)*

> A terminal-bound AI agent **cannot cure cancer.** It cannot run a lab, see a patient, or
> touch a device — and the deadliest failure mode of "AI for medicine" is a confident,
> plausible, **fabricated** number. So this project does the one thing such an agent *can*
> do honestly: turn **public** oncology data into **ranked, fully-cited, independently
> re-verifiable** hypotheses for human scientists — and make fabrication impossible to hide.

**This is the strategy.** Not "an AI that discovers drugs." An **auditable evidence engine**
that accelerates the cheap, in-silico *front* of drug discovery (target triage → ligand
shortlist → structure → docking setup → feasibility), where every figure can be traced back
to a public record and re-proven with one command.

**⚠️ Research only.** Generates hypotheses for experimental follow-up. **Not medical advice,
not a treatment recommendation, not a diagnosis.** A computational hit is not proof of anything.

---

## The one rule everything else serves

> **No figure shown to a human originates from a language model.**
> Every number is either **(a) fetched live** from a named public database, or **(b) computed**
> by deterministic, open-source code whose formula is cited. The LLM orchestrates and explains;
> it is **never** a source of facts.

Because a promise is worth nothing in medicine, the rule is **enforced and re-checkable**:

| Mechanism | File | What it guarantees |
|-----------|------|--------------------|
| **Provenance manifest** | `cad/provenance.py` → `provenance.json` | Every reported figure is tagged `fetched`/`computed`, with its source and a **re-verification URL**. The code *cannot* record a value whose origin is "model" — it raises. |
| **Independent verifier** | `cad/verify.py` | Re-pulls every figure from its live source → `PASS` / `DRIFT` / `FAIL`. Checks SMILES are **byte-equal to ChEMBL** (raw HTTP, separate code path) and recomputes deterministic scores. Non-zero exit gates CI. |
| **No fabricated docking** | `cad/dock.py` | A thin wrapper on AutoDock Vina. If the binary is absent it prints install steps and exits — it **never** invents a score. |
| **Heuristics labeled as heuristics** | `cad/cost_benefit.py`, `cad/virtual_triage.py` | Scoring weights and priors are marked as transparent, editable, **non-validated** design choices — not dressed up as data. |
| **A hard line on advice** | repo-wide | No per-patient recommendations, survival estimates, or treatment plans. Tools that crossed that line were neutralized (see [`docs/ANTI-HALLUCINATION.md`](docs/ANTI-HALLUCINATION.md)). |

**Honest scope:** the guarantee covers *figures in machine-readable artifacts*. Free-text
prose and the `cad/intel/` news digests are **leads to verify, never validated facts**, and are
labeled as such. See [`docs/ANTI-HALLUCINATION.md`](docs/ANTI-HALLUCINATION.md) for exactly what
is and is not covered, and what `verify.py` does and does **not** prove.

---

## Prove it yourself in 10 seconds

```bash
python3 cad/verify.py --target EGFR     # fetch-and-cite EGFR's headline figures, live, with URLs
```
```
✅ PASS  EGFR: ChEMBL potent activities = 21342   verify: https://www.ebi.ac.uk/chembl/api/data/activity?...
✅ PASS  EGFR: known-mechanism drugs = 49         verify: https://www.ebi.ac.uk/chembl/api/data/mechanism?...
✅ PASS  EGFR: PDB structures = 354               verify: https://www.uniprot.org/uniprotkb/P00533/entry
```
Open any URL. The number is there, in the public database — not in this tool's imagination.

---

## The pipeline (one command, real public data)

```bash
python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 \
    --incidence 60000 --price 150000 --out runs/egfr
python3 cad/verify.py --run runs/egfr          # re-prove every figure it wrote
```

Produces in `runs/egfr/`:

| Artifact | What it is | Source |
|----------|-----------|--------|
| `dossier.json` | Druggability snapshot: function, # PDB structures, ChEMBL ligand count, known drugs | UniProt + ChEMBL |
| `hits.csv` | Ranked ligand candidates (SMILES + ChEMBL links) for docking/ADMET | ChEMBL bioactivity |
| `structures/` | Best experimental PDB (or AlphaFold model) | RCSB PDB / AlphaFold |
| `binding_site.json` | Docking box computed from the co-crystal ligand envelope | deterministic geometry |
| `cost_benefit.json` | Approval prob., expected cost/time, risk-adjusted return (published priors) | BIO/Informa, DiMasi, Wong |
| **`provenance.json`** | **Every figure → origin + source + verify URL** | this repo |
| `SUMMARY.md` | One-page tie-together + the exact next command | this repo |

**Single stages:** `target_report.py` · `virtual_triage.py` · `fetch_structure.py` ·
`binding_site.py` · `cost_benefit.py` · `dock.py` — each takes `--json`. Full design &
validity caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.

---

## What this does — and deliberately does **not** — do

**Does (real, today):** resolve a target to UniProt/ChEMBL; count structures & known drugs;
rank measured-active ligands by potency + drug-likeness (RDKit); fetch a 3-D structure; build
a docking box; run a transparent feasibility model; emit a cited, re-verifiable dossier; and
search PubMed / ClinicalTrials.gov / cBioPortal / KEGG / Reactome / Open Targets live (62 OSINT
tools, see below).

**Does not (by design):** cure, treat, or diagnose anyone · recommend a therapy or generate a
treatment plan · estimate a patient's prognosis · design de-novo molecules with "validated"
scores · prove a molecule is safe or effective · replace docking/ADMET/wet-lab/a clinician.
**Triage ≠ validation.**

---

## OSINT one-liners (pick & justify a target)

```bash
cancer-cli "search literature <topic>"     # PubMed          cancer-cli "analyze gene <symbol>"     # cBioPortal
cancer-cli "find clinical trials <cancer>" # ClinicalTrials  cancer-cli "pathway analysis <gene>"   # KEGG
```
`cancer-cli` = `node dist/bin/cancer-cli.js`; `--self-test` checks API connectivity. All sources
free, no key, queried live: PubMed · ClinicalTrials.gov · cBioPortal · ChEMBL · KEGG · RCSB PDB ·
UniProt · Europe PMC · Reactome · Open Targets.

## Prerequisites

```bash
git clone https://github.com/Aroxora/cancer-cure-agent && cd cancer-cure-agent
npm install && npm run build      # TypeScript OSINT tools + CLI
python3 --version                 # 3.10+  (CAD tools are stdlib-only)
pip install rdkit                 # optional: similarity, PAINS/Brenk, scaffolds
```

## Can this be a real business? (honest analysis)

We asked it seriously, with cited market data and a skeptical investor's eye — including the
uncomfortable fact that **all our data sources are free and public** (no data moat). The verdict,
the comparables (Schrödinger, Certara, scite), and the only defensible wedges are in
**[`business/`](business/)**. Short version: not a classic venture rocket on its own, but a
credible **open-core + provenance/audit** play and a strong research/credibility asset.

## Pitch & fundraising — in the open

- **[`pitch/`](pitch/)** — YC application draft, investor pitch, and one-pager. Honest by construction: every claim is grounded in the cited business analysis, and traction figures are `[fill in]` placeholders — never invented.
- **[`outreach/`](outreach/)** — an agentic outreach system (RAG memory · AWS Lambda · Firestore) that researches prospects, drafts emails *grounded in the pitch docs* (so it can't fabricate traction), and — human-approved, **dry-run by default** — sends, classifies replies, and schedules follow-ups.
- **Public outreach log** — the website's **Outreach** tab shows a **privacy-redacted, real-counts** history of who we've contacted and what came back. Secrets, email addresses, and message contents are **never** published; names appear only with consent.

## Docs

- **[`docs/ANTI-HALLUCINATION.md`](docs/ANTI-HALLUCINATION.md)** — the no-fabrication architecture, exactly what's guaranteed, and what `verify.py` proves (and doesn't).
- **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)** — pipeline stages, what's implemented vs. wrapper-only, validity caveats.
- **[`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)** — architecture, how to run/extend the pipeline & web app, CI/CD, deploy.
- **[`business/`](business/)** — market, competition, moat, and the fundability verdict.

## Notes

- **Triage ≠ validation.** Scores rank hypotheses; docking/ADMET/wet-lab confirm them.
- **Cite the source.** Every figure points to a public record — `verify.py` re-pulls it for you.
- Cost-benefit numbers are rough public benchmarks (BIO/Informa, DiMasi, Wong et al.), not a valuation.

## License

MIT — research and decision-support only; not a substitute for professional medical advice.

---

*Strategy & disclaimers maintained by hand; operational sections regenerated by `cicd/generate_readme.py`.*
