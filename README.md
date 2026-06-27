# Provenika — what the cloud cannot fix (and what actually can)

> ## ⚠️ Not for patient care
> Provenika does not diagnose, treat, or advise on any patient, and neither does this review.
> Nothing here is medical advice. A computational hit is a hypothesis for the wet lab, never
> evidence a therapy works.

The **infrastructure** limitations are gone: given AWS, docking runs and the redocking benchmark
regenerates (AutoDock Vina + Open Babel + Meeko + pdb2pqr on an EC2 instance — the committed result
in [`examples/validation-redock/`](examples/validation-redock/) was produced there). But cloud
compute buys *tooling and parallelism, not experimental truth.* The limitations below **cannot be
fixed by AWS — or by any amount of compute.** Each says exactly what *is* required.

## 1. A docking score is not efficacy

**Why AWS can't fix it.** AutoDock Vina's ΔG is an approximate ranking aid, only weakly correlated
with true binding affinity; redocking validates that a *known* pose reproduces, not that a *new*
prediction is right. Running more docking on more cores just produces more approximate numbers.
**What's required.** Wet-lab assays — biochemical and cellular potency — and even those don't settle
it: in-vitro ≠ in-vivo ≠ clinical. Physics-based free-energy methods (FEP/MD) *can* run on AWS GPUs,
but they are force-field-limited and need per-target experimental anchoring to be trusted.

## 2. Rediscovery, not discovery

**Why AWS can't fix it.** Triage ranks compounds ChEMBL has *already measured*; no amount of compute
invents new chemical matter or measures a molecule no one has made.
**What's required.** De-novo / generative design **with a validated evaluation harness**, then actual
**synthesis and assay** of the proposed molecules. The bottleneck is the chemistry and the assay, not
the GPU.

## 3. "Inactive" decoys are an assumption, not a fact

**Why AWS can't fix it.** The enrichment AUC labels property-matched decoys as inactive; compute
cannot confirm that a molecule *doesn't* bind — absence of data is not evidence of inactivity.
**What's required.** Experimentally-confirmed inactives, or curated assay sets (DUD-E / DEKOIS with
their documented caveats). That is measured data, not cycles.

## 4. Missing data — and third-party API latency

**Why AWS can't fix it.** A sparsely-measured target stays sparse no matter how many instances you
launch, and ChEMBL/UniProt/RCSB are EBI/RCSB public services with their own rate and latency limits —
compute does not speed up someone else's API, it only hammers it.
**What's required.** Someone to **measure** the missing bioactivity. Caching/mirroring mitigates the
latency; it does not add a single data point that the public databases don't already hold.

## 5. Allele-specific structures that don't exist yet

**Why AWS can't fix it.** No cloud conjures a co-crystal of a specific mutant (e.g. a resistance
allele) that has never been solved; Provenika can only *flag* when the auto-picked structure is
wild-type, not produce the mutant.
**What's required.** An experimentally-determined holo structure of the mutant (X-ray / cryo-EM), or
carefully-validated modeling that is then treated as a hypothesis, not an answer.

## 6. The hard gap: a hit is a hypothesis, not a drug

**Why AWS can't fix it.** ADMET, toxicity, PK, efficacy, safety, and the clinic are wet-lab and human
work. Scaling the cheap in-silico *front* of discovery never substitutes for experiment, and nothing
here may direct care.
**What's required.** In-vitro → in-vivo → clinical trials, run by qualified scientists and clinicians.
Provenika's job ends at a ranked, cited, re-verifiable **hypothesis** handed to that process.

---

**Resolved on AWS (for the record).** The two *infrastructure* limitations — the absent docking
binaries and regenerating the 39-complex redocking benchmark — were solved by running on an EC2
instance with the conda-forge Vina stack; executing it there also surfaced and fixed two real bugs
(a missing `gemmi` dependency, and an all-chains reference-ligand extraction that inflated multi-copy
RMSDs). Reproduce with `make setup-docking && make redock` on any Vina-equipped host.

Developed by **[ErosolarAI](https://erosolarai.com)**. MIT — research and decision-support only; not
a substitute for professional medical advice.
