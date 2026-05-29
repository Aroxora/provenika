#!/usr/bin/env python3
"""
README generator — operational focus.

Emits a README that is purely about OPERATING the framework: what you install,
what you run, what artifacts come out, and how CI keeps it current. No philosophy,
no reference-data dumps (query those through the tools).

Design rules (read before editing):
  * Research / decision-support tool. NOT a treatment recommender. Never tell
    anyone to start/stop/substitute a therapy; no discovery/cure claims.
  * Every line should be a real, runnable command or a verifiable fact.
"""

import subprocess
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent

DATA_SOURCES = [
    ("PubMed", "Literature", "https://www.ncbi.nlm.nih.gov/books/NBK25500/"),
    ("ClinicalTrials.gov", "Trials", "https://clinicaltrials.gov/data-api/api"),
    ("cBioPortal", "Cancer genomics", "https://www.cbioportal.org/api"),
    ("ChEMBL", "Bioactivity & drug properties", "https://www.ebi.ac.uk/chembl/api/data/docs"),
    ("KEGG", "Pathways", "https://www.kegg.jp/kegg/rest/keggapi.html"),
    ("RCSB PDB", "3-D structures", "https://data.rcsb.org/"),
    ("UniProt", "Protein function/features", "https://www.uniprot.org/help/api"),
]


def get_tool_data():
    script = """
    const { createCancerTools } = require('./dist/tools/cancer/index.js');
    console.log(JSON.stringify({ toolCount: createCancerTools().length }));
    """
    result = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        return {"toolCount": 0}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"toolCount": 0}


