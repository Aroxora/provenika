# Oncology CADD · OSINT — web app

Interactive, single-page Angular app that runs the CADD/OSINT triage **entirely in the
browser** against free public APIs (ChEMBL, UniProt, RCSB PDB, ClinicalTrials.gov — all
CORS-enabled, no key, no backend). It mirrors the `cad/` Python tools:

| Tab | Does | Python equivalent |
|-----|------|-------------------|
| ① Dossier | Druggability snapshot (function, structures, ligand depth, known drugs) | `cad/target_report.py` |
| ② Ligand triage | Rank real ChEMBL ligands by potency + drug-likeness; sort; CSV export | `cad/virtual_triage.py` |
| ③ Structure | Best PDB + embedded RCSB Mol* 3-D viewer | `cad/fetch_structure.py` |
| ④ Cost-benefit | Approval probability, cost/time, risk-adjusted return, verdict | `cad/cost_benefit.py` |
| Trials | Live ClinicalTrials.gov search | — |

Type a target (e.g. `EGFR`, `BTK`, `KRAS G12C`) once; every tab operates on it.

## Develop

```bash
cd web
npm install
npm start            # ng serve → http://localhost:4200
```

## Build

```bash
npm run build        # → dist/cancer-osint-web/browser
```

## Deploy to Firebase Hosting

Hosting config lives at the repo root (`firebase.json`, `.firebaserc`).

```bash
# one-time
npm install -g firebase-tools
firebase login
firebase use --add                       # pick your Firebase project (updates .firebaserc)

# from the repo root:
cd ..
npm --prefix web run build
firebase deploy --only hosting
```

Or via CI: run the **Deploy web (Firebase Hosting)** GitHub Action (manual). It deploys
only when `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT` repo secrets are set.

## Notes

- Research / decision-support only — **not medical advice**. Every figure links to the
  primary public source; computational triage is hypothesis generation, not validation.
- No API keys or secrets are used client-side; all data sources are public and keyless.
