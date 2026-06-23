# Anti-hallucination architecture

A terminal-bound LLM agent has no access to patients, labs, EHRs, or devices, and its most
dangerous failure mode is a **confident, plausible, fabricated number**. This document is the
honest, complete account of how this repo prevents that — including what it does **not** cover.

## The one rule

> **No figure shown to a human originates from a language model.**
> Every number is either **fetched** live from a named public database, or **computed** by
> deterministic, open-source code whose formula is cited.

Two legitimate origins, enforced in code (`cad/provenance.py`):

```python
FETCHED  = "fetched"    # pulled live from a public source (URL recorded)
COMPUTED = "computed"   # deterministic code from fetched inputs (formula cited)
```

`Figure.__post_init__` **raises** if any other origin (e.g. `"model"`) is used. A value cannot be
recorded as coming from the LLM.

## The mechanisms

### 1. Provenance manifest — `cad/provenance.py` → `provenance.json`
Every pipeline run emits a manifest listing each reported figure with its origin, source, a
**re-verification URL**, and a human-readable note. `SOURCES` is the single registry of public
databases (UniProt, ChEMBL, RCSB, AlphaFold, the cost benchmarks), each with a stable docs link and
a URL builder. Add a source there, nowhere else.

### 2. The verifier — `cad/verify.py`
Re-pulls every figure and reports `PASS` / `DRIFT` / `FAIL`:

- **`PASS`** — reproduces from the source.
- **`DRIFT`** — changed but same order of magnitude (a living DB gained records). *Not* a failure; tolerance is 10% or ±2, whichever is larger.
- **`FAIL`** — could not reproduce, differs wildly, or the source returns nothing where a value was claimed → **suspect**.

Non-zero exit on any `FAIL`, so it gates CI. Every check prints the exact URL for a third, by-hand
confirmation.

**What it proves — and what it does not (read this):**
- **Count checks** (ChEMBL/UniProt) re-run the *same* query logic from the stage modules. They prove
  **reproducibility and freshness** — that the saved number is what the documented query returns
  today — **not** that the query *design* is the right one. A wrong-but-stable query would pass.
- **The SMILES check IS independent**: it fetches each top ligand's canonical SMILES straight from
  ChEMBL over **raw HTTP (a separate code path)** and requires **byte-equality** with `hits.csv` —
  catching an edited or transposed structure that still "parses."
- **Deterministic artifacts** (`cost_benefit.json`, the triage score, and the **docking box** —
  re-derived from the structure's co-crystal ligand envelope) are **recomputed** and must
  reproduce **exactly** — a mismatch means the file was edited/fabricated after the fact.
- It checks that numbers are **real and re-derivable** — never that a molecule *works*. **Triage ≠ validation.**

### 3. No fabricated docking — `cad/dock.py`
A thin wrapper on AutoDock Vina. If the binary (or Open Babel) is absent, it prints install steps and
exits. It never estimates or invents a score. (Honestly: this means docking is **wrapper-present but
not exercised in CI**, because CI does not install Vina — see `REAL-CAD-ROADMAP.md`.)

### 4. Heuristics labeled as heuristics
The triage scoring weights (`virtual_triage.py`) and the cost-benefit multipliers / oncology factor /
gross margin (`cost_benefit.py`) are **transparent, editable, non-validated design choices** — not
fitted to any benchmark and not dressed up as data. The *inputs* are real (pChEMBL, QED, published
LOA priors); only their *combination* is heuristic, and the score is a triage ordering, never a
prediction of efficacy. The constants are commented as such in the source.

### 5. No verdict — and no green check — without a target
Two failure modes specific to *triage* are closed in code:
- **Unresolved target → no verdict.** If `run_pipeline.py` cannot resolve the target to a
  ChEMBL/UniProt entry (an unknown or fictional gene), it writes **nothing**, prints why, and
  **exits non-zero**. The cost-benefit model is target-*independent*, so emitting its
  "Favorable — proceed" for a target that was never found would be a fabricated go-signal — the
  pipeline refuses. (`SUMMARY.md` also labels that figure a modality/phase-level benchmark, not a
  per-target prediction.)
- **No target evidence → no clean bill of health.** `verify.py` will not print "every reported
  figure reproduced" for a run that contains no target-specific figures (no `dossier.json`, no
  `hits.csv`): a wholly empty run **FAILs**, and a cost-benefit-only run gets a qualified banner
  (`target_evidence: false` in `--json`), never a green check.

