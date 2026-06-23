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

**▶ Try it live, no install:** **[provenika.com](https://provenika.com)** — the same analyses,
interactive in the browser (disease → targets → triage → structure → models), every figure
traceable to its public source. The command-line pipeline below is the keyless, scriptable core.

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
| **Independent verifier** | `cad/verify.py` | Re-pulls every figure from its live source → `PASS` / `DRIFT` / `FAIL`. Checks SMILES are **byte-equal to ChEMBL** (raw HTTP, separate code path) and recomputes deterministic scores. Non-zero exit gates CI. A run with **no target-specific evidence never earns a green banner.** |
| **No fabricated docking** | `cad/dock.py` | A thin wrapper on AutoDock Vina. If the binary is absent it prints exact install steps and exits — it **never** invents a score. (`--check` reports what you have.) |
| **No verdict without a target** | `cad/run_pipeline.py` | If a target can't be resolved (unknown gene, or a fictional one), the pipeline **refuses to emit a feasibility verdict and exits non-zero** — it will not hand you a confident "proceed" for a target it never assessed. |
| **Heuristics labeled as heuristics** | `cad/cost_benefit.py`, `cad/virtual_triage.py` | Scoring weights and priors are marked as transparent, editable, **non-validated** design choices — not dressed up as data. The feasibility verdict is a **modality/phase-level benchmark, not a target-specific prediction**, and says so. |
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
(Exact counts above are illustrative; the live values are what print, and they grow over time.)

This needs **only Python 3** — no build, no pip install, no key. (Don't want to run anything?
Browse a committed real run in [`examples/sample-run-egfr/`](examples/sample-run-egfr/).)

---

## Install

```bash
git clone https://github.com/Aroxora/provenika && cd provenika

# 1) Python CADD pipeline — the science. stdlib-only; RDKit is the ONE optional dep.
python3 --version                       # 3.10+ recommended (CI uses 3.12)
pip install -r cad/requirements.txt     # installs RDKit (similarity, PAINS/Brenk, QED, scaffolds)
python3 cad/verify.py --target EGFR      # confirm it works — live, cited, no build needed

# 2) Node OSINT tools + cancer-cli — optional, for the live literature/trials/gene search
npm install && npm run build            # builds dist/bin/cancer-cli.js
```

**Shortcut:** `make setup && make verify`, then `make` to list every one-command target
(`pipeline`, `test`, `smoke`, `dock-check`, …). `make test` runs the offline checks CI runs;
`make smoke` re-runs every headline command in this README live, so it can't drift from reality.

**Optional extras** (only if you need them):

```bash
# Docking (stage 6) needs two non-pip binaries on PATH — conda is the reliable path:
conda install -c conda-forge vina openbabel
python3 cad/dock.py --check             # ✅/❌ for vina + obabel, then the next command works
# (`pip install vina` does NOT build on recent Python; there's no Homebrew vina formula.)

# The research website (Angular) is a separate build, not needed for the pipeline:
cd web && npm ci && npx ng build        # or `npm start` for a dev server
```

> Without RDKit the pipeline still runs end-to-end (it uses ChEMBL-computed properties and
> turns off 2-D similarity). Docking is the only part that needs non-pip software.

---

## The pipeline (one command, real public data)

```bash
python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 \
    --incidence 60000 --price 150000 --out runs/egfr
python3 cad/verify.py --run runs/egfr          # re-prove every figure it wrote
```

Produces in `runs/egfr/` (see a committed real example in [`examples/sample-run-egfr/`](examples/sample-run-egfr/)):

| Artifact | What it is | Source |
|----------|-----------|--------|
| `dossier.json` | Druggability snapshot: function, # PDB structures, ChEMBL ligand count, known drugs | UniProt + ChEMBL |
| `hits.csv` | Ranked ligand candidates (SMILES + ChEMBL links) for docking/ADMET | ChEMBL bioactivity |
| `liabilities.json` | PAINS / Brenk structural-alert flags on the hits (optional; needs RDKit) | RDKit |
| `structures/` | Best experimental PDB (or AlphaFold model) | RCSB PDB / AlphaFold |
| `binding_site.json` | Docking box computed from the co-crystal ligand envelope | deterministic geometry |
| `cost_benefit.json` | Approval prob., expected cost/time, risk-adjusted return (published priors) | BIO/Informa, DiMasi, Wong |
| **`provenance.json`** | **Every figure → origin + source + verify URL** | this repo |
| `SUMMARY.md` | One-page tie-together + the exact next command | this repo |

**If the target isn't real** (or can't be resolved): the pipeline prints a clear message,
writes **nothing**, and **exits non-zero** — it will not fabricate a "Favorable — proceed"
verdict for a gene it never found. Try it: `--target NOTAREALGENE`.

**Single stages:** `target_report.py` · `virtual_triage.py` · `fetch_structure.py` ·
`binding_site.py` · `cost_benefit.py` · `dock.py` — each takes `--json`. Full design &
validity caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.

---

## Verifying a run (what the labels mean)

`python3 cad/verify.py --run <dir>` re-pulls every figure from its live source:

- **`PASS`** — the saved figure reproduces from the source today.
- **`DRIFT`** — it changed but is the same order of magnitude (a living database gained
  records). **Not** a failure; re-run the pipeline to refresh.
- **`FAIL`** — could not be reproduced, differs wildly, or the source returns nothing where a
  value was claimed → treat as suspect. **Non-zero exit gates CI.**

A run that contains **no target-specific evidence** (no dossier, no hits) does **not** get the
"every figure reproduced" banner — an empty/unresolved run is flagged, not blessed. The SMILES
identity check (byte-equal to ChEMBL) and the deterministic recomputes are the genuinely
independent checks; the count checks prove *reproducibility/freshness*, not that the query
design is the right one. See [`docs/ANTI-HALLUCINATION.md`](docs/ANTI-HALLUCINATION.md).

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

## OSINT one-liners (pick & justify a target) — keyless

```bash
cancer-cli --self-test                     # live-check all 7 data sources
cancer-cli "search literature <topic>"     # PubMed          cancer-cli "analyze gene <symbol>"     # UniProt
cancer-cli "find clinical trials <cancer>" # ClinicalTrials  cancer-cli "pathway analysis <gene>"   # KEGG
cancer-cli "find drug targets <gene>"      # ChEMBL
```
`cancer-cli` = `node dist/bin/cancer-cli.js`. **These five research one-liners (and `--self-test`)
need no API key** — they dispatch straight to the public databases and print cited results live.
Free sources, all live: PubMed · ClinicalTrials.gov · cBioPortal · ChEMBL · KEGG · RCSB PDB ·
UniProt · Europe PMC · Reactome · Open Targets. (Only open-ended, conversational queries fall
through to the optional LLM agent, which needs a model key: `cancer-cli --key <DEEPSEEK_API_KEY>`.)

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
- **Live data.** Everything is fetched on demand from public APIs (no cache, no key). If a *known* target fails to resolve, the source (ChEMBL/UniProt/PDB) may be momentarily down or rate-limited — wait and retry; the tool fails loudly rather than guessing.
- Cost-benefit numbers are rough public benchmarks (BIO/Informa, DiMasi, Wong et al.), modality/phase-level — not a target-specific prediction and not a valuation.

## License

MIT — research and decision-support only; not a substitute for professional medical advice.

---

*Strategy & disclaimers maintained by hand; operational sections regenerated by `cicd/generate_readme.py` (62 tools).*
