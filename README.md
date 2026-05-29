# Oncology CADD & OSINT Framework
> Operational toolkit for computer-aided drug-discovery **triage** on public data: go from a target name to a druggability dossier, a ranked ligand shortlist, a 3-D structure, a docking-ready setup, and a cost-benefit go/no-go — in one command.
**⚠️ Research only.** Generates hypotheses for experimental follow-up; not medical advice, not a treatment recommendation, and a computational hit is not proof of anything.
## Prerequisites
```bash
git clone https://github.com/Aroxora/cancer-cure-agent && cd cancer-cure-agent
npm install && npm run build      # TypeScript tools + CLI
python3 --version                 # 3.10+  (CAD tools are stdlib-only)
pip install rdkit                 # optional: enables similarity search
```
## Run the whole pipeline (one command)
```bash
python3 cad/run_pipeline.py --target EGFR \
    --modality small_molecule --phase phase1 \
    --incidence 60000 --price 150000 --out runs/egfr
```
Produces in `runs/egfr/`:
| Artifact | What it is |
|----------|-----------|
| `dossier.json` | Druggability: UniProt function, # PDB structures, ChEMBL ligand count, known drugs |
| `hits.csv` | Ranked ligand candidates with SMILES + ChEMBL links (feed to docking/ADMET) |
| `structures/` | Best experimental PDB (or AlphaFold model) |
| `cost_benefit.json` | Approval probability, expected cost/time, risk-adjusted return, verdict |
| `SUMMARY.md` | One-page tie-together with the recommended next step |
## Run a single stage
| Stage | Command | Output |
|-------|---------|--------|
| 1 · Target dossier | `python3 cad/target_report.py --target EGFR` | druggability snapshot |
| 2 · Ligand triage | `python3 cad/virtual_triage.py --target EGFR --min-pchembl 8 --out hits.csv` | ranked CSV |
| 3 · Get structure | `python3 cad/fetch_structure.py --target EGFR --out structures/` | PDB/AlphaFold file |
| 4 · Cost-benefit | `python3 cad/cost_benefit.py --modality car_t --phase phase2` | go/no-go report |
| 5 · Dock | `python3 cad/dock.py --receptor structures/<f>.pdb --smiles "<SMILES>" --center X Y Z` | poses + ΔG |
Validated sanity checks: triage puts **Ibrutinib** on top for `BTK` and recovers known EGFR inhibitors for `EGFR`; `fetch_structure --target EGFR` pulls the best-resolution PDB.
### Useful flags
```bash
python3 cad/virtual_triage.py --target BTK --exclude-approved      # novel chemotypes only
python3 cad/virtual_triage.py --target BTK --query "CC(=O)Nc1cccnc1" # 2-D similarity (RDKit)
python3 cad/cost_benefit.py --modality gene_therapy --phase phase3 --incidence 8000 --price 2000000
any-tool --json                                                    # machine-readable output
```
Docking (stage 5) shells out to **AutoDock Vina** + **Open Babel**; if they aren't installed it prints exact install/run steps and never fabricates a score. Full pipeline design & caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.
## OSINT one-liners (pick & justify a target)
```bash
cancer-cli "search literature <topic>"        # PubMed
cancer-cli "find clinical trials <cancer>"     # ClinicalTrials.gov
cancer-cli "analyze gene <symbol>"             # cBioPortal mutations
cancer-cli "find drug targets <gene>"          # targets / ChEMBL
cancer-cli "pathway analysis <gene>"           # KEGG
```
`cancer-cli` = `node dist/bin/cancer-cli.js` (62 tools); `--self-test` checks API connectivity. Sources (all free, no key, queried live): [PubMed](https://www.ncbi.nlm.nih.gov/books/NBK25500/), [ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api), [cBioPortal](https://www.cbioportal.org/api), [ChEMBL](https://www.ebi.ac.uk/chembl/api/data/docs), [KEGG](https://www.kegg.jp/kegg/rest/keggapi.html), [RCSB PDB](https://data.rcsb.org/), [UniProt](https://www.uniprot.org/help/api).
## Auto-updating intelligence
`cad/news_update.py` pulls recent target/modality news (Tavily) into dated digests under `cad/intel/`. Edit the watchlist in `cad/watchlist.txt`.
```bash
export TAVILY_API_KEY=...           # local run; in CI it comes from repo secrets
python3 cad/news_update.py --days 7
```
## CI/CD (GitHub Actions)
| Workflow | Trigger | Does |
|----------|---------|------|
| `.github/workflows/ci.yml` | every push / PR | `npm ci` → build → `tsc --noEmit` → `npm test`; Python compile + CAD smoke tests |
| `.github/workflows/news-update.yml` | weekly + manual + watchlist change | runs the news updater and commits the digest |
`TAVILY_API_KEY` lives **only** in repo Actions secrets (Settings → Secrets → Actions) — never in the repo. Set it once with:
```bash
gh secret set TAVILY_API_KEY --repo Aroxora/cancer-cure-agent   # paste key at the prompt
```
## Docs
- **[`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)** — architecture, how to run/extend the CAD pipeline & web app, add a model/tab/data source, CI/CD, and deploy.
- **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)** — the CADD pipeline stages (implemented vs. documented) and validity caveats.
## Notes
- **Triage ≠ validation.** Scores rank hypotheses; docking/ADMET/wet-lab confirm them.
- **Cite the source.** Every figure points to a public record — verify it there.
- Cost-benefit numbers are rough public benchmarks (BIO/Informa, DiMasi, Wong et al.), not a valuation.
## License
MIT — research and decision-support only; not a substitute for professional medical advice.
---

*Auto-generated 2026-05-29 (62 tools). Framing & disclaimers maintained by hand — see `cicd/generate_readme.py`.*
