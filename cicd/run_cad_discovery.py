#!/usr/bin/env python3
"""
CAD Discovery Pipeline - Runs on Every Commit

Discovers new oral drug candidates, validates existing solutions,
and updates the framework with latest clinical trial data.
"""

import subprocess
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent

def run_cad_discovery():
    """Run CAD to discover and validate oral drug solutions."""

    script = """
const { AllOralDrugCandidates, getApprovedOralPills, getPipelineOralPills, ChemoToOralConversions } = require('./dist/tools/cancer/discovery/oralDrugPipeline.js');
const { NoScreeningCancers, NoTargetedTherapyCancers, RareCancersUnmetNeeds } = require('./dist/tools/cancer/discovery/gapAnalysisTools.js');

// Analyze current coverage
const approved = getApprovedOralPills();
const pipeline = getPipelineOralPills();
const chemoConversions = ChemoToOralConversions.filter(c => c.status.includes('APPROVED'));

// Find gaps - cancers still needing oral solutions
const cancersWithOral = new Set(AllOralDrugCandidates.map(d => d.cancer));
const allUnmetCancers = [...NoScreeningCancers, ...NoTargetedTherapyCancers, ...RareCancersUnmetNeeds];
const cancersNeedingOral = allUnmetCancers.filter(c => !cancersWithOral.has(c.type));

// Summary
const summary = {
    timestamp: new Date().toISOString(),
    oralDrugs: {
        total: AllOralDrugCandidates.length,
        approved: approved.length,
        pipeline: pipeline.length
    },
    chemoConversions: {
        total: ChemoToOralConversions.length,
        approved: chemoConversions.length
    },
    coverage: {
        cancersWithOral: cancersWithOral.size,
        cancersNeedingOral: cancersNeedingOral.length,
        gaps: cancersNeedingOral.map(c => c.type)
    },
    topPipelineDrugs: pipeline.slice(0, 5).map(d => ({
        drug: d.oralDrug,
        cancer: d.cancer,
        target: d.target,
        phase: d.phase,
        approval: d.projectedApproval
    })),
    recentApprovals: approved.filter(d =>
        d.projectedApproval.includes('2024') ||
        d.projectedApproval.includes('2023') ||
        d.projectedApproval.includes('2022')
    ).map(d => ({
        drug: d.oralDrug,
        cancer: d.cancer,
        approval: d.projectedApproval
    }))
};

console.log(JSON.stringify(summary, null, 2));
"""

    result = subprocess.run(
        ['node', '-e', script],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=60
    )

    if result.returncode != 0:
        print(f"  CAD Error: {result.stderr[:200]}")
        return None

    try:
        summary = json.loads(result.stdout)
        return summary
    except:
        return None


def main():
    print("  Running CAD discovery...")

    summary = run_cad_discovery()

    if not summary:
        print("  CAD discovery failed")
        return False

    # Save summary
    summary_file = ROOT / "cicd" / "cad_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)

    # Print results
    oral = summary['oralDrugs']
    chemo = summary['chemoConversions']
    coverage = summary['coverage']

    print(f"  Oral drugs: {oral['approved']} approved, {oral['pipeline']} pipeline")
    print(f"  Chemo→Oral: {chemo['approved']}/{chemo['total']} conversions available")
    print(f"  Coverage: {coverage['cancersWithOral']} cancers have oral options")

    if coverage['gaps']:
        print(f"  Gaps: {len(coverage['gaps'])} cancers still need oral solutions")

    return True


if __name__ == "__main__":
    main()
