#!/usr/bin/env python3
"""
Local CI/CD Runner for Cancer Core Agentic Framework

Auto-runs on every commit via git hooks. No GitHub Actions needed.
"""

import subprocess
import sys
import json
import os
import time
from pathlib import Path
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum

class Status(Enum):
    PENDING = "⏳"
    RUNNING = "🔄"
    PASSED = "✅"
    FAILED = "❌"
    SKIPPED = "⏭️"

@dataclass
class Step:
    name: str
    command: str
    status: Status = Status.PENDING
    duration: float = 0
    output: str = ""
    error: str = ""

@dataclass
class Pipeline:
    name: str
    steps: list[Step] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @property
    def status(self) -> Status:
        if any(s.status == Status.FAILED for s in self.steps):
            return Status.FAILED
        if all(s.status == Status.PASSED for s in self.steps):
            return Status.PASSED
        if any(s.status == Status.RUNNING for s in self.steps):
            return Status.RUNNING
        return Status.PENDING

class CICDRunner:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.logs_dir = project_root / "cicd" / "logs"
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def run_command(self, cmd: str, timeout: int = 300) -> tuple[int, str, str]:
        """Run a shell command and return exit code, stdout, stderr."""
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return 1, "", f"Command timed out after {timeout}s"
        except Exception as e:
            return 1, "", str(e)

    def print_header(self, text: str):
        """Print a formatted header."""
        width = 70
        print("\n" + "═" * width)
        print(f"  {text}")
        print("═" * width)

    def print_step(self, step: Step):
        """Print step status."""
        duration = f"({step.duration:.1f}s)" if step.duration > 0 else ""
        print(f"  {step.status.value} {step.name} {duration}")

    def run_step(self, step: Step) -> bool:
        """Run a single pipeline step."""
        step.status = Status.RUNNING
        self.print_step(step)

        start = time.time()
        code, stdout, stderr = self.run_command(step.command)
        step.duration = time.time() - start
        step.output = stdout
        step.error = stderr

        if code == 0:
            step.status = Status.PASSED
        else:
            step.status = Status.FAILED

        # Reprint with final status
        print(f"\033[1A\033[2K", end="")  # Move up and clear line
        self.print_step(step)

        if step.status == Status.FAILED:
            if step.error:
                print(f"    Error: {step.error[:200]}")
            if step.output and "error" in step.output.lower():
                print(f"    Output: {step.output[:200]}")

        return step.status == Status.PASSED

    def run_pipeline(self, pipeline: Pipeline, stop_on_fail: bool = True) -> bool:
        """Run a complete pipeline."""
        pipeline.start_time = datetime.now()
        self.print_header(f"Pipeline: {pipeline.name}")
        print(f"  Started: {pipeline.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        success = True
        for step in pipeline.steps:
            if not self.run_step(step):
                success = False
                if stop_on_fail:
                    # Mark remaining as skipped
                    for remaining in pipeline.steps[pipeline.steps.index(step)+1:]:
                        remaining.status = Status.SKIPPED
                        self.print_step(remaining)
                    break

        pipeline.end_time = datetime.now()
        duration = (pipeline.end_time - pipeline.start_time).total_seconds()

        print()
        print(f"  {pipeline.status.value} Pipeline {pipeline.status.name} in {duration:.1f}s")

        # Save log
        self.save_log(pipeline)

        return success

    def save_log(self, pipeline: Pipeline):
        """Save pipeline log to file."""
        log_file = self.logs_dir / f"{pipeline.start_time.strftime('%Y%m%d_%H%M%S')}_{pipeline.name}.json"

        log_data = {
            "pipeline": pipeline.name,
            "status": pipeline.status.name,
            "start_time": pipeline.start_time.isoformat(),
            "end_time": pipeline.end_time.isoformat() if pipeline.end_time else None,
            "steps": [
                {
                    "name": s.name,
                    "command": s.command,
                    "status": s.status.name,
                    "duration": s.duration,
                    "output": s.output[-1000:] if s.output else "",
                    "error": s.error[-1000:] if s.error else "",
                }
                for s in pipeline.steps
            ]
        }

        with open(log_file, "w") as f:
            json.dump(log_data, f, indent=2)

        print(f"  Log saved: {log_file.name}")


def create_build_pipeline() -> Pipeline:
    """Create the build & test pipeline."""
    return Pipeline(
        name="build",
        steps=[
            Step("Install dependencies", "npm ci"),
            Step("TypeScript compile", "npm run build"),
            Step("Type check", "npx tsc --noEmit"),
        ]
    )


def create_validate_pipeline() -> Pipeline:
    """Create the domain model validation pipeline."""
    return Pipeline(
        name="validate",
        steps=[
            Step("Validate CAR-T products",
                 'node -e "import(\'./dist/domain/biotech/index.js\').then(m => { if(m.ApprovedCARTProducts.length < 6) throw new Error(\'Missing CAR-T\'); console.log(\'✓ 6 CAR-T products\'); })"'),
            Step("Validate mRNA vaccines",
                 'node -e "import(\'./dist/domain/biotech/index.js\').then(m => { if(m.KeymRNAVaccinePrograms.length < 2) throw new Error(\'Missing mRNA\'); console.log(\'✓ mRNA vaccines\'); })"'),
            Step("Validate CRISPR programs",
                 'node -e "import(\'./dist/domain/biotech/index.js\').then(m => { if(m.KeyCRISPRPrograms.length < 3) throw new Error(\'Missing CRISPR\'); console.log(\'✓ CRISPR programs\'); })"'),
            Step("Validate tools",
                 'node -e "import(\'./dist/tools/cancer/index.js\').then(m => { const t = m.createCancerTools(); if(t.length < 40) throw new Error(\'Missing tools\'); console.log(\'✓ \' + t.length + \' tools\'); })"'),
        ]
    )


def create_test_pipeline() -> Pipeline:
    """Create the test pipeline."""
    return Pipeline(
        name="test",
        steps=[
            Step("Run tests", "npm test --if-present"),
        ]
    )


def create_cad_pipeline() -> Pipeline:
    """Create the CAD (Computational-Aided Drug Discovery) pipeline."""
    return Pipeline(
        name="cad",
        steps=[
            Step("Run CAD discovery", "python3 cicd/run_cad_discovery.py"),
        ]
    )


def create_docs_pipeline() -> Pipeline:
    """Create the documentation generation pipeline."""
    return Pipeline(
        name="docs",
        steps=[
            Step("Generate README", "python3 cicd/generate_readme.py"),
        ]
    )


def create_patient_matching_pipeline(
    cancer_type: str,
    stage: str,
    biomarkers: dict,
    tavily_key: str
) -> Pipeline:
    """Create a patient matching pipeline."""
    biomarkers_json = json.dumps(biomarkers).replace('"', '\\"')

    return Pipeline(
        name="patient-matching",
        steps=[
            Step("Load framework", "npm run build --if-present"),
            Step("Assess curative potential", f'''node -e "
import('./dist/tools/cancer/biotech/curativeTools.js').then(async m => {{
  const tools = m.createCurativeTools('{tavily_key}');
  const assess = tools.find(t => t.name === 'AssessCurativePotential');
  const result = await assess.handler({{
    cancerType: '{cancer_type}',
    stage: '{stage}',
    biomarkers: {json.dumps(biomarkers)}
  }});
  console.log(result);
}});"'''),
            Step("Generate protocol", f'''node -e "
import('./dist/tools/cancer/biotech/curativeTools.js').then(async m => {{
  const tools = m.createCurativeTools('{tavily_key}');
  const protocol = tools.find(t => t.name === 'DesignCurativeProtocol');
  const result = await protocol.handler({{
    cancerType: '{cancer_type}',
    stage: '{stage}',
    biomarkers: {json.dumps(biomarkers)},
    patientFactors: {{ age: 55, performanceStatus: 1, priorTherapies: [], organFunction: 'normal' }}
  }});
  console.log(result);
}});"'''),
        ]
    )


def run_ci(project_root: Path) -> bool:
    """Run the full CI pipeline."""
    runner = CICDRunner(project_root)

    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + " CANCER CORE AGENTIC FRAMEWORK - LOCAL CI/CD ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")

    # Get git info
    code, commit, _ = runner.run_command("git rev-parse --short HEAD")
    code, branch, _ = runner.run_command("git branch --show-current")
    print(f"\n  Branch: {branch.strip()}  Commit: {commit.strip()}")

    pipelines = [
        create_build_pipeline(),
        create_validate_pipeline(),
        create_test_pipeline(),
        create_cad_pipeline(),
        create_docs_pipeline(),
    ]

    all_passed = True
    for pipeline in pipelines:
        if not runner.run_pipeline(pipeline):
            all_passed = False
            break

    # Final summary
    print("\n" + "─" * 70)
    if all_passed:
        print("  ✅ ALL PIPELINES PASSED")
    else:
        print("  ❌ CI FAILED")
    print("─" * 70 + "\n")

    return all_passed