## What is covered — and what is NOT

**Covered** (the guarantee): the **figures** in machine-readable artifacts — `dossier.json`,
`hits.csv`, `cost_benefit.json`, and `provenance.json`.

**NOT covered** (honest carve-outs):
- **Free-text narrative** — `SUMMARY.md` prose and the read-out lines in `target_report.py`
  ("rich/moderate/sparse ligand data") are human-readable summaries, not audited figures.
- **`cad/intel/` news digests** (`news_update.py`, Tavily-derived) are **leads to verify at the
  primary source — never validated facts**, and are labeled as such where they appear.
- **Query-design correctness** — see the verifier caveat above.
- **Structure file byte-integrity** — `verify.py` confirms a structure exists and is a parseable PDB
  with the cited ID; it does not hash-compare against a fresh RCSB download (PDB headers vary), so
  it is "exists + parseable," not "byte-identical."

## The hard line: no medical advice

A research agent must never produce a per-patient recommendation, dose, treatment plan, or prognosis
— and outputs that *direct treatment* would also pull the tool into FDA SaMD regulation. Tools that
had crossed this line were **neutralized** in this codebase:

| Tool | Was | Now |
|------|-----|-----|
| `treatmentTools.ts` · `StratifyRisk` | returned recurrence-risk % and 5/10-yr survival from an ad-hoc formula, framed as clinical | output + description marked **NON-VALIDATED illustrative heuristic; not a clinical estimate; never inform care**; points to validated tools |
| `treatmentTools.ts` · `RecommendTreatment` | emitted a per-patient `primaryTherapy` recommendation (e.g. "Lobectomy… evidenceLevel: Category 1") with **no** disclaimer — and parsed stage "IV" as `0`, routing metastatic patients to the early-stage **curative-surgery** branch | handler **unwired**; now returns a NOT-MEDICAL-ADVICE notice + evidence-lookup pointers (never a therapy); the recommender function is dead code, marked do-not-re-wire |
| `biomarkerTools.ts` · `GetPrognosticAssessment` | returned a risk category / prognosis with no disclaimer | leads with a **NON-VALIDATED, not-a-clinical-prognosis** disclaimer |
| `curativeTools.ts` · `DesignCurativeProtocol` | emitted a "Proposed Treatment Protocol" with specific doses ("Fludarabine 30 mg/m²…") and a "Recommended Approach" | reframed as a general **educational description of how a therapy class is administered**; doses removed; leads with a NOT-MEDICAL-ADVICE banner; no recommendation |
| `curativeTools.ts` · `AssessCurativePotential` | returned a `bestApproach` "recommendation" | relabeled **"most-studied option (evidence only — not a recommendation)"** |
| `cicd/patient_match.py` | printed "RECOMMENDED APPROACH" / "TREATMENT PROTOCOL" in a clinical-decision-support layout | reframed as **"published therapy options — evidence lookup"**; leads with the disclaimer; no plan |

## Fabricated example outputs, quarantined

`cicd/cad_solutions.json` and `cad_summary.json` were committed **template/placeholder** outputs from
a *silent fallback* (`run_cad_all.py`) that fires when the discovery tools fail (e.g. no API key) —
all 14 "screening solutions" were the identical string. They are now marked with a loud `__CAVEAT__`
("NOT REAL RESULTS… do not cite"), and the silent fallback no longer masquerades as a real proposal.
The real, provenance-tracked path is `cad/run_pipeline.py` + `cad/verify.py`.

## How to verify the whole thing yourself

```bash
python3 cad/verify.py --target EGFR             # live fetch-and-cite, no saved run
python3 cad/run_pipeline.py --target BRAF --out runs/braf
python3 cad/verify.py --run runs/braf           # re-prove every figure it wrote
python3 cad/run_pipeline.py --target NOTAREALGENE --out runs/x   # → clear error, writes nothing, exits non-zero
```
Open any `verify:` URL. If the number isn't there in the public database, it didn't come from here.
