#!/usr/bin/env python3
"""
README generator for the Oncology OSINT & Analysis Framework.

Produces an ACTIONABLE, command-focused README from the compiled framework:
quick start, "do this → run this" commands, CLI vocabulary, and the real
cheminformatics tool. Reference-data dumps are intentionally left out — they are
queryable through the tools, not pasted into the README.

Design rules (read before editing):
  * Research / decision-support tool. NOT a treatment recommender. The README
    must never tell anyone to start, stop, or substitute a therapy.
  * Everything shown must be a real, runnable command or a cited public source.
    No discovery/cure claims.
"""

import subprocess
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent


# Public, free OSINT / bioinformatics data sources wired into the framework.
# Keep this in sync with src/datasources/*.
DATA_SOURCES = [
    ("PubMed (NCBI E-utilities)", "Biomedical literature", "https://www.ncbi.nlm.nih.gov/books/NBK25500/"),
    ("ClinicalTrials.gov API v2", "Interventional & observational trials", "https://clinicaltrials.gov/data-api/api"),
    ("cBioPortal", "Cancer genomics & mutation frequencies", "https://www.cbioportal.org/api"),
    ("ChEMBL (EBI)", "Bioactivity (IC50/Ki/Kd), mechanism, drug properties", "https://www.ebi.ac.uk/chembl/api/data/docs"),
    ("KEGG", "Pathways & molecular interaction maps", "https://www.kegg.jp/kegg/rest/keggapi.html"),
    ("RCSB PDB", "Experimental 3-D macromolecular structures", "https://data.rcsb.org/"),
    ("UniProt", "Protein sequence, function & features", "https://www.uniprot.org/help/api"),
]

# Research agents exposed by the CLI (see `cancer-cli --help`).
AGENTS = [
    ("LiteratureAgent", "PubMed retrieval & evidence synthesis"),
    ("ClinicalTrialAgent", "Trial matching & eligibility analysis"),
    ("GenomicsAgent", "Mutation analysis & gene expression"),
    ("DrugDiscoveryAgent", "Drug–target interactions & screening"),
    ("PathwayAnalysisAgent", "Signaling pathways & network analysis"),
    ("PatientAnalysisAgent", "Biomarker & stratification context"),
]


def get_tool_data():
    """Extract the tool count/names from the compiled JavaScript."""
    script = """
    const { createCancerTools } = require('./dist/tools/cancer/index.js');
    const tools = createCancerTools();
    console.log(JSON.stringify({ toolCount: tools.length, toolNames: tools.map(t => t.name) }));
    """
    result = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return None
    return json.loads(result.stdout)


