#!/usr/bin/env python3
"""
Patient Matching CLI

Match cancer patients to curative biotechnologies:
- CAR-T Cell Therapy (6 FDA-approved products)
- mRNA Cancer Vaccines (Phase 2/3 trials)
- CRISPR Gene Editing (Phase 1/2 trials)
- Oncolytic Virus Therapy (2 approved products)
"""

import subprocess
import sys
import json
import os
from pathlib import Path
from typing import Optional


def run_matching(
    cancer_type: str,
    stage: str,
    biomarkers: dict,
    prior_therapies: list[str] = None,
    age: int = 55,
    performance_status: int = 1,
    organ_function: str = "normal",
    tavily_key: Optional[str] = None
) -> dict:
    """Run patient matching against curative therapies."""

    project_root = Path(__file__).parent.parent

    if tavily_key is None:
        tavily_key = os.environ.get(
            "TAVILY_API_KEY",
            "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"
        )

    if prior_therapies is None:
        prior_therapies = []

    # Build the Node.js command
    script = f'''
import('./dist/tools/cancer/biotech/curativeTools.js').then(async m => {{
  const tools = m.createCurativeTools('{tavily_key}');

  // Assess eligibility
  const assess = tools.find(t => t.name === 'AssessCurativePotential');
  const assessment = JSON.parse(await assess.handler({{
    cancerType: '{cancer_type}',
    stage: '{stage}',
    biomarkers: {json.dumps(biomarkers)},
    priorTherapies: {json.dumps(prior_therapies)}
  }}));

  // Generate protocol
  const protocol = tools.find(t => t.name === 'DesignCurativeProtocol');
  const protocolText = await protocol.handler({{
    cancerType: '{cancer_type}',
    stage: '{stage}',
    biomarkers: {json.dumps(biomarkers)},
    patientFactors: {{
      age: {age},
      performanceStatus: {performance_status},
      priorTherapies: {json.dumps(prior_therapies)},
      organFunction: '{organ_function}'
    }}
  }});

  console.log(JSON.stringify({{
    assessment,
    protocol: protocolText
  }}, null, 2));
}});
'''

    result = subprocess.run(
        ["node", "-e", script],
        cwd=project_root,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        return None

    return json.loads(result.stdout)


def print_results(results: dict):
    """Pretty print matching results."""
    assessment = results["assessment"]
    protocol = results["protocol"]

    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + " CURATIVE THERAPY MATCHING RESULTS ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")

    print(f"\n  Cancer: {assessment['cancerType']}")
    print(f"  Stage: {assessment['stage']}")
    print(f"  Biomarkers: {assessment['biomarkers']}")

    print("\n" + "─" * 70)
    print("  ELIGIBLE THERAPIES")
    print("─" * 70)

    for therapy in assessment["eligibleTherapies"]:
        status = "✓ FDA" if therapy["eligibilityStatus"] == "approved" else "⚗️ Trial"
        cr = f"{therapy['expectedCompleteResponseRate']}% CR" if therapy.get("expectedCompleteResponseRate") else ""
        print(f"\n  {status} {therapy['therapyName']}")
        if cr:
            print(f"       Response Rate: {cr}")
        if therapy.get("clinicalTrialId"):
            print(f"       Trial: {therapy['clinicalTrialId']}")
        print(f"       Considerations:")
        for c in therapy["considerations"][:3]:
            print(f"         - {c}")

    print("\n" + "─" * 70)
    print("  RECOMMENDED APPROACH")
    print("─" * 70)
    print(f"\n  {assessment['bestApproach']}")
    print(f"\n  Rationale: {assessment['rationale']}")

    print("\n" + "─" * 70)
    print("  TREATMENT PROTOCOL")
    print("─" * 70)

    # Print protocol (truncated for display)
    lines = protocol.split("\n")
    in_protocol = False
    for line in lines:
        if "Protocol" in line:
            in_protocol = True
        if "Important Disclaimers" in line:
            break
        if in_protocol and line.strip():
            print(f"  {line}")

    print("\n" + "─" * 70)
    print("  ⚠️  DISCLAIMER: For research/educational purposes only.")
    print("      Clinical decisions require qualified oncologist oversight.")
    print("─" * 70 + "\n")


def interactive_mode():
    """Interactive patient matching."""
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + " CANCER CURE MATCHING - INTERACTIVE MODE ".center(68) + "║")
    print("╚" + "═" * 68 + "╝")

    print("\n  Supported Cancer Types:")
    print("  ─────────────────────────────────────────")
    cancers = [
        "B-cell ALL", "DLBCL", "Follicular Lymphoma", "Mantle Cell Lymphoma",
        "CLL/SLL", "Multiple Myeloma", "Melanoma", "NSCLC",
        "Pancreatic Cancer", "Colorectal Cancer", "Glioblastoma"
    ]
    for i, c in enumerate(cancers, 1):
        print(f"  {i:2}. {c}")

    print()
    cancer_type = input("  Enter cancer type: ").strip()
    stage = input("  Enter stage (e.g., Relapsed/Refractory): ").strip()

    print("\n  Common Biomarkers: CD19, CD22, BCMA, PD-L1, HER2, ER, PR")
    biomarkers_str = input("  Enter biomarkers (JSON, e.g., {\"CD19\":\"positive\"}): ").strip()

    try:
        biomarkers = json.loads(biomarkers_str) if biomarkers_str else {}
    except:
        biomarkers = {}

    prior = input("  Prior therapies (comma-separated, or Enter to skip): ").strip()
    prior_therapies = [t.strip() for t in prior.split(",")] if prior else []

    print("\n  Running matching algorithm...")

    results = run_matching(
        cancer_type=cancer_type,
        stage=stage,
        biomarkers=biomarkers,
        prior_therapies=prior_therapies
    )

    if results:
        print_results(results)


def main():
    if len(sys.argv) < 2:
        interactive_mode()
        return

    if sys.argv[1] == "-i" or sys.argv[1] == "--interactive":
        interactive_mode()
        return

    if sys.argv[1] == "-h" or sys.argv[1] == "--help":
        print("""
Patient Matching CLI

Usage:
  python patient_match.py                          # Interactive mode
  python patient_match.py -i                       # Interactive mode
  python patient_match.py <cancer> <stage> <biomarkers_json>

Examples:
  python patient_match.py "DLBCL" "Relapsed" '{"CD19":"positive"}'
  python patient_match.py "Multiple Myeloma" "4th line" '{"BCMA":"positive"}'
  python patient_match.py "Melanoma" "Stage IV" '{"PD-L1":"50%"}'

Environment:
  TAVILY_API_KEY    API key for real-time research (optional)
""")
        return

    if len(sys.argv) < 4:
        print("Usage: python patient_match.py <cancer> <stage> <biomarkers_json>")
        print("       python patient_match.py -i  (interactive mode)")
        sys.exit(1)

    cancer_type = sys.argv[1]
    stage = sys.argv[2]
    biomarkers = json.loads(sys.argv[3])
    prior_therapies = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []

    results = run_matching(
        cancer_type=cancer_type,
        stage=stage,
        biomarkers=biomarkers,
        prior_therapies=prior_therapies
    )

    if results:
        print_results(results)


if __name__ == "__main__":
    main()