def run_patient_match(
    project_root: Path,
    cancer_type: str,
    stage: str,
    biomarkers: dict,
    tavily_key: str
) -> bool:
    """Run patient matching pipeline."""
    runner = CICDRunner(project_root)

    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + " PATIENT MATCHING PIPELINE ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print(f"\n  Cancer: {cancer_type}")
    print(f"  Stage: {stage}")
    print(f"  Biomarkers: {biomarkers}")

    pipeline = create_patient_matching_pipeline(cancer_type, stage, biomarkers, tavily_key)
    return runner.run_pipeline(pipeline)


def install_git_hook(project_root: Path):
    """Install git post-commit hook."""
    hooks_dir = project_root / ".git" / "hooks"
    hook_file = hooks_dir / "post-commit"

    hook_content = f'''#!/bin/sh
# Auto-run CI on every commit
python3 "{project_root}/cicd/runner.py" ci
'''

    hook_file.write_text(hook_content)
    hook_file.chmod(0o755)
    print(f"✅ Git hook installed: {hook_file}")


def main():
    project_root = Path(__file__).parent.parent

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python runner.py ci                    # Run CI pipeline")
        print("  python runner.py install-hook          # Install git hook")
        print("  python runner.py match <cancer> <stage> <biomarkers_json>")
        print("")
        print("Examples:")
        print("  python runner.py ci")
        print("  python runner.py install-hook")
        print('  python runner.py match "DLBCL" "Relapsed" \'{"CD19":"positive"}\'')
        sys.exit(1)

    command = sys.argv[1]

    if command == "ci":
        success = run_ci(project_root)
        sys.exit(0 if success else 1)

    elif command == "install-hook":
        install_git_hook(project_root)

    elif command == "match":
        if len(sys.argv) < 5:
            print("Usage: python runner.py match <cancer> <stage> <biomarkers_json>")
            sys.exit(1)

        cancer_type = sys.argv[2]
        stage = sys.argv[3]
        biomarkers = json.loads(sys.argv[4])
        tavily_key = os.environ.get("TAVILY_API_KEY", "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")

        success = run_patient_match(project_root, cancer_type, stage, biomarkers, tavily_key)
        sys.exit(0 if success else 1)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
