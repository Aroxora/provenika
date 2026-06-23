# Provenika — one-command entrypoints. Run `make` (or `make help`) to list targets.
# The CADD pipeline is standard-library only (RDKit optional); these just wrap the
# real commands so a first-time user doesn't have to reverse-engineer them.
#
# Override the target:  make verify TARGET=BRAF   ·   make pipeline TARGET=KRAS

TARGET ?= EGFR
OUT    ?= runs/$(shell printf '%s' "$(TARGET)" | tr '[:upper:]' '[:lower:]')
PY     ?= python3

.DEFAULT_GOAL := help
.PHONY: help setup build verify pipeline example dock-check test readme clean

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'

setup:  ## Install Python deps (RDKit; the pipeline also runs without it)
	$(PY) -m pip install -r requirements.txt

build:  ## Build the Node OSINT tools + cancer-cli (dist/)
	npm install && npm run build

verify:  ## Fetch-and-cite a target's headline figures live  (TARGET=EGFR)
	$(PY) cad/verify.py --target $(TARGET)

pipeline:  ## Run the full pipeline for TARGET into OUT, then re-prove every figure
	$(PY) cad/run_pipeline.py --target $(TARGET) --modality small_molecule --phase phase1 \
		--incidence 60000 --price 150000 --out $(OUT)
	$(PY) cad/verify.py --run $(OUT)

example: pipeline  ## Alias for `pipeline`

dock-check:  ## Report whether AutoDock Vina + Open Babel are installed (for docking)
	$(PY) cad/dock.py --check

test:  ## Run the offline checks CI runs (no network needed)
	$(PY) -m compileall -q cad cicd
	$(PY) cad/test_provenance.py
	$(PY) cad/test_cheminformatics.py
	$(PY) outreach/test_e2e.py
	@mkdir -p /tmp/provenika-test
	$(PY) cad/cost_benefit.py --modality small_molecule --phase phase1 \
		--incidence 60000 --price 150000 --json > /tmp/provenika-test/cost_benefit.json
	$(PY) cad/verify.py --run /tmp/provenika-test --json | $(PY) -c \
		"import sys,json; r=json.load(sys.stdin); assert r['ok'] and r['fail']==0, r; print('verify gate OK')"

readme:  ## Regenerate README.md from cicd/generate_readme.py
	$(PY) cicd/generate_readme.py

clean:  ## Remove generated run outputs and Python caches
	rm -rf runs/* */__pycache__ __pycache__ *.egg-info
