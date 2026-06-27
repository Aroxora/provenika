# How cancer is actually being cured — and where AI saves the experiment

> **⚠️ Not for patient care.** This is a research-strategy map, not medical advice. Nothing here
> diagnoses, treats, or advises any patient. A computational result is a hypothesis for the wet lab.

There is **no single cure**. "Cancer" is hundreds of diseases, and real progress is the *sum* of five
levers: **prevent it, find it earlier, hit it precisely, turn the immune system on it, and stay ahead
of resistance.** AI — most clearly **AlphaFold-style structure prediction** — genuinely compresses the
cheap, in-silico *front* of each lever, shrinking how many experiments get run and how many dead-end
molecules get made. **It never runs the experiment** that proves a person is protected, a tumour
shrinks, or a therapy is safe. Every claim below is literature-verified (corroborated across
independent sources); investigational work is labelled as such.

---

## 1 · Prevention — the most decisively curative lever

**Why it works (proven):** stopping a cancer from ever occurring beats any treatment.
- **HPV vaccine → cervical cancer:** England's program cut cervical-cancer incidence **87%** in the
  earliest-vaccinated cohort (Falcaro et al., *Lancet* 2021); Sweden saw ~88% lower invasive disease
  when vaccinated before 17 (Lei et al., *NEJM* 2020). Also prevents HPV-driven anal, oropharyngeal,
  and other cancers.
- **HBV vaccine → liver cancer:** Taiwan's 1984 universal infant program sharply cut childhood
  hepatocellular carcinoma (Chang et al., *NEJM* 1997).
- **Tobacco control** is the single largest preventable cause of cancer death; quitting roughly halves
  lung-cancer mortality. **Chemoprevention:** tamoxifen (~50%) / raloxifene for high-risk breast
  cancer; aspirin cut colorectal cancer **~60%** in Lynch syndrome (CAPP2, Burn et al., *Lancet* 2020).

**Where AI saves experiment:** risk models sharpen *who* to screen, cutting unnecessary imaging and
biopsies — **Mirai** (mammography risk, Yala et al., *Sci Transl Med* 2021), **Sybil** (lung-cancer
risk from one low-dose CT, Mikhael et al., *JCO* 2023), **AVE** (smartphone cervix triage for
low-resource settings), polygenic risk scores. AlphaFold-style design has, honestly, **no proven role
in prevention yet** — the approved vaccines predate it and used empirical virology.

**Irreducibly experimental / human:** immunogenicity, durability and safety are measured only in
people over years; manufacturing and delivery are wet-lab + logistics; and the biggest lever —
tobacco/behaviour/uptake — is policy, not computation.

## 2 · Early detection — the biggest survival lever

**Why it works (proven):** stage at diagnosis dominates survival; AI is **FDA-authorised here today.**
- **Paige Prostate** — first FDA-authorised AI pathology tool (2021).
- **GI Genius** (Medtronic) — FDA-authorised real-time polyp detection on colonoscopy (2021); RCTs
  show higher adenoma detection.
- **AI mammography** — the **MASAI** randomised trial (Lång et al., *Lancet Oncology* 2023) showed
  AI-supported screening detected more cancers and roughly halved radiologist reading workload.
- **Liquid biopsy / multi-cancer early detection** (e.g. **Galleri**, cfDNA methylation) is
  **investigational** — promising stage-shift signals, definitive mortality benefit not yet proven.

**Where AI saves experiment:** it reads the scan or slide *already being taken*, cutting misses and
reader workload and triaging where no pathologist is available — no new test required.

**Irreducibly experimental / human:** you still physically image or sample a living body; a
pathologist confirms; a clinician removes the precancer; and only prospective trials prove a
mortality benefit.

## 3 · Precision targeted therapy — where AlphaFold saves the most experiment

