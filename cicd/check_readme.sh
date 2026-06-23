#!/usr/bin/env bash
# README contract check — runs the headline commands the README/docs promise and fails
# if any breaks. Run it after changing tools, the CLI, or the pipeline so the README never
# drifts from reality. Needs the network (live data sources) and a prior `npm run build`.
#
#   make smoke      # or:  bash cicd/check_readme.sh
#
# Keep the command list below in sync with README.md (generated from cicd/generate_readme.py).
set -u
cd "$(dirname "$0")/.."
unset DEEPSEEK_API_KEY
pass=0; fail=0; failed=""

chk() { # chk <exit-code> <label>
  if [ "$1" = "0" ]; then pass=$((pass + 1)); echo "  ok   $2";
  else fail=$((fail + 1)); failed="${failed}
  FAIL $2 (exit $1)"; echo "  FAIL $2 (exit $1)"; fi
}
# A keyless OSINT one-liner "works" if it prints results without an error/undefined.
chk_cli() {
  local out; out="$(node dist/bin/cancer-cli.js "$1" 2>&1)"
  if echo "$out" | grep -qiE "missing required|error:|undefined|cannot read|TypeError"; then chk 1 "cancer-cli \"$1\""; else chk 0 "cancer-cli \"$1\""; fi
}

if [ ! -f dist/bin/cancer-cli.js ]; then echo "dist/ missing — run 'npm run build' first." >&2; exit 2; fi

echo "Prove-it / pipeline (live public data):"
python3 cad/verify.py --target EGFR >/dev/null 2>&1; chk $? "cad/verify.py --target EGFR"
python3 cad/run_pipeline.py --target BRAF --out /tmp/readme-smoke-braf >/dev/null 2>&1; chk $? "cad/run_pipeline.py --target BRAF"
python3 cad/verify.py --run /tmp/readme-smoke-braf >/dev/null 2>&1; chk $? "cad/verify.py --run <dir>"
python3 cad/run_pipeline.py --target NOTAREALGENE --out /tmp/readme-smoke-x >/dev/null 2>&1; [ $? -ne 0 ] && chk 0 "unresolved target exits non-zero" || chk 1 "unresolved target should fail"

echo "make targets + dock preflight:"
make test >/dev/null 2>&1; chk $? "make test"
python3 cad/dock.py --check >/dev/null 2>&1; [ $? -eq 3 ] || [ $? -eq 0 ] && chk 0 "cad/dock.py --check" || chk 1 "cad/dock.py --check"

echo "Keyless OSINT one-liners:"
node dist/bin/cancer-cli.js --self-test >/dev/null 2>&1; chk $? "cancer-cli --self-test"
chk_cli "search literature EGFR"
chk_cli "find clinical trials melanoma"
chk_cli "analyze gene TP53"
chk_cli "pathway analysis BRAF"
chk_cli "find drug targets EGFR"
chk_cli "find targets for disease melanoma"

echo ""
echo "README contract: $pass passed, $fail failed."
if [ "$fail" -gt 0 ]; then printf 'Broken (update the code or the README):%s\n' "$failed"; exit 1; fi
echo "✅ Every headline command the README promises still works."
