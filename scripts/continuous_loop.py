#!/usr/bin/env python3
"""
Infinite 10-minute improvement loop.

Purpose: Continuously make BOTH the public site (provenika.com) and the
outreach "cloud agent" (run_cycle logic deployable to Lambda / Cloudflare)
as comprehensively useful as possible.

What it does every cycle (~10 minutes):
- Runs the full agent cycle (ingest replies, draft follow-ups, send APPROVED drafts,
  refresh prospects, export public logs). This is the exact logic used by the
  cloud (lambda_handler + scheduled runs).
- Publishes fresh log.json + status.json so the site's /log page (agentic history)
  is always up-to-date and transparent.
- Precomputes cheminformatics data for a broad set of oncology targets so the
  web /explore experience is rich, fast, and demonstrates real value with many
  examples (the browser uses these static files + live fetches).
- Runs provenance verification on key targets (keeps "compute or cite" credible).
- Commits + pushes the generated data so the repo (and future deploys) stay fresh.
- Logs health and cycle results.

This keeps the site data-rich and the agent "alive" even when the real-time
IMAP monitor is not running. The same cycle is what powers the cloud agent.

Run it:
  chmod +x scripts/continuous_loop.py
  nohup python3 scripts/continuous_loop.py >> /tmp/provenika_loop.log 2>&1 &
  # or use tmux / launchd / systemd

Stop: pkill -f continuous_loop.py

It is safe: sending only happens if the Firestore switch (or env) allows it
and drafts are explicitly approved. By default it monitors, drafts, and publishes.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Make imports work when run from anywhere
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "outreach"))
sys.path.insert(0, str(ROOT / "cad"))

import agent as outreach_agent  # type: ignore
import health as outreach_health  # type: ignore

def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    print(f"[{ts}] {msg}", flush=True)

def run_cmd(cmd: list[str], cwd: Path = ROOT, timeout: int = 300) -> bool:
    """Run a command and log success/failure. Never crash the loop."""
    pretty = " ".join(cmd)
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode == 0:
            log(f"✓ {pretty}")
            if result.stdout.strip():
                for line in result.stdout.strip().splitlines()[:3]:
                    log(f"    {line}")
            return True
        else:
            err = (result.stderr or result.stdout or "").strip()[:220]
            log(f"✗ {pretty} (exit {result.returncode}): {err}")
            return False
    except subprocess.TimeoutExpired:
        log(f"✗ {pretty} timed out after {timeout}s")
        return False
    except Exception as e:
        log(f"✗ {pretty} error: {e}")
        return False

def git_commit_and_push(message: str) -> bool:
    """Commit data changes and push (best effort)."""
    try:
        run_cmd(["git", "add", "web/public/data/outreach/", "web/public/data/cheminformatics/"])
        # Only commit if there is actually something to commit
        status = subprocess.run(
            ["git", "status", "--porcelain", "web/public/data/"],
            cwd=ROOT, capture_output=True, text=True
        )
        if not status.stdout.strip():
            log("  (no data changes to commit)")
            return True
        run_cmd(["git", "commit", "-m", message])
        run_cmd(["git", "push", "origin", "HEAD"])
        return True
    except Exception as e:
        log(f"  git commit/push skipped: {e}")
        return False

def precompute_for_web(targets: list[str] | None = None) -> bool:
    """Enrich the web explorer with fresh precomputed RDKit signals for many targets.
    Keep the list reasonable so the 10-min cycle stays fast."""
    if targets is None:
        targets = [
            "EGFR", "BTK", "KRAS G12C", "BRAF", "ALK", "PARP1", "CDK4",
            "JAK2", "RET", "ROS1", "MTOR", "FLT3", "BCL2",
        ]
    cmd = [
        sys.executable,
        str(ROOT / "cad" / "precompute_site_data.py"),
        "--targets", *targets,
        "--limit", "18",
        "--min-pchembl", "6.8",
    ]
    return run_cmd(cmd, timeout=180)

def verify_key_targets() -> None:
    """Keep provenance credible by re-verifying important targets."""
    for target in ["EGFR", "BTK", "KRAS G12C", "BRAF"]:
        run_cmd([sys.executable, str(ROOT / "cad" / "verify.py"), "--target", target, "--json"], timeout=90)

def main(argv: list[str] | None = None) -> None:
    once = "--once" in (argv or sys.argv[1:])
    log("=== Provenika continuous 10-minute loop starting ===")
    log("This process makes the site data-rich and exercises the cloud-agent logic.")
    log(f"Project root: {ROOT}")
    if once:
        log("Running SINGLE CYCLE (--once) then exiting.")
    else:
        log("Press Ctrl-C to stop (or kill the process). Running forever, ~every 10 min.")

    cycle = 0
    while True:
        cycle += 1
        log(f"\n--- Cycle #{cycle} ---")
        t0 = time.time()

        # === CLOUD AGENT (same code path as Lambda / scheduled cloud runs) ===
        log("Advancing outreach cloud agent (run_cycle)...")
        try:
            result = outreach_agent.run_cycle()
            log(f"  cycle result keys: {list(result.keys()) if isinstance(result, dict) else type(result)}")
        except Exception as e:
            log(f"  run_cycle error (non-fatal): {e}")

        # Publish fresh data for the live site (/log page + status)
        log("Publishing agentic history for the site...")
        try:
            pub = outreach_agent.export_public_log()
            log(f"  log published: {pub.get('entries', 0)} entries, generated={pub.get('generated')}")
        except Exception as e:
            log(f"  export_public_log error: {e}")

        try:
            g = outreach_health.gather(deep=False)
            path = outreach_health.write_public(g)
            log(f"  status published: overall={g.get('overall')} -> {path}")
        except Exception as e:
            log(f"  health/status publish error: {e}")

        # === SITE USEFULNESS (make the web explorer + transparency compelling) ===
        log("Enriching site data (precompute + verification)...")
        precompute_for_web()
        verify_key_targets()

        # Optional: broader discovery to generate new science value (commented by default
        # because it can be heavy; enable when you want fresh cad_solutions etc.)
        # run_cmd([sys.executable, str(ROOT / "cicd" / "run_cad_discovery.py"), "--limit", "2"], timeout=400)

        # Persist the improvements
        git_commit_and_push(f"chore(loop): cycle {cycle} — agent run + site data refresh")

        # Quick health for operators
        try:
            g = outreach_health.gather(deep=True)
            sw = g.get("switch", {})
            log(f"  health: {g.get('overall')} | send={sw.get('send_enabled')} autoreply={sw.get('auto_reply_enabled')}")
        except Exception:
            pass

        elapsed = time.time() - t0
        sleep_for = max(30, 600 - elapsed)  # target ~10 minutes between starts
        log(f"Cycle #{cycle} finished in {elapsed:.1f}s. Sleeping {sleep_for:.0f}s...")

        if once:
            log("Single cycle complete (--once). Exiting.")
            break

        time.sleep(sleep_for)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("Loop stopped by user.")
        sys.exit(0)
