# Implementation Guide

How the **Oncology CADD · OSINT** project is built, run, extended, and deployed.

> **Scope & safety.** This is a research / decision-support and educational system. It must
> never present treatment advice or claim to discover or cure anything. Every figure it
> shows must trace to a public source, and every formula must match a canonical reference.
> Keep that invariant when extending anything below.

---

## 1. Architecture at a glance

Three cooperating layers, one repo:

```
cancer-cure-agent/
├── cad/                 Python CADD pipeline (stdlib-only; RDKit/Vina optional)
├── web/                 Angular 21 SPA — interactive site (Firebase Hosting)
├── src/                 TypeScript agent framework + public-DB clients + cancer tools
├── cicd/                Python CI helpers + README generator + Tavily news updater
├── docs/                this guide + REAL-CAD-ROADMAP.md
└── .github/workflows/   ci.yml · news-update.yml · hosting-deploy.yml
```

| Layer | Language | Entry points | Purpose |
|-------|----------|--------------|---------|
| CAD pipeline | Python 3.10+ | `cad/*.py` | Scriptable target→candidate triage on public APIs |
| Web app | Angular 21 (TS) | `web/` | Same analyses, interactive, in the browser |
| Framework | TypeScript | `src/` | Typed tool/agent runtime + 7 public-DB clients |

The web app and CAD pipeline are **independent implementations of the same analyses** against
the same public APIs. The web app calls the APIs directly from the browser (all CORS-enabled);
the Python tools call them server-side/CLI. Neither needs a backend or API key for the core
databases.

---

## 2. Prerequisites

```bash
node --version     # ≥ 20  (web app + TS framework)
python3 --version  # ≥ 3.10 (cad/ tools are standard-library only)
# optional
pip install rdkit                                  # cad: similarity / descriptors
conda install -c conda-forge vina openbabel        # cad/dock.py only
npm install -g firebase-tools                       # deploy
```

Clone & build:

```bash
git clone https://github.com/Aroxora/provenika && cd provenika
npm install && npm run build         # TS framework + CLI
cd web && npm install && npm start   # web app at http://localhost:4200
```

---

## 3. Public data sources

All free, public, queried live; **no API keys**, no proprietary or patient data. The web app
calls these directly (every one returns `Access-Control-Allow-Origin: *`):

| Source | Used for | Web service | Python client |
|--------|----------|-------------|---------------|
| Open Targets | disease → druggable targets (assoc. scores) | `core/opentargets.service.ts` | — |
| ChEMBL (EBI) | bioactivity, drug props, molecule SVG | `core/chembl.service.ts` | `src/datasources/drug/chemblClient.ts` |
| UniProt | protein function, PDB xrefs | `core/uniprot.service.ts` | `src/datasources/protein/uniprotClient.ts` |
| RCSB PDB | 3-D structures, Mol* viewer | `features/structure/structure.ts` (iframe) | `src/datasources/protein/pdbClient.ts` |
| ClinicalTrials.gov v2 | trials | `core/trials.service.ts` | `src/datasources/clinical/clinicalTrialsClient.ts` |
| Europe PMC | literature | `core/europepmc.service.ts` | — |
| Reactome | pathways | `core/reactome.service.ts` | — |
| PubMed (NCBI) | literature (CLI) | — | `src/datasources/ncbi/pubmedClient.ts` |
| cBioPortal | cancer genomics | — | `src/datasources/genomics/cbioportalClient.ts` |
| KEGG | pathways (CLI only) | — | `src/datasources/pathway/keggClient.ts` |

> **CORS note.** KEGG and PubMed `esummary` are **not** browser-callable (no CORS header). The
> web app uses **Reactome** for pathways and **Europe PMC** for literature instead. Verify CORS
> (`curl -I -H "Origin: https://x" <url>` → `access-control-allow-origin`) before wiring any new
> source into the web app.

---

## 4. The CAD pipeline (`cad/`)

Python; each tool is independently runnable and `--json`-capable. Core tools are
standard-library only; **RDKit** (cheminformatics) and **AutoDock Vina + Open Babel**
(docking) are optional engines, clearly feature-gated.