**Why it works (proven):** matching a drug to a tumour's driver (EGFR, BTK, BRAF, KRAS G12C, …).
**Where AI saves experiment — the clearest case:**
- **AlphaFold2** predicts a usable 3-D structure from sequence (CASP14 median GDT-TS **92.4**, Jumper
  et al., *Nature* 2021) and the **AlphaFold DB** serves 200M+ models — replacing *some* of the months
  of crystallography needed just to start structure-based design. **AlphaFold3** (Abramson et al.,
  *Nature* 2024) extends this to protein-ligand complexes.
- **Free-energy perturbation (FEP)** ranks which of thousands of analogues are worth synthesising to
  ~1 kcal/mol on a congeneric series (Wang et al., *JACS* 2015) — fewer molecules made, fewer assays run.
- **Generative de-novo design** (RFdiffusion, REINVENT, and platform efforts) proposes novel candidates.

**Irreducibly experimental / honest limits:** a *predicted* structure is not a holo, induced-fit
pocket — docking into AlphaFold models is materially worse than into experimental structures
(Karelina et al., *eLife* 2023); FEP is *relative* and force-field-capped; and **every** candidate
must still be synthesised and assayed — a Kd is measured, never computed to decision grade.

## 4 · Immunotherapy — turning the immune system on the tumour

**Why it works (proven & investigational):** checkpoint inhibitors and **CAR-T** (Kymriah, the first
FDA-approved CAR-T, 2017) already cure some blood cancers. **Personalised neoantigen mRNA vaccines**
are investigational but striking: **mRNA-4157 (V940) + pembrolizumab cut melanoma recurrence ~49%**
vs pembrolizumab alone (KEYNOTE-942 Phase 2b; Moderna/Merck).

**Where AI saves experiment:** **neoantigen prediction** (NetMHCpan-4.1, Reynisson et al., *NAR* 2020)
pre-filters which of a patient's mutations are worth putting in a vaccine — collapsing a vast
experimental search; AlphaFold/RFdiffusion model TCR-peptide-MHC and design antibodies/binders.

**Irreducibly experimental / human:** the actual immune response, manufacturing each personalised
product, and the trial that proves benefit.

## 5 · Resistance & combinations — staying ahead of evolution

**Why it matters (proven):** cancers relapse via resistance mutations — EGFR **T790M**, answered by
the third-generation inhibitor **osimertinib** (then C797S); KRAS allele switching. Combinations and
sequencing extend control.

**Where AI saves experiment:** predicting likely resistance mutations and modelling the *mutant*
structure (AlphaFold / stability-ΔΔG predictors) to design the next-generation inhibitor before the
clinic needs it.

**Irreducibly experimental / honest limit:** folding-stability ΔΔG is *not* the effect on drug binding
(many resistance mutations reshape the pocket, not the fold); somatic evolution is read out in
patients; and each next-gen drug still runs the entire pipeline above.

## 6 · Translation & access — the irreducible clinic

**Where AI saves experiment:** biomarker discovery and patient-trial matching shrink the search for
*who* benefits.

**Irreducibly human:** efficacy and safety are settled **only** by Phase 1-3 clinical trials — and in
oncology only **~3.4%** of programs entering Phase I are approved (Wong, Siah & Lo, *Biostatistics*
2019), at ~$2.6B and 10-15 years each (DiMasi et al. 2016). Approval, manufacturing, and *equitable
delivery* are human, clinical, and economic — no model removes them.

---

## The honest payoff

AI compresses the cheap front — **structures, candidate selection, who-to-screen** — so **fewer
experiments are run and fewer dead-ends are made**. AlphaFold-style prediction is the clearest win:
it can replace *some* structural biology and front-load design. But the cure is still **built by
experiment** — the immunised person, the removed precancer, the synthesised-and-assayed molecule, the
animal, the trial. AI gets there with fewer experiments; it does not get there without them.

*Provenika — an ErosolarAI research framework. In-silico triage only. Not for patient care.*
