#!/usr/bin/env python3
"""
README generator — LIMITATIONS-only.

By request, README.md is a candid, exhaustive list of this project's LIMITATIONS — nothing else.
The usage narrative and anti-hallucination strategy live in docs/ and the web app; the README's
single job here is to be honest about what this tool does NOT do and where it falls short.

Edit the LIMITATIONS string below, then run `python3 cicd/generate_readme.py`, and commit both.
Nothing parses the README programmatically (cicd/check_readme.sh keeps its own command list), so the
content is free-form prose.
"""

from pathlib import Path

ROOT = Path(__file__).parent.parent

LIMITATIONS = r"""# Provenika — Limitations

Provenika is an auditable oncology **research** tool (CADD triage → structure → docking setup →
feasibility), developed by **[ErosolarAI](https://erosolarai.com)**. This file lists, candidly and
completely, what it does **not** do and where it falls short.

> **Research only — not medical advice, not a treatment recommendation, not a diagnosis.**
> A computational hit is not proof of anything.

## Execution / environment

- **Still requires a Vina-equipped host to execute** (the code is implemented + unit-tested with
  stubs, just not runnable here): the actual batch-dock run and regenerating the 39-complex
  redocking artifact — `vina`/`obabel`/`obrms` aren't installed in this environment.
- Docking-grade prep (Meeko + pdb2pqr → the validated ~1.4 Å path) is optional; without it the
  pipeline silently falls back to the inferior Open-Babel prep (~7.9 Å). `cad/dock.py --check` flags
  this, and the wrapper never fabricates a score.

## Triage / shortlist

- **Rediscovery, not discovery.** Triage ranks compounds ChEMBL has *already measured* against the
  target. It cannot score a novel/unmeasured molecule by potency — only by 2-D similarity to known
  actives or by docking. It surfaces known chemotypes and close analogs, not de novo molecules.
- **Median consensus is floor-biased.** The per-molecule consensus is the median of measurements at
  or above `--min-pchembl` (the descending scan stops at the floor), so it is a transparent,
  slightly upward-biased consensus; lower the floor to widen it. `potency_suspect` flags a
  near-ceiling potency backed by < 2 measurements, but cannot vet the assay itself.
- **Selectivity is a proxy.** `n_potent_targets` counts distinct human ChEMBL targets a hit is potent
  against; it does not separate single-protein from complex/cell-line targets, and *absence of
  off-target data is not evidence of selectivity*. It is an opt-out probe (extra API calls).
- **Assay pooling.** IC50/Ki/Kd/EC50 are pooled onto one pChEMBL axis; `--binding-only` restricts to
  biochemical binding assays, but a mixed `assay_format` remains a coarse signal.
- **ChEMBL coverage is uneven** across targets and alleles; a sparsely-measured target yields a thin,
  less trustworthy shortlist.

## Allele / mutation handling

- **The receptor mutation check is advisory.** It reads the residue at the requested position using
  the structure's *author* numbering, which usually — but not always — aligns with UniProt. It
  reports a finding (match / wild-type / other / unverifiable) and never asserts a silent match.
- **Structures are not auto-matched to the allele.** `fetch_structure` prefers a holo entry among the
  top candidates but can land on an apo structure (no docking box) or a *wild-type* structure for an
  allele-specific campaign — it flags this, it does not fix it. Supply a mutant holo PDB with `--pdb`.

## Validation evidence

- **Enrichment uses presumed-inactive decoys.** Property-matched decoys are *assumed* inactive
  (DUD-E-style); a decoy could coincidentally be an unmeasured active. The committed AUC measures
  whether structure recovers *known* actives over decoys — **necessary, not sufficient**, and not a
  prediction of prospective accuracy or efficacy. Decoy sampling varies run-to-run; one target (EGFR)
  is committed.
- **Redocking validates a *known* pose.** ≤ 2 Å redocking success (median ~1.4 Å on the curated set)
  is a necessary check, not proof of prospective accuracy. Cross-docking, induced fit, and
  prospective virtual screening are harder and are **not** validated here.
- **The rank-fusion column is NON-VALIDATED** — a transparent combination of two unvalidated triage
  signals (ligand score + Vina ΔG). Vina ΔG is an approximate ranking aid weakly correlated with true
  affinity — **never** a measured Kd/IC50.
- **Verify proves re-derivability, not query-design correctness.** A wrong-but-stable query
  reproduces and passes. Free-text prose, the `cad/intel/` digests, and structure byte-integrity are
  **not** covered by the provenance/verify spine.

## Docking box

- A whole-receptor **blind box** is weak; an oversized one (> 30 Å on an axis) is flagged unreliable.
  Pocket detection for apo targets (fpocket / P2Rank) is **not** built in.
- The committed redocking success was measured at a focused (pad 4 Å) box; the wider production box
  (pad 8 Å) is a different, un-certified configuration (search effort scales with box volume to
  compensate, but that is not separately validated).

## Cost-benefit

- **Target-independent.** A modality/phase-level benchmark from public priors (BIO/Informa, DiMasi,
  Wong et al.); identical inputs give identical figures for *any* target — it carries no
  target/molecule signal. The preclinical LOA and several multipliers are author estimates; the
  verdict bands are unsourced heuristics. Not a valuation, not financial advice.

## Explicitly NOT covered

- No ADMET/tox prediction, no free-energy perturbation (FEP), no generative/de-novo design, no QSAR
  efficacy models, no kinome selectivity panels beyond the ChEMBL proxy.
- No per-patient recommendations, doses, diagnoses, prognoses, or treatment plans — and nothing that
  would direct care.

## Web app

- [provenika.com](https://provenika.com) is a **separate browser reimplementation**. Its triage now
  mirrors the CLI's data-quality logic (quality gate, median consensus, suspect flag, allele filter),
  but it does **not** run docking, the selectivity probe, or the full provenance/verify spine — it is
  a convenience view, not the audited core.

---

Developed by **[ErosolarAI](https://erosolarai.com)**. MIT — research and decision-support only; not
a substitute for professional medical advice.
"""


def main():
    (ROOT / "README.md").write_text(LIMITATIONS)
    print("  README.md updated (limitations-only)")


if __name__ == "__main__":
    main()