| Stage | File | What it does | Engine / sources |
|-------|------|--------------|------------------|
| 1 | `target_report.py` | Druggability dossier (function, #PDB, ligand depth, known drugs) | UniProt + ChEMBL |
| 2 | `virtual_triage.py` | Rank ligands by potency (pChEMBL) + drug-likeness; CSV; novelty filter; similarity | ChEMBL (RDKit optional) |
| 2b | `cheminformatics.py` | RDKit: descriptors, **LE/LLE**, drug-likeness rules (Ro5/Veber/Egan, **GSK 4/400** + **Pfizer 3/75** developability), **PAINS/Brenk** alerts, **Butina chemotype clustering**, Murcko scaffolds, similarity | **RDKit** |
| 3 | `fetch_structure.py` | Best experimental PDB (X-ray, best res) or AlphaFold fallback | UniProt + RCSB + AlphaFold |
| 4 | `binding_site.py` | Docking box (center+size) from the co-crystal ligand envelope | RCSB (stdlib) |
| 5 | `dock.py` | AutoDock Vina wrapper: clean receptor prep, `--box-json`, parsed ΔG (gated on binaries) | **Vina + Open Babel** |
| — | `cost_benefit.py` | Program feasibility: P(approval), cost/time, risk-adjusted return | static benchmarks |
| — | `run_pipeline.py` | Orchestrates 1→2b (incl. `liabilities.json`) → 3→4 + cost-benefit → `SUMMARY.md` (+ ready dock command); degrades to a partial dossier if a source is down | orchestrator |
| — | `precompute_site_data.py` | triage→cheminformatics JSON per target for the web app (browser can't run RDKit) | ChEMBL + **RDKit** |
| — | `news_update.py` | Tavily news digests → `cad/intel/` (key from env only) | Tavily |

```bash
python3 cad/run_pipeline.py --target EGFR --modality small_molecule --phase phase1 --out runs/egfr
python3 cad/virtual_triage.py --target "KRAS G12C" --min-pchembl 8 --exclude-approved --out hits.csv
python3 cad/cheminformatics.py --csv hits.csv --json          # LE/LLE, PAINS/Brenk, chemotypes
python3 cad/binding_site.py --pdb 1M17                          # docking box
python3 cad/dock.py --receptor structures/1M17.pdb --smiles "<SMILES>" --box-json runs/egfr/binding_site.json
```

Design rules for `cad/` tools: stdlib core, with RDKit/Vina optional and feature-gated
(tools that need them exit with install guidance if absent); read `TAVILY_API_KEY` from the
environment **only**; never fabricate a result (`dock.py` runs the real Vina binary or prints
install steps — it never invents scores); print a "verify at the primary source" disclaimer.
The RDKit-only signals are precomputed into `web/public/data/cheminformatics/<TARGET>.json` by
`precompute_site_data.py` (weekly Action) and shown in the web triage drawer.

See `docs/REAL-CAD-ROADMAP.md` for the full stage map and what is documented vs. implemented.

---

## 5. The web app (`web/`)

**Stack:** Angular 21, **zoneless** change detection, **standalone** components, **signals**,
SCSS, no UI framework. Build output: `web/dist/cancer-osint-web/browser`.

### 5.1 Layout

```
web/src/app/
├── app.ts / app.html / app.scss   shell: target search, nav tabs, dynamic favicon, URL state
├── app.config.ts                  providers: zoneless + HttpClient(fetch) + router
├── app.routes.ts                  lazy routes (one per tab)
├── core/                          services + pure logic (no UI)
│   ├── *.service.ts               one per public API (ChEMBL, UniProt, Europe PMC, Reactome, trials)
│   ├── dossier/triage/cost-benefit.service.ts   orchestration (ports of cad/*.py)
│   ├── math-models.ts             pure, cited quantitative-pharmacology functions
│   ├── models.ts                  shared TypeScript interfaces
│   ├── target-store.ts            shared signals: active target + focus ligand
│   ├── glossary.ts / methods.ts   verified educational content (workflow-generated)
│   ├── favicon.service.ts         per-view dynamic favicon (SVG data-URI)
│   └── firebase.ts                Firebase web SDK init (+ analytics)
├── features/<tab>/<tab>.ts        one standalone component per route
└── shared/info-tip.ts            glossary tooltip component
```

### 5.2 Routes / tabs

`overview` (landing) · `disease` (any disease → targets, Open Targets) · `dossier` (incl. Open
Targets druggability tractability) · `triage` · `structure` · `cost-benefit` · `models` (8
interactive models) · `literature` · `pathways` · `trials` · `report`. All lazy-loaded in
`app.routes.ts`.

### 5.3 Shared state & cross-linking

`TargetStore` (`core/target-store.ts`) holds two signals:

- `target` — the active protein/gene; every tab reacts to it via `effect()`. Synced to a
  shareable `?t=` query param in `app.ts`.
- `focusLigand` — a compound the user drilled into in **triage**; the **models** tab reads it to
  prefill the dose-response EC50 and the potency converter. This is the rank→inspect→model loop.

End-to-end flow: **disease** (Open Targets association) → click a target → `store.set(symbol)` →
**dossier** (incl. tractability) → **triage** → click a hit → `focusLigand` → **models**, with
literature / pathways / structure / trials / cost-benefit available throughout. Every
effect-driven fetch guards against stale responses (capture the requested target/query, discard
the result if it changed mid-flight) so rapid switching can't show mismatched data.

### 5.4 Patterns to follow

- **Services** return Promises (via `firstValueFrom(http.get(...))`), parse the real API JSON
  shape, and live in `core/`. One service per source.
- **Components** are standalone, use `inject()`, hold `signal()` state, and react to
  `TargetStore` with `effect()`. Wrap async work triggered from an effect in `untracked()` so the
  effect only tracks the intended signal (see `features/triage/triage.ts` — this prevents the
  control inputs from re-triggering network calls).
- **Charts** are hand-rolled SVG (`features/math/line-plot.ts`, `features/triage/scatter.ts`) —
  no chart library. Interactive points are `role="button"`, keyboard-activatable (Enter+Space),
  and use redundant shape+color encoding (not color alone).
- **Modals** (e.g. the triage hit drawer) are `role="dialog" aria-modal` with focus moved in on
  open, restored on close, a Tab focus-trap, and Escape-to-close.
- **Accessibility** is a release gate: sortable headers carry `aria-sort` and are keyboard
  operable; metric labels link to verified glossary definitions via `<app-tip>`.

---

## 6. Interactive math models

All formulas live in **`web/src/app/core/math-models.ts`** as pure functions, each documented
with its canonical reference. The 8 model cards on the `/models` tab use them.

| Model | Function(s) | Reference |
|-------|-------------|-----------|
| Dose–response (Hill/Emax) | `hill` | Hill 1910; Goutelle 2008 |
| Potency converter | `nMtoP`, `pTonM`, `chengPrusoff` | ChEMBL FAQ; Cheng-Prusoff 1973 |
| One-compartment PK | `keFromHalfLife`, `multiDoseConc`, `accumulationRatio`, `aucSingle` | Gibaldi & Perrier |
| Allometric HED | `humanEquivalentDose` (`KM_FACTORS`) | FDA 2005 guidance |
| Tumor growth | `tumorVolume` (exp/logistic/gompertz), `doublingTime` | Laird 1964; Norton 1988 |
| Survival | `survivalExp`, `hazardRatioExp` | Collett, survival analysis |
| Enzyme kinetics | `michaelisMenten` | Michaelis & Menten 1913 |
| Synergy | `combinationIndex`, `synergyVerdict`, `hillFraction`, `blissExpected` | Chou-Talalay 2006; Bliss 1939 |

### 6.1 Adding a new model (recipe)

1. Add a pure function to `core/math-models.ts` with a doc comment naming the **exact published
   reference**. No hard-coded thresholds without a citation.
2. Add a card to `features/math/math.ts`: input `signal()`s, a `computed()` for the result/series,
   and `<app-line-plot>` for any curve (pass `xmin/xmax/ymin/ymax`, `logX` if needed, `markers`).
3. If it introduces a term users will see, add a `GlossaryEntry` and reference it with `<app-tip>`.
4. **Verify the formula** before shipping — run the formula-verification workflow (§8) or have a
   reviewer confirm it against the reference. This is mandatory for math.

### 6.2 Adding a new tab / data source (recipe)

1. Confirm the API is **CORS-enabled** from the browser (see §3 note).
2. Create `core/<name>.service.ts` that fetches and maps the real response shape.
3. Create `features/<name>/<name>.ts` (standalone, signals, `effect()` on `TargetStore.target`).
4. Register a lazy route in `app.routes.ts` and a `<a routerLink>` in `app.html`.
5. Add a favicon glyph for the route in `core/favicon.service.ts`.
6. Add a methods entry (and any glossary terms) so the Overview "Methods & sources" stays complete.

---

## 7. CI/CD (`.github/workflows/`)

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `ci.yml` | every push / PR | **Node:** `npm ci` → `npm run build` → `tsc --noEmit` → `npm test -- --ci --forceExit`. **Python:** `compileall cad cicd` + CAD smoke tests. **Web:** `npm ci` → `ng test --no-watch` (vitest) → `ng build --configuration production`. |
| `news-update.yml` | weekly cron + manual + `cad/watchlist.txt` change | runs `cad/news_update.py` with `TAVILY_API_KEY` secret, commits the digest to `cad/intel/`. |
| `hosting-deploy.yml` | manual (`workflow_dispatch`) | builds the web app and deploys to Firebase Hosting **if** `FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT` secrets exist (otherwise warns, never fails). |

> `npm test` needs `--forceExit` (configured in CI) — the suite has a benign teardown handle leak
> that otherwise hangs the runner.

**Secrets** (set with `gh secret set <NAME> --repo Aroxora/provenika`):
`TAVILY_API_KEY` (news), and optionally `FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT` (CI
deploy). The Firebase **web** config in `web/src/app/core/firebase.ts` is a public client
identifier and intentionally in-bundle — that is not a secret.

---

## 8. Quality & verification

- **Tests:** `npm test` (Jest, 469+, framework/CLI) and `cd web && npx ng test --no-watch`
  (vitest — including the `math-models.ts` known-value checks that pin every quantitative
  formula to its cited reference). **Type safety:** `npm run build` / `npx tsc --noEmit`;
  `cd web && npx ng build` for the app.
- **README contract:** `make smoke` (`cicd/check_readme.sh`) runs every headline command the
  README promises against live data, so the docs can't silently drift from the code.
- **Medical-safety guard:** `node cicd/audit_medical_safety.cjs` (in CI) fails the build if any
  tool emits dosing / a treatment recommendation / a diagnosis / a prognosis without a disclaimer.
- **Adversarial review workflows** (run via the Workflow tool during development):
  - *Web app review* — correctness / security / a11y / no-medical-overclaim, each finding refuted
    by a skeptic before it counts.
  - *Formula verification* — every `math-models.ts` function re-checked against its canonical
    reference; flagged errors must survive a refutation pass. **Run this whenever you add or edit
    a formula** — last full pass: 18/18 functions, 0 confirmed errors.
- **Content generation** — the glossary and methods copy in `core/glossary.ts` / `core/methods.ts`
  were produced and adversarially fact-checked by a workflow; regenerate/verify if you edit them.

---

## 9. Deployment

Live: **https://cancer-cure-osint.web.app** (Firebase project `cancer-cure-osint`).

```bash
# one-time
firebase login
firebase use --add            # select cancer-cure-osint → writes .firebaserc

# each release (from repo root)
cd web && npm run build && cd ..
firebase deploy --only hosting --project cancer-cure-osint
```

`firebase.json` (repo root) serves `web/dist/cancer-osint-web/browser` with SPA rewrites and
immutable asset caching. CI deploy: trigger the **Deploy web** Action (needs the two `FIREBASE_*`
secrets).

---

## 10. The non-negotiables

When extending anything:

1. **No medical advice.** Surface data and models; never recommend starting/stopping/substituting
   a therapy. Keep the disclaimers.
2. **Cite every source.** A figure with no traceable public source is a bug.
3. **Verify every formula** against a published reference before shipping.
4. **No leaked secrets.** Public-DB clients need no key; the Tavily key lives only in CI secrets.
5. **Accessibility is a release gate**, not a follow-up.
