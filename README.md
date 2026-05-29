# Oncology CADD & OSINT Framework
> **Run real computer-aided drug discovery on public data.** Resolve a target, pull its experimentally measured ligands from ChEMBL, score them for potency and drug-likeness, and (next) dock against PDB/AlphaFold structures — backed by live OSINT across PubMed, ClinicalTrials.gov, cBioPortal, KEGG, PDB and UniProt.
## ⚠️ Not medical advice
Research only. This software generates **hypotheses for experimental follow-up**; it does **not** recommend, start, stop, or substitute any treatment, and a computational hit is **not** proof a molecule is safe or effective. Treatment decisions belong to a qualified clinician.
---
## The actionable core: a real, runnable workflow
Two stdlib-only Python tools take you from a target name to a ranked, exportable candidate list using real public experimental data (RDKit optional for similarity).
```bash
npm install && npm run build                      # one-time

# 1) Is this target worth pursuing?  (UniProt + ChEMBL + PDB dossier)
python3 cad/target_report.py --target EGFR

# 2) Rank its real ligands, export a CSV you can act on
python3 cad/virtual_triage.py --target EGFR --min-pchembl 8 --out egfr_hits.csv
```
**Step 1 — target dossier** answers druggability before you invest:
```text
=== Target dossier: Epidermal growth factor receptor [CHEMBL203] ===
UniProt P00533 — Epidermal growth factor receptor (1210 aa)
  Experimental PDB structures: 351 (docking feasible: yes)
ChEMBL tractability:
  Potent measured activities on record: 21,342
  Known drugs/modulators with a defined mechanism: 49
Read-out: rich ligand data; structure available for docking; 49 known modulator(s).
```
**Step 2 — ligand triage** resolves the ChEMBL target, pulls its most potent measured ligands (IC50/Ki/Kd → pChEMBL), joins drug-likeness properties (Lipinski Ro5, QED), and ranks them. Sanity check: `BTK` puts **Ibrutinib** on top, `EGFR` recovers known EGFR inhibitors — it surfaces real drugs.
```text
 #  ChEMBL ID      pChEMBL   QED Ro5    DL  Score  Phase            Name
 1  CHEMBL29197      10.60  0.76   0  0.86  0.921  research/preclinical
 7  CHEMBL7917        9.51  0.79   0  0.87  0.868  research/preclinical TYRPHOSTIN AG-1478
```
The CSV carries SMILES + ChEMBL links per hit — ready to feed docking/ADMET. Useful flags:
```bash
python3 cad/virtual_triage.py --target BTK --exclude-approved   # surface NOVEL chemotypes only
python3 cad/virtual_triage.py --target BTK --query "CC(=O)Nc1cccnc1"  # ECFP4 similarity (RDKit)
python3 cad/virtual_triage.py --target "KRAS G12C" --json       # machine-readable
```
`pChEMBL = -log10(molar potency)`: 6≈1µM, 8≈10nM, 9≈1nM. `DL` blends QED with Lipinski Ro5. Phase = ChEMBL development phase (approved ↔ research). Scores rank **hypotheses**, not efficacy.
## The real-CADD pipeline
| Stage | Open tooling | Status |
|-------|-------------|--------|
| 1. Target dossier (druggability, structures, known drugs) | UniProt + ChEMBL + PDB | **implemented — `cad/target_report.py`** |
| 2. Ligand-based virtual triage (rank + CSV export) | ChEMBL REST + RDKit | **implemented — `cad/virtual_triage.py`** |
| 3. Structure acquisition | RCSB PDB, AlphaFold DB | PDB client ready |
| 4. Binding-site detection | fpocket / P2Rank | documented |
| 5. Structure-based docking (pose + ΔG) | AutoDock Vina + Meeko | documented |
| 6. ADMET / liability flags | RDKit filters, ADMET-AI | documented |
Full design, commands, and validity caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.
## Supporting OSINT (feeds stage 1)
The CLI turns each public database into a one-line query — use these to pick and justify a target before triaging it:
| Goal | Command |
|------|---------|
| Evidence from the literature | `cancer-cli "search literature <topic>"` |
| Trials for an indication | `cancer-cli "find clinical trials <cancer>"` |
| Gene / mutation frequency | `cancer-cli "analyze gene <symbol>"` |
| Druggable targets for a gene | `cancer-cli "find drug targets <gene>"` |
| Pathway involvement | `cancer-cli "pathway analysis <gene>"` |
`cancer-cli` = `node dist/bin/cancer-cli.js` (or `npm run cli`); `--self-test` checks API connectivity, `-q` runs a single query, `/agents` lists the research agents.
| Source | Content |
|--------|---------|
| [PubMed (NCBI E-utilities)](https://www.ncbi.nlm.nih.gov/books/NBK25500/) | Biomedical literature |
| [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/api) | Interventional & observational trials |
| [cBioPortal](https://www.cbioportal.org/api) | Cancer genomics & mutation frequencies |
| [ChEMBL (EBI)](https://www.ebi.ac.uk/chembl/api/data/docs) | Bioactivity (IC50/Ki/Kd), mechanism, drug properties |
| [KEGG](https://www.kegg.jp/kegg/rest/keggapi.html) | Pathways & molecular interaction maps |
| [RCSB PDB](https://data.rcsb.org/) | Experimental 3-D macromolecular structures |
| [UniProt](https://www.uniprot.org/help/api) | Protein sequence, function & features |

All sources are free, public, and queried live — no key needed for the core databases, no proprietary or patient data.
## Agents & tools (62 tools)
| Agent | Focus |
|-------|-------|
| `LiteratureAgent` | PubMed retrieval & evidence synthesis |
| `ClinicalTrialAgent` | Trial matching & eligibility analysis |
| `GenomicsAgent` | Mutation analysis & gene expression |
| `DrugDiscoveryAgent` | Drug–target interactions & screening |
| `PathwayAnalysisAgent` | Signaling pathways & network analysis |
| `PatientAnalysisAgent` | Biomarker & stratification context |

62 typed tools back the agents (`src/tools/`). A `discovery/` module also ships curated **reference datasets** (FDA-approved oral targeted therapies, CAR-T products, oral oncology pipeline, unmet-need landscape) — query them through the tools rather than reading tables here. "CAD" in that module means **Candidate Aggregation & Documentation** (organising the public record), distinct from the real drug-*design* work in `cad/`.
## Optional API keys
```bash
export NCBI_API_KEY="..."      # higher PubMed/E-utilities rate limits (free)
export TAVILY_API_KEY="..."    # live web/literature search tools
```
**Never commit keys.** Set via `--key`, the `/secrets` command, or the environment.
## Notes
- **Cite the source.** Every figure points to a public record — verify it there.
- **Triage ≠ validation.** Computational scores need docking, ADMET, and wet-lab follow-up.
- **Snapshots drift.** Curated reference fields (approval, trial phase) may be stale.
## License
MIT. For research and decision-support only — not a substitute for professional medical advice, diagnosis, or treatment.
---

*Auto-generated 2026-05-29 (62 tools). Framing & disclaimers maintained by hand — see `cicd/generate_readme.py`.*
