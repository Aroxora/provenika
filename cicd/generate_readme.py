#!/usr/bin/env python3
"""
README generator — ENVIRONMENT-LIMITATIONS-only.

By request, README.md lists ONLY the limitations imposed by the execution environment (this
machine, or a cloud host such as AWS / Google Cloud / CI) and exactly what is needed to solve each.
The scientific caveats live in docs/ and in each tool's --help; they are not repeated here.

Edit the LIMITATIONS string below, then run `python3 cicd/generate_readme.py`, and commit both.
Nothing parses the README programmatically (cicd/check_readme.sh keeps its own command list).
"""

from pathlib import Path

ROOT = Path(__file__).parent.parent

LIMITATIONS = r"""# Provenika — Environment limitations & how to solve them

Everything in this repo is implemented and unit-tested. The only things that cannot *run to
completion* are gated on tools or compute absent from the current machine. Each limitation below is
paired with exactly what is needed to solve it — on **this machine**, on **AWS**, on **Google
Cloud**, or in **CI**.

> Research only — not medical advice. (Scientific caveats live in `docs/` and each tool's `--help`.)

## 1. Docking cannot execute here — no AutoDock Vina / Open Babel / `obrms`

**What's blocked.** `cad/dock.py`, the batch-dock stage (`cad/batch_dock.py`, `run_pipeline
--dock-top-n`), and the redocking validation (`cad/validate.py --redock`). The wrappers are gated on
the real binaries and **never fabricate a score**, so they currently SKIP. RDKit + Meeko + pdb2pqr
(the pip half of the prep) ARE installed; only the Vina + Open Babel + `obrms` binaries are missing.

**Solve it — this machine (macOS):** Vina + Open Babel are not reliably pip/brew-installable, so use
conda/micromamba:
```bash
micromamba create -p ./dockenv -c conda-forge vina openbabel
export PATH=$PWD/dockenv/bin:$PATH
pip install -r cad/requirements-docking.txt        # meeko + pdb2pqr
python3 cad/dock.py --check                          # expect: Ready to dock (docking-grade prep)
```

**Solve it — AWS:** a CPU instance (docking is CPU-bound and parallelizes across cores, e.g.
`c7i.4xlarge`) with Miniconda → the same conda + pip install, then `make redock`. Or wrap it as an
**AWS Batch** job for fan-out.

**Solve it — Google Cloud:** a Compute Engine `c3-highcpu` VM (or **Cloud Batch**) with the identical
setup; `make redock`.

**Solve it — CI:** add a `mamba-org/setup-micromamba` step installing `vina openbabel`, then run
`python3 cad/validate.py --redock cad/validation_benchmark.json` (3-complex smoke). Gate the full
benchmark behind `workflow_dispatch` (~20 min).

## 2. The benchmark-scale redocking number can't be regenerated here

**What's blocked.** Reproducing the committed redocking result
(`examples/validation-redock/batch_results.json`, 39 complexes) needs §1's stack.

**Solve it.** On any host from §1: `python3 examples/validation-redock/batch_redock.py` (runs in
parallel, ~20 min), then commit the regenerated `batch_results.json`. `python3 cad/validate.py
--recheck <file>` re-derives the summary **offline**, so the committed number stays auditable
anywhere.

## 3. Throughput is bounded by public-API latency + local core count

**What's slow.** The cheminformatics precompute (38 targets), the per-hit selectivity probe, and
large enrichment/benchmark sweeps are bounded by ChEMBL round-trips and this machine's cores — fine
for a few targets, slow at scale.

**Solve it.** Run on a higher-core AWS/GCP instance (more parallel docks/requests), or an **AWS
Batch / GCP Cloud Batch / Cloud Run** job for fan-out, and cache ChEMBL responses. No code change
needed — `--no-selectivity` and `--scan` already bound the work.

## 4. Outbound network access to the public databases is required

**What's needed.** Outbound HTTPS to **ChEMBL** (`ebi.ac.uk`), **UniProt** (`rest.uniprot.org`),
**RCSB PDB** (`rcsb.org`), and **AlphaFold** (`alphafold.ebi.ac.uk`). Present on this machine; a
locked-down cloud host or CI runner must allow egress to those domains (or proxy them) — otherwise
the pipeline degrades to a clearly-marked partial dossier rather than failing silently.

---

Developed by **[ErosolarAI](https://erosolarai.com)**. MIT — research and decision-support only; not
a substitute for professional medical advice.
"""


def main():
    (ROOT / "README.md").write_text(LIMITATIONS)
    print("  README.md updated (environment-limitations-only)")


if __name__ == "__main__":
    main()
