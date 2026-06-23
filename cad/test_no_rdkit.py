#!/usr/bin/env python3
"""
Guard the README's headline promise: the cad/ pipeline is STANDARD-LIBRARY ONLY — without
RDKit it still imports and runs (RDKit only unlocks cheminformatics extras). A future
un-guarded `import rdkit` would silently break that claim, so pin it.

Blocks `import rdkit` in child processes and asserts:
  1. every cad/ module imports cleanly without RDKit, and
  2. cheminformatics.py degrades gracefully (exit 3 + an install hint), never crashes.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
BLOCK = "import sys; sys.modules['rdkit'] = None\n"  # makes `import rdkit` raise ImportError
_passed = 0


def ok(name: str) -> None:
    global _passed
    print(f"  ok  {name}")
    _passed += 1


# (1) Every cad module imports cleanly with RDKit unavailable.
mods = [p.stem for p in sorted(HERE.glob("*.py")) if not p.stem.startswith("test_")]
import_script = BLOCK + "import importlib\n" + f"for m in {mods!r}:\n    importlib.import_module(m)\nprint('IMPORT_OK')\n"
res = subprocess.run([sys.executable, "-c", import_script], cwd=HERE, capture_output=True, text=True)
assert res.returncode == 0 and "IMPORT_OK" in res.stdout, (
    f"cad modules failed to import without RDKit (the stdlib-only claim is broken):\n{res.stderr}"
)
ok(f"all {len(mods)} cad modules import without RDKit")

# (2) cheminformatics.py degrades gracefully (exit 3 + install hint), not a crash/traceback.
chem = (HERE / "cheminformatics.py").as_posix()
run_script = BLOCK + (
    "import runpy, sys; sys.argv = ['cheminformatics.py', '--smiles', 'CCO', '--json']; "
    f"runpy.run_path({chem!r}, run_name='__main__')"
)
res = subprocess.run([sys.executable, "-c", run_script], cwd=HERE, capture_output=True, text=True)
assert res.returncode == 3, f"cheminformatics.py without RDKit should exit 3, got {res.returncode}\n{res.stderr}"
assert "rdkit" in (res.stderr + res.stdout).lower(), "expected an 'install rdkit' hint in the output"
ok("cheminformatics.py degrades gracefully without RDKit (exit 3 + install hint)")

print(f"\n{_passed} stdlib-only (no-RDKit) tests passed.")