def generate_readme(data):
    tool_count = data.get('toolCount', 0)
    r = []
    a = r.append

    a("# Oncology CADD & OSINT Framework\n")
    a("> Operational toolkit for computer-aided drug-discovery **triage** on public data: "
      "go from a target name to a druggability dossier, a ranked ligand shortlist, a 3-D "
      "structure, a docking-ready setup, and a cost-benefit go/no-go — in one command.\n")

    a("**⚠️ Research only.** Generates hypotheses for experimental follow-up; not medical "
      "advice, not a treatment recommendation, and a computational hit is not proof of anything.\n")

    a("## Prerequisites\n")
    a("```bash\n"
      "git clone https://github.com/Aroxora/cancer-cure-agent && cd cancer-cure-agent\n"
      "npm install && npm run build      # TypeScript tools + CLI\n"
      "python3 --version                 # 3.10+  (CAD tools are stdlib-only)\n"
      "pip install rdkit                 # optional: enables similarity search\n"
      "```\n")

    a("## Run the whole pipeline (one command)\n")
    a("```bash\n"
      "python3 cad/run_pipeline.py --target EGFR \\\n"
      "    --modality small_molecule --phase phase1 \\\n"
      "    --incidence 60000 --price 150000 --out runs/egfr\n"
      "```\n")
    a("Produces in `runs/egfr/`:\n")
    a("| Artifact | What it is |\n"
      "|----------|-----------|\n"
      "| `dossier.json` | Druggability: UniProt function, # PDB structures, ChEMBL ligand count, known drugs |\n"
      "| `hits.csv` | Ranked ligand candidates with SMILES + ChEMBL links (feed to docking/ADMET) |\n"
      "| `structures/` | Best experimental PDB (or AlphaFold model) |\n"
      "| `cost_benefit.json` | Approval probability, expected cost/time, risk-adjusted return, verdict |\n"
      "| `SUMMARY.md` | One-page tie-together with the recommended next step |\n")

    a("## Run a single stage\n")
    a("| Stage | Command | Output |\n"
      "|-------|---------|--------|\n"
      "| 1 · Target dossier | `python3 cad/target_report.py --target EGFR` | druggability snapshot |\n"
      "| 2 · Ligand triage | `python3 cad/virtual_triage.py --target EGFR --min-pchembl 8 --out hits.csv` | ranked CSV |\n"
      "| 3 · Get structure | `python3 cad/fetch_structure.py --target EGFR --out structures/` | PDB/AlphaFold file |\n"
      "| 4 · Cost-benefit | `python3 cad/cost_benefit.py --modality car_t --phase phase2` | go/no-go report |\n"
      "| 5 · Dock | `python3 cad/dock.py --receptor structures/<f>.pdb --smiles \"<SMILES>\" --center X Y Z` | poses + ΔG |\n")
    a("Validated sanity checks: triage puts **Ibrutinib** on top for `BTK` and recovers known "
      "EGFR inhibitors for `EGFR`; `fetch_structure --target EGFR` pulls the best-resolution PDB.\n")

    a("### Useful flags\n")
    a("```bash\n"
      "python3 cad/virtual_triage.py --target BTK --exclude-approved      # novel chemotypes only\n"
      "python3 cad/virtual_triage.py --target BTK --query \"CC(=O)Nc1cccnc1\" # 2-D similarity (RDKit)\n"
      "python3 cad/cost_benefit.py --modality gene_therapy --phase phase3 --incidence 8000 --price 2000000\n"
      "any-tool --json                                                    # machine-readable output\n"
      "```\n")
    a("Docking (stage 5) shells out to **AutoDock Vina** + **Open Babel**; if they aren't "
      "installed it prints exact install/run steps and never fabricates a score. Full pipeline "
      "design & caveats: **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)**.\n")

    a("## OSINT one-liners (pick & justify a target)\n")
    a("```bash\n"
      "cancer-cli \"search literature <topic>\"        # PubMed\n"
      "cancer-cli \"find clinical trials <cancer>\"     # ClinicalTrials.gov\n"
      "cancer-cli \"analyze gene <symbol>\"             # cBioPortal mutations\n"
      "cancer-cli \"find drug targets <gene>\"          # targets / ChEMBL\n"
      "cancer-cli \"pathway analysis <gene>\"           # KEGG\n"
      "```\n"
      f"`cancer-cli` = `node dist/bin/cancer-cli.js` ({tool_count} tools); `--self-test` checks "
      "API connectivity. Sources (all free, no key, queried live): "
      + ", ".join(f"[{n}]({u})" for n, _, u in DATA_SOURCES) + ".\n")

    a("## Auto-updating intelligence\n")
    a("`cad/news_update.py` pulls recent target/modality news (Tavily) into dated digests under "
      "`cad/intel/`. Edit the watchlist in `cad/watchlist.txt`.\n")
    a("```bash\n"
      "export TAVILY_API_KEY=...           # local run; in CI it comes from repo secrets\n"
      "python3 cad/news_update.py --days 7\n"
      "```\n")

    a("## CI/CD (GitHub Actions)\n")
    a("| Workflow | Trigger | Does |\n"
      "|----------|---------|------|\n"
      "| `.github/workflows/ci.yml` | every push / PR | `npm ci` → build → `tsc --noEmit` → `npm test`; Python compile + CAD smoke tests |\n"
      "| `.github/workflows/news-update.yml` | weekly + manual + watchlist change | runs the news updater and commits the digest |\n")
    a("`TAVILY_API_KEY` lives **only** in repo Actions secrets (Settings → Secrets → Actions) — "
      "never in the repo. Set it once with:\n")
    a("```bash\n"
      "gh secret set TAVILY_API_KEY --repo Aroxora/cancer-cure-agent   # paste key at the prompt\n"
      "```\n")

    a("## Docs\n")
    a("- **[`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)** — architecture, how to run/extend "
      "the CAD pipeline & web app, add a model/tab/data source, CI/CD, and deploy.\n"
      "- **[`docs/REAL-CAD-ROADMAP.md`](docs/REAL-CAD-ROADMAP.md)** — the CADD pipeline stages "
      "(implemented vs. documented) and validity caveats.\n")

    a("## Notes\n")
    a("- **Triage ≠ validation.** Scores rank hypotheses; docking/ADMET/wet-lab confirm them.\n"
      "- **Cite the source.** Every figure points to a public record — verify it there.\n"
      "- Cost-benefit numbers are rough public benchmarks (BIO/Informa, DiMasi, Wong et al.), "
      "not a valuation.\n")

    a("## License\n")
    a("MIT — research and decision-support only; not a substitute for professional medical advice.\n")

    a(f"---\n\n*Auto-generated {datetime.now().strftime('%Y-%m-%d')} ({tool_count} tools). "
      f"Framing & disclaimers maintained by hand — see `cicd/generate_readme.py`.*\n")

    return "".join(r)


def main():
    print("  Generating operational README...")
    data = get_tool_data()
    (ROOT / "README.md").write_text(generate_readme(data))
    print(f"  README.md updated ({data.get('toolCount', 0)} tools)")
    return True


if __name__ == "__main__":
    main()
