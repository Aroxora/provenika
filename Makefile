# Provenika — one-command entrypoints. Run `make` (or `make help`) to list targets.
# The CADD pipeline is standard-library only (RDKit optional); these just wrap the
# real commands so a first-time user doesn't have to reverse-engineer them.
#
# Override the target:  make verify TARGET=BRAF   ·   make pipeline TARGET=KRAS

TARGET ?= EGFR
OUT    ?= runs/$(shell printf '%s' "$(TARGET)" | tr '[:upper:]' '[:lower:]')
PY     ?= python3

.DEFAULT_GOAL := help
.PHONY: help setup setup-docking build verify pipeline example panel dock-check redock redock-starter test smoke readme clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'

setup:  ## Install Python deps (RDKit; the pipeline also runs without it)
	$(PY) -m pip install -r requirements.txt

setup-docking:  ## Install docking-grade ligand/receptor prep (Meeko + pdb2pqr → the validated ~1.4A path)
	$(PY) -m pip install -r cad/requirements-docking.txt
	@echo "Now install the Vina + Open Babel BINARIES (not pip): conda install -c conda-forge vina openbabel"
	@echo "Then confirm the full stack: make dock-check"

build:  ## Build the Node OSINT tools + cancer-cli (dist/)
	npm install && npm run build

verify:  ## Fetch-and-cite a target's headline figures live  (TARGET=EGFR)
	$(PY) cad/verify.py --target $(TARGET)

pipeline:  ## Run the full pipeline for TARGET into OUT, then re-prove every figure
	$(PY) cad/run_pipeline.py --target $(TARGET) --modality small_molecule --phase phase1 \
		--incidence 60000 --price 150000 --out $(OUT)
	$(PY) cad/verify.py --run $(OUT)

example: pipeline  ## Alias for `pipeline`

panel:  ## Rank an oncogene panel by Open Targets cancer genetic support (live → examples/target-panel/)
	$(PY) cad/target_panel.py --out examples/target-panel

dock-check:  ## Report the full docking stack (Vina + Open Babel + Meeko + pdb2pqr)
	$(PY) cad/dock.py --check

redock:  ## Reproduce the benchmark-scale redocking validation (needs the docking stack; ~20 min)
	$(PY) examples/validation-redock/batch_redock.py

redock-starter:  ## Quick 3-complex redocking smoke test (needs Vina + Open Babel)
	$(PY) cad/validate.py --redock cad/validation_benchmark.json --json

test:  ## Run the offline checks CI runs (no network needed)
	$(PY) -m compileall -q cad cicd
	$(PY) cad/test_provenance.py
	$(PY) cad/test_verify_manifest.py
	$(PY) cad/test_verify_hits.py
	$(PY) cad/test_mutations.py
	$(PY) cad/test_triage_filters.py
	$(PY) cad/test_validate.py
	$(PY) cad/test_batch_dock.py
	$(PY) cad/test_dock_meeko.py
	$(PY) cad/test_explain.py
	$(PY) cad/test_news_update.py
	$(PY) cad/test_validation_package.py
	$(PY) cad/test_target_evidence.py
	$(PY) cad/test_target_panel.py
	$(PY) cad/test_cheminformatics.py
	$(PY) cad/test_no_rdkit.py
	$(PY) cad/test_degradation.py
	$(PY) cad/test_precompute_index.py
	$(PY) cad/test_resolve_target.py
	$(PY) cad/test_target_report.py
	$(PY) cad/test_binding_site.py
	$(PY) cad/test_fetch_structure.py
	$(PY) cad/test_dock.py
	$(PY) cad/validate.py --self-test
	$(PY) outreach/test_e2e.py
	@mkdir -p /tmp/provenika-test
	$(PY) cad/cost_benefit.py --modality small_molecule --phase phase1 \
		--incidence 60000 --price 150000 --json > /tmp/provenika-test/cost_benefit.json
	$(PY) cad/verify.py --run /tmp/provenika-test --json | $(PY) -c \
		"import sys,json; r=json.load(sys.stdin); assert r['ok'] and r['fail']==0, r; print('verify gate OK')"

smoke:  ## Run every headline command the README promises (live; needs build + network)
	bash cicd/check_readme.sh

readme:  ## Regenerate README.md from cicd/generate_readme.py
	$(PY) cicd/generate_readme.py

clean:  ## Remove generated run outputs and Python caches
	rm -rf runs/* */__pycache__ __pycache__ *.egg-info