def generate_readme(data):
    """Generate actionable, real-CADD-focused README content."""
    tool_count = data.get('toolCount', 0)

    r = []
    a = r.append

    a("# Oncology CADD & OSINT Framework\n")
    a("> **Run real computer-aided drug discovery on public data.** Resolve a target, pull its "
      "experimentally measured ligands from ChEMBL, score them for potency and drug-likeness, and "
      "(next) dock against PDB/AlphaFold structures — backed by live OSINT across PubMed, "
      "ClinicalTrials.gov, cBioPortal, KEGG, PDB and UniProt.\n")

    a("## ⚠️ Not medical advice\n")
    a("Research only. This software generates **hypotheses for experimental follow-up**; it does "
      "**not** recommend, start, stop, or substitute any treatment, and a computational hit is "
      "**not** proof a molecule is safe or effective. Treatment decisions belong to a qualified "
      "clinician.\n")

    a("---\n")

    a("## The actionable core: a real, runnable workflow\n")
    a("Two stdlib-only Python tools take you from a target name to a ranked, exportable "
      "candidate list using real public experimental data (RDKit optional for similarity).\n")
    a("```bash\n"
      "npm install && npm run build                      # one-time\n\n"
      "# 1) Is this target worth pursuing?  (UniProt + ChEMBL + PDB dossier)\n"
      "python3 cad/target_report.py --target EGFR\n\n"
      "# 2) Rank its real ligands, export a CSV you can act on\n"
      "python3 cad/virtual_triage.py --target EGFR --min-pchembl 8 --out egfr_hits.csv\n"
      "```\n")

    a("**Step 1 — target dossier** answers druggability before you invest:\n")
    a("```text\n"
      "=== Target dossier: Epidermal growth factor receptor [CHEMBL203] ===\n"
      "UniProt P00533 — Epidermal growth factor receptor (1210 aa)\n"
      "  Experimental PDB structures: 351 (docking feasible: yes)\n"
      "ChEMBL tractability:\n"
      "  Potent measured activities on record: 21,342\n"
      "  Known drugs/modulators with a defined mechanism: 49\n"
      "Read-out: rich ligand data; structure available for docking; 49 known modulator(s).\n"
      "```\n")

    a("**Step 2 — ligand triage** resolves the ChEMBL target, pulls its most potent measured "
      "ligands (IC50/Ki/Kd → pChEMBL), joins drug-likeness properties (Lipinski Ro5, QED), and "
      "ranks them. Sanity check: `BTK` puts **Ibrutinib** on top, `EGFR` recovers known EGFR "
      "inhibitors — it surfaces real drugs.\n")
    a("```text\n"
      " #  ChEMBL ID      pChEMBL   QED Ro5    DL  Score  Phase            Name\n"
      " 1  CHEMBL29197      10.60  0.76   0  0.86  0.921  research/preclinical\n"
      " 7  CHEMBL7917        9.51  0.79   0  0.87  0.868  research/preclinical TYRPHOSTIN AG-1478\n"
      "```\n")
    a("The CSV carries SMILES + ChEMBL links per hit — ready to feed docking/ADMET. Useful flags:\n")
    a("```bash\n"
      "python3 cad/virtual_triage.py --target BTK --exclude-approved   # surface NOVEL chemotypes only\n"
      "python3 cad/virtual_triage.py --target BTK --query \"CC(=O)Nc1cccnc1\"  # ECFP4 similarity (RDKit)\n"
      "python3 cad/virtual_triage.py --target \"KRAS G12C\" --json       # machine-readable\n"
      "```\n")
    a("`pChEMBL = -log10(molar potency)`: 6≈1µM, 8≈10nM, 9≈1nM. `DL` blends QED with Lipinski Ro5. "
      "Phase = ChEMBL development phase (approved ↔ research). Scores rank **hypotheses**, not "
      "efficacy.\n")

    a("## The real-CADD pipeline\n")
    a("| Stage | Open tooling | Status |\n"
      "|-------|-------------|--------|\n"
      "| 1. Target dossier (druggability, structures, known drugs) | UniProt + ChEMBL + PDB | **implemented — `cad/target_report.py`** |\n"
      "| 2. Ligand-based virtual triage (rank + CSV export) | ChEMBL REST + RDKit | **implemented — `cad/virtual_triage.py`** |\n"
      "| 3. Structure acquisition | RCSB PDB, AlphaFold DB | PDB client ready |\n"
      "| 4. Binding-site detection | fpocket / P2Rank | documented |\n"
      "| 5. Structure-based docking (pose + ΔG) | AutoDock Vina + Meeko | documented |\n"
      "| 6. ADMET / liability flags | RDKit filters, ADMET-AI | documented |\n")
    a("Full design, commands, and validity caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.\n")

    a("## Supporting OSINT (feeds stage 1)\n")
    a("The CLI turns each public database into a one-line query — use these to pick and justify a "
      "target before triaging it:\n")
    a("| Goal | Command |\n"
      "|------|---------|\n"
      "| Evidence from the literature | `cancer-cli \"search literature <topic>\"` |\n"
      "| Trials for an indication | `cancer-cli \"find clinical trials <cancer>\"` |\n"
      "| Gene / mutation frequency | `cancer-cli \"analyze gene <symbol>\"` |\n"
      "| Druggable targets for a gene | `cancer-cli \"find drug targets <gene>\"` |\n"
      "| Pathway involvement | `cancer-cli \"pathway analysis <gene>\"` |\n")
    a("`cancer-cli` = `node dist/bin/cancer-cli.js` (or `npm run cli`); `--self-test` checks API "
      "connectivity, `-q` runs a single query, `/agents` lists the research agents.\n")

    a("| Source | Content |\n|--------|---------|\n")
    for name, content, url in DATA_SOURCES:
        a(f"| [{name}]({url}) | {content} |\n")
    a("\nAll sources are free, public, and queried live — no key needed for the core databases, "
      "no proprietary or patient data.\n")

    a(f"## Agents & tools ({tool_count} tools)\n")
    a("| Agent | Focus |\n|-------|-------|\n")
    for name, focus in AGENTS:
        a(f"| `{name}` | {focus} |\n")
    a(f"\n{tool_count} typed tools back the agents (`src/tools/`). A `discovery/` module also ships "
      "curated **reference datasets** (FDA-approved oral targeted therapies, CAR-T products, oral "
      "oncology pipeline, unmet-need landscape) — query them through the tools rather than reading "
      "tables here. \"CAD\" in that module means **Candidate Aggregation & Documentation** (organising "
      "the public record), distinct from the real drug-*design* work in `cad/`.\n")

    a("## Optional API keys\n")
    a("```bash\n"
      "export NCBI_API_KEY=\"...\"      # higher PubMed/E-utilities rate limits (free)\n"
      "export TAVILY_API_KEY=\"...\"    # live web/literature search tools\n"
      "```\n"
      "**Never commit keys.** Set via `--key`, the `/secrets` command, or the environment.\n")

    a("## Notes\n")
    a("- **Cite the source.** Every figure points to a public record — verify it there.\n"
      "- **Triage ≠ validation.** Computational scores need docking, ADMET, and wet-lab follow-up.\n"
      "- **Snapshots drift.** Curated reference fields (approval, trial phase) may be stale.\n")

    a("## License\n")
    a("MIT. For research and decision-support only — not a substitute for professional medical "
      "advice, diagnosis, or treatment.\n")

    a(f"---\n\n*Auto-generated {datetime.now().strftime('%Y-%m-%d')} "
      f"({tool_count} tools). Framing & disclaimers maintained by hand — see "
      f"`cicd/generate_readme.py`.*\n")

    return "".join(r)


def main():
    print("  Generating actionable README...")
    data = get_tool_data()
    if not data:
        print("  Failed to extract tool data (did you run `npm run build`?)")
        return False
    (ROOT / "README.md").write_text(generate_readme(data))
    print(f"  README.md updated ({data['toolCount']} tools)")
    return True


if __name__ == "__main__":
    main()
