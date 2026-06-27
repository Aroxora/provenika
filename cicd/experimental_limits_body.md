## The experimental limits — and the computational angle on each

Provenika stops at a ranked, cited hypothesis (ChEMBL triage + AutoDock Vina docking + RDKit). Everything past that point is an **experimental** limit. For each limit below: what experiment is *required* to truly close it, the *real, fact-checked* computational methods that partially de-risk it, and their honest limitations. Methods marked **(addable here)** are realistically implementable on Provenika's existing stack (ChEMBL / RDKit / Vina / public APIs).

---

### 1. Binding affinity — a docking score is not a Kd/IC50

**The limit & the experiment that closes it:** A Vina score ranks poses; it is not a measured binding constant. Only a biophysical/biochemical assay (SPR, ITC, radioligand, or enzyme IC50) yields true affinity.

**Computational angle** (refines, does not measure):

- **Alchemical relative binding free energy (FEP/TI)** — morphs one congeneric ligand into another in explicit-solvent MD to compute a physics-based ΔΔG, ranking a congeneric series far more reliably than docking. OSS: **OpenFE**, **perses**, **feflow** (+OpenMM), **GROMACS**. *Reported accuracy:* Wang et al., *JACS* 2015, 137, 2695 (FEP+): MUE ≈ 0.9 kcal/mol over 199 ligands / 8 targets; the 15-pharma Open Free Energy collaborative assessment (*JCIM*, DOI 10.1021/acs.jcim.6c00089, >1700 ligands): weighted RMSE 1.73 kcal/mol public, 2.44 kcal/mol blinded. *Honest limit:* relative ΔΔG only (not absolute Kd), needs a correct starting pose and a shared scaffold/binding mode, breaks on scaffold hops and charge-changing edges, capped by force field (~1 kcal/mol floor) and MD sampling, and costs GPU-hours per edge. Prioritizes *which analog to synthesize*; does not replace measured Kd/IC50.

- **MM-GBSA / MM-PBSA end-point rescoring** — re-ranks docked poses by combining MM interaction energy with implicit-solvent (GB/PB) + surface-area terms. OSS: **AmberTools MMPBSA.py**, **gmx_MMPBSA**, **GROMACS/sander/pmemd**. *Honest limit:* entropy usually neglected, absolute ΔG unreliable, highly sensitive to dielectric/charges/solvation model; correlation with experiment is modest and system-dependent and often no better than plain docking. Use only as an intra-series re-ranking heuristic, not a Kd predictor. (Genheden & Ryde, *Expert Opin. Drug Discov.* 2015, 10, 449; Valdés-Tresanco et al., *JCTC* 2021, 17, 6281.)

- **CNN rescoring — gnina (CNNscore / CNNaffinity)** **(addable here)** — re-scores Vina/smina poses with a 3D-CNN ensemble; a drop-in over Provenika's existing Vina step. OSS: **gnina**, **smina**, **libmolgrid**. *Reported:* GNINA 1.0 (McNutt et al., *J. Cheminform.* 2021, 13:43) raised Top-1 (<2 Å) redocking accuracy from 58% (Vina) to 73% and cross-docking from 27% to 37% with a defined pocket. *Honest limit:* a learned surrogate trained largely on PDBbind, prone to dataset bias and weak novel-target generalization; treat CNNaffinity as a ranking signal, not a measured Kd.

- **Graph/statistical-potential ML rescoring — RTMScore** **(addable here)** — residue-graph + atom-graph + graph-transformer + mixture-density network learns a residue-atom distance-likelihood potential to re-rank poses. OSS: **RTMScore** (Shen et al., *J. Med. Chem.* 2022, 65:10691, DOI 10.1021/acs.jmedchem.2c00991). *Honest limit:* strong CASF-2016 docking/screening power may be inflated by train/test protein similarity and need not transfer to novel targets; not calibrated to Kd, research-grade code. A re-ranking heuristic, not an affinity measurement.

---

### 2. Synthesis — a proposed molecule must be made to be tested

**The limit & the experiment that closes it:** Computation proposes a structure; only a chemist executing a route in the lab proves it can be made. No method here makes the molecule.

**Computational angle** (predicts feasibility/routes, does not synthesize):

- **Synthetic Accessibility (SA) score** **(addable here)** — fragment-frequency + complexity heuristic, 1 (easy) to 10 (hard). OSS: **RDKit** `Contrib/SA_Score/sascorer.py` (Ertl & Schuffenhauer, *J. Cheminform.* 2009, 1:8). *Honest limit:* estimates how "ordinary" a structure looks — no route, building blocks, reagents, conditions, or yield; a low score never guarantees synthesizability. (In one small benchmark — PMC9840255, *J. Cheminform.* 2023, 49 compounds vs AiZynthFinder — SAscore had the highest AUC of four scores, 0.90 / acc 0.81.)

- **SCScore** **(addable here)** — neural net (trained on 12M Reaxys reactions) outputting a 1–5 relative synthetic-complexity score. OSS: **connorcoley/scscore**, **DeepChem** (Coley et al., *JCIM* 2018, 58(2):252). *Honest limit:* a relative number, not a route; literature-biased; underperformed even SA score in independent benchmarking (AUC 0.67 / acc 0.69). Coarse triage signal only.

- **RAscore** **(addable here)** — fingerprint classifier predicting the probability AiZynthFinder can find a route to in-stock precursors, ≥4500× faster than the full search. OSS: **reymond-group/RAscore**, MIT (Thakkar et al., *Chem. Sci.* 2021, 12:3339). *Honest limit:* predicts only *agreement with AiZynthFinder* (its labels), not ground-truth synthesizability; binary, returns no route, inherits that tool's templates/stock; pretrained models pinned to Python 3.7 / TF 2.5.

- **AiZynthFinder (retrosynthesis/CASP)** — Monte Carlo tree search guided by a neural reaction-template policy; returns concrete candidate routes to purchasable building blocks. OSS: **MolecularAI/aizynthfinder**, MIT (Genheden et al., *J. Cheminform.* 2020, 12:70). *Reported:* solution typically <10 s, full search <1 min/molecule; no synthesis-success/yield accuracy claimed. *Honest limit:* template-bounded; routes can be missing, naive, or non-robust; no guaranteed conditions/yields/chemoselectivity — hypotheses a chemist must vet and the lab must execute.

- **ASKCOS (synthesis-planning suite)** — one-step retrosynthesis, multi-step planning (Tree Builder / Interactive Path Planner), condition recommendation, forward prediction, pathway scoring via web UI/API. OSS: MIT-licensed core (Tu et al., arXiv:2501.01835, 2025; *Acc. Chem. Res.* 2025, DOI 10.1021/acs.accounts.5c00155). *Honest limit:* built to *complement* expert chemists; statistical suggestions (some models trained on proprietary Reaxys, released CC BY-NC) needing lab confirmation; guarantees no route and makes no molecule; full deployment is a heavy multi-service Docker stack.

---

### 3. Cell engagement — biochemical potency ≠ cellular target engagement

**The limit & the experiment that closes it:** A potent binder in a tube may never reach the target inside a cell. Only a cell-based assay (e.g. CETSA, NanoBRET target engagement) measures real in-cell engagement.

**Computational angle** (flags permeability/efflux *liability* only — never occupancy):

- **ADMET-AI** **(addable here)** — Chemprop D-MPNN + 200 RDKit descriptors over Therapeutics Data Commons; predicts Caco-2 permeability, Pgp inhibition, oral bioavailability, BBB from SMILES. OSS: **admet_ai**, **Chemprop**, **RDKit**, **PyTDC** (Swanson et al., *Bioinformatics* 2024, 40(7):btae416). *Reported:* highest average rank across the 22-dataset TDC ADMET Leaderboard (Caco2_Wang n=906: MAE 0.330 vs top 0.256; Pgp_Broccatelli n=1212: AUROC 0.886 vs top 0.938). *Honest limit:* predicts passive permeability/efflux liability, not intracellular free concentration, target abundance, or residence time; Caco-2 is an intestinal-absorption surrogate, not a tumor cell.

- **BOILED-Egg / SwissADME** **(addable here, partially)** — WLOGP-vs-TPSA plot flags likely passive GI absorption / BBB; SwissADME adds an SVM Pgp-substrate flag. *Reproduce ellipses locally with* **RDKit** / **pyBOILEDegg**; the Pgp SVM is web-only and not open-source (Daina & Zoete, *ChemMedChem* 2016, PMID 27218427: HIA acc 92%/MCC 0.65, n=660; BBB acc 88%/MCC 0.75, n=260; Daina et al., *Sci Rep* 2017;7:42717). *Honest limit:* 2D passive-permeability heuristic; ignores active transport, intracellular free fraction, and the target — does not predict engagement.

- **Physicochemical rules (TPSA / Lipinski Ro5 / Veber)** **(addable here — already in `cad/cheminformatics.py`)** — zero-cost first-pass flag via **RDKit** descriptors (Lipinski et al., *Adv Drug Deliv Rev* 1997, 23:3; Veber et al., *J Med Chem* 2002, 45:2615). *Honest limit:* coarse oral/passive-absorption thresholds; binary pass/fail, no quantitative permeability; many drugs violate them and many compliant compounds are still impermeable. Cannot substitute for Caco-2/MDCK or a cellular engagement assay.

- **pkCSM (Caco-2 + Pgp)** *(not addable — web-only)* — graph-based-signature second opinion on permeability/efflux (Pires, Blundell & Ascher, *J Med Chem* 2015, 58:4066, PMID 25860834). *Honest limit:* web-only, no batch API or redistributable model, point estimates without applicability-domain output; predicts transporter interaction, not occupancy. Manual confirmatory check only.

---

### 4. Selectivity — on-target potency says nothing about off-target liabilities

**The limit & the experiment that closes it:** Off-target binding and its functional/safety consequences are measured by biochemical panels (e.g. radioligand panels, KinomeScan) and cellular/in-vivo follow-up. Every prediction below is an *assay hypothesis*.

**Computational angle** (nominates off-targets to test):

- **Similarity Ensemble Approach (SEA)** **(addable here)** — scores a compound's aggregated chemical similarity to each target's ligand set with a BLAST-like E-value. OSS: SEA Search Server (sea.bkslab.org); reimplementable on **ChEMBL ligand sets + RDKit ECFP/Tanimoto** (Keiser et al., *Nat Biotechnol* 2007, 25:197). *Honest limit:* ligand-based — blind to orphan targets and novel chemotypes; predicts possible binding only, not affinity/selectivity/safety. In the prospective Lounkine et al. 2012 (*Nature* 486:361) test, ~half of predictions confirmed.

- **SwissTargetPrediction** **(addable here, partially)** — 2D + 3D reverse-screen vs ~376,342 actives over 3,068 targets (Daina, Michielin & Zoete, *NAR* 2019, 47:W357). *Honest limit:* web-only, no supported batch API — only a reimplemented 2D ChEMBL/RDKit reverse-screen is pipeline-wireable; degrades on novel scaffolds; outputs target probabilities, not affinity/selectivity windows.

- **PIDGIN (Random-Forest multi-target profiler)** **(addable here)** — per-target RF classifiers on 2048-bit ECFP, trained with explicit inactives, predicting activity at 100/10/1/0.1 µM across 3,698 human targets, each with an applicability-domain flag. OSS: **PIDGINv4** (GPLv3), **RDKit**, **scikit-learn** (method per Mervin et al., *J Cheminform* 2015, 7:51). *Honest limit:* coverage-bound to well-assayed targets; binary activity probability, not Ki, selectivity ratio, or toxicity.

- **Proteochemometrics (PCM)** **(addable here)** — one ML model on joint ligand + target descriptors interpolates activity/selectivity across a target family. Build from **ChEMBL + RDKit + scikit-learn/GPs** (or the `camb` R package; Cortes-Ciriano et al., *MedChemComm* 2015, 6:24, DOI 10.1039/C4MD00216D). *Honest limit:* needs a dense compound×target matrix; degrades outside the applicability domain; continuous predicted affinity, not a measured selectivity index; retrospective CV overstates prospective accuracy.

- **Reverse / cross-docking** **(addable here — uses Vina)** — docks one ligand into a panel of structures to nominate off-targets and return poses. OSS: **AutoDock Vina** (already in Provenika); historically TarFisDock/PDTD (Li et al., *NAR* 2006, 34:W219), idTarget (Wang et al., *NAR* 2012, 40:W393). *Honest limit (well-documented — Luo et al., PLoS ONE 2017, e0171433):* scores are *not* calibrated across proteins (bias toward larger/hydrophobic pockets), high false-positive rates only partly fixed by normalization; ranks poses, not affinity. Confirm biophysically.

- **Kinome-wide selectivity profiling (multitask DL)** **(addable here)** — predicts activity across hundreds of kinases at once to triage which to test. OSS-buildable from **ChEMBL kinase data + RDKit + PyTorch**; web tools KinomeMETA (*NAR* 2024), KinomePro-DL (*JCIM* 2024); benchmark Davis et al. 2011 KinomeScan (*Nat Biotechnol* 29:1046). *Reported:* internal auROC ~0.90 over 391 kinases dropping to ~0.75 on 1,410 prospectively tested pairs (Li et al., *J Med Chem* 2020, DOI 10.1021/acs.jmedchem.9b00855). *Honest limit:* struggles with close paralogs, type-II/allosteric/covalent modes, and the under-sampled dark kinome; outputs a predicted profile, not a measured panel.

---

### 5. ADMET / PK — these are in-vivo properties

**The limit & the experiment that closes it:** Absorption, distribution, metabolism, excretion, toxicity, and exposure are confirmed only by in-vitro ADME assays (Caco-2, microsomes, hERG) and then animal/clinical PK. The methods below estimate *assay-level surrogates*, not in-vivo exposure.

**Computational angle:**

- **ADMET-AI** **(addable here)** — Chemprop-RDKit D-MPNN predicting ~40 endpoints (Caco-2, HIA, BBB, PPB, Vdss, 5 CYP tasks, clearance, hERG, AMES, DILI) from SMILES; returns a percentile vs a reference drug set, slotting directly after a ChEMBL/Vina ranking. OSS: **admet-ai**, **Chemprop**, **RDKit**, **PyTDC** (Swanson et al., *Bioinformatics* 2024, 40(7):btae416). *Reported:* highest average rank on the 22-task TDC ADMET Benchmark Group leaderboard. *Honest limit:* every endpoint is a QSAR estimate of an in-vitro/physicochemical assay, not in-vivo PK — single numbers with no dose, concentration-time curve, or transporter/DDI/first-pass integration; accuracy collapses outside the applicability domain.

- **ADMETlab 3.0** **(addable here — via documented API)** — multitask ML platform with a documented API and uncertainty/decision-support output, enabling programmatic batch scoring (Fu et al., *NAR* 2024, 52(W1):W422, DOI 10.1093/nar/gkae236). *Honest limit:* proprietary QSAR models with applicability-domain limits; a remote ToS/rate-dependent service, not a vendored library; gives surrogate values, not in-vivo exposure.

- **pkCSM** *(not addable — web-only)* — ~30 ADMET endpoints via graph-based signatures (Pires et al., *J Med Chem* 2015, 58:4066, PMID 25860834; reported AMES acc 83.8% vs ToxTree 75.8%). *Honest limit:* web-only, no source/API; 2015-era training data; second-opinion estimate, not a programmatic step.

- **admetSAR 2.0 / 3.0** *(not addable — web-only)* — broad ADMET panel (v3.0: 119 endpoints + ADMETopt). Cite v2.0 as Yang H et al., *Bioinformatics* 2019, 35(6):1067 (PMID 30165565) and v3.0 as Gu Y et al., *NAR* 2024, 52(W1):W432 (DOI 10.1093/nar/gkae298). *Honest limit:* web-only, no open build/API; QSAR liability flags, no in-vivo PK.

- **PBPK modelling (PK-Sim / Open Systems Pharmacology; commercial GastroPlus, Simcyp)** *(complements, not a turnkey pipeline step)* — mechanistic whole-body ODE models that *do* simulate plasma/tissue concentration-time profiles, oral absorption, first-pass, dose scaling, and metabolic DDIs. OSS: **PK-Sim**, **MoBi**, **ospsuite-r** (GPLv2; Lippert et al., *CPT Pharmacometrics Syst Pharmacol* 2019, 8(12):878, PMID 31671256). *Honest limit:* a model you must *parameterise* from in-vitro/animal inputs (intrinsic clearance, fu, solubility, permeability) — garbage-in propagates; the ~2-fold-of-observed acceptance is a case-by-case heuristic, not a guarantee; the .NET/desktop ecosystem complements rather than plugs into a ChEMBL/RDKit/Vina pipeline, and it does not remove the need for confirmatory in-vivo PK.

---

### 6. Missing structure / bioactivity data — some holo, mutant, and assay data simply don't exist

**The limit & the experiment that closes it:** Where no experimental structure or measurement exists, only X-ray/cryo-EM/NMR (structure) and a real assay (bioactivity) create ground truth. The methods below *substitute coordinates or interpolate from existing data* — they generate no new measurement.

**Computational angle:**

- **De novo structure prediction (AlphaFold2 / ColabFold / AlphaFold DB)** **(addable here — already a fallback in `cad/fetch_structure.py`)** — predicts full-atom coordinates from sequence so site detection and docking have something to run on; the AlphaFold DB serves >200M precomputed models with per-residue pLDDT. OSS: **ColabFold**, **AlphaFold2**, **OpenFold**, AlphaFold DB (Jumper et al., *Nature* 2021, 596:583 — CASP14 median backbone 0.96 Å, domain GDT_TS 92.4; Mirdita et al., *Nat Methods* 2022, 19:679). *Honest limit:* a predicted model is a single static, ligand-free conformation, not a holo/induced-fit pocket. Karelina et al. (2023, *eLife* 89386): docking to AF2 models is no more accurate than to homology models and much worse than to experimental structures; Wong et al. (2022, *Mol Syst Biol* 18:e11081): AF2-enabled docking auROC ~0.48 (near random), ~0.63 only after ML rescoring. pLDDT is self-confidence, not pocket accuracy. Substitutes coordinates, never an experimental structure.

- **Protein-ligand co-folding (AlphaFold3 / Boltz-1/2 / Chai-1)** **(addable here — GPU)** — predicts a holo complex in one pass to seed docking. OSS: **Boltz-1/2** (MIT), **Chai-1**, **RoseTTAFold All-Atom**; AlphaFold3 (non-commercial server) (Wohlwend et al. 2024, bioRxiv 2024.11.19.624167 — Boltz-1 CASP15 LDDT-PLI ~65% vs Chai-1 ~40%, a pocket-similarity metric, not a pose-correct rate). *Honest limit:* ligand-pose accuracy lags backbone accuracy and degrades off-distribution, with confident-but-wrong/stereochemically-invalid poses; Boltz-2 affinity outputs are model estimates, not assays. A co-folded pose is a hypothesis needing experimental validation.

- **Mutant modelling via ddG predictors** **(addable here)** — estimates folding-stability change of a substitution to triage variants. OSS: **RaSP** (Blaabjerg et al. 2023, *eLife* 82593), **ThermoMPNN** (Dieckhaus et al. 2024, *PNAS* 121:e2314853121), **Rosetta cartesian_ddg**, **FoldX** (free academic binary). *Honest limit:* folding-stability ΔΔG is NOT the effect on drug binding or catalysis — many clinically important resistance mutations (e.g. gatekeeper) act by reshaping the pocket, not destabilising the fold; **re-running AlphaFold2 on the mutant sequence does NOT reliably capture missense structural impact** (Buel & Walters 2022, *Nat Struct Mol Biol* 29:1). Ranks variants; produces no validated mutant holo structure.

- **Ligand-based target / bioactivity prediction** **(addable here — `virtual_triage.py` already uses ChEMBL + RDKit ECFP4 Tanimoto)** — infers likely targets/activity by chemical similarity to compounds with known measured bioactivity. OSS: **RDKit**, **ChEMBL** models, **scikit-learn**; SwissTargetPrediction (Daina et al. 2019, *NAR* 47:W357 — 376,342 actives / 3,068 targets), SEA (Keiser et al. 2007). *Honest limit:* pure interpolation inside known chemical space — fails on novel scaffolds, returns a likelihood not a measured Ki/IC50, and re-uses existing measurements, so a genuinely sparse target stays sparse.

- **Active learning to prioritise WHICH experiments to run** **(addable here)** — ranks candidates by predicted value AND model uncertainty so the wet lab measures the most informative subset first. OSS: **modAL**, **scikit-learn**, **RDKit** (Reker & Schneider 2015, *Drug Discov. Today* 20(4):458). *Honest limit:* reduces how many experiments are needed but does not remove the wet-lab loop — every iteration still requires real measurements; generates no data itself and can be misled by activity cliffs.

---

### 7. Efficacy & safety — the clinical outcome (hardest)

**The limit & the experiment that closes it:** Whether a drug *works* and is *safe* in humans is determined only by controlled clinical trials. **No computational method predicts clinical efficacy or safety.** The methods below shift a population-level *prior probability* of program success — they are not forecasts for any molecule, dose, trial, or patient.

**Computational angle** (raises/contextualises the PRIOR only):

- **Human genetic target validation (Open Targets / Open Targets Genetics)** **(addable here — open API)** — checks whether the drug's *target gene* has human germline genetic evidence for the disease (GWAS credible sets resolved by the locus-to-gene XGBoost model, plus OMIM/ClinVar). OSS: **Open Targets Platform** (GraphQL/BigQuery), **Open Targets Genetics / Gentropy + L2G**, Ensembl/UniProt mapping. *Reported:* genetically-supported mechanisms ~2× the odds of approval (Nelson et al., *Nat Genet* 2015, ng.3314: share rose 2.0%→8.2% preclinical→approved); 2.6× relative success rising with causal-gene confidence (Minikel et al., *Nature* 2024, PMID 38632401); >2× when the causal gene is clear (King, Davis & Degner, *PLoS Genet* 2019, e1008489). *Honest limit:* shifts a population-level prior for a *target class*, not a per-molecule prediction; absence of genetic evidence is not evidence against a target; the germline GWAS/Mendelian signal **translates poorly to oncology's somatic-driver biology**; says nothing about chemistry, ADME, or formulation.

- **Open Targets target-disease association & tractability/safety scoring** **(addable here — open API)** — aggregates >20 evidence types into a weighted association score plus tractability/clinical-precedence/safety annotations (Ochoa et al., *NAR* 2021, 49(D1):D1302; next-gen *NAR* 2023, 51(D1):D1353). *Honest limit:* an evidence aggregator, not an outcome predictor; scores are heuristic weighted sums, not calibrated success probabilities, and can be inflated by literature/known-drug circularity. Informs target selection only.

- **Drug-target Mendelian randomization (MR) + phenome-wide MR** **(addable here)** — uses germline variants in/near the target gene as natural-experiment instruments to estimate the *direction* of effect of lifelong target perturbation and to scan phenotypes for on-target adverse effects. OSS: **TwoSampleMR** + **IEU OpenGWAS/MR-Base**, **MendelianRandomization** (R), **coloc/gtx** (Schmidt et al., *Nat Commun* 2020, PMC7320010; Gill et al., *Wellcome Open Res* 2021, PMC7903200; Hemani et al., *eLife* 2018, PMC5976434). *Honest limit:* proxies a small, lifelong, germline perturbation — not an acute, dose-titrated drug; gives effect *direction*, not magnitude of benefit or time-to-event efficacy; rests on untestable assumptions (no horizontal pleiotropy, correct causal gene); largely inapplicable to somatic-driver oncology. Cannot say a trial will succeed.

- **Quantitative Systems Pharmacology (QSP)** *(not constructable from ChEMBL/RDKit/Vina)* — mechanistic ODE models simulating target engagement, biomarker dynamics, exposure-response, and virtual-patient populations to support dose/design decisions under FDA's MIDD framework. OSS: **Open Systems Pharmacology (PK-Sim/MoBi)**, **SBML + libRoadRunner/Tellurium** (Bai et al., *AAPS J* 2021, 23:60, PMID 33931790). *Honest limit:* does NOT predict efficacy or safety — it optimises decisions *conditional on* a bespoke, hand-curated, heavily parameterised mechanism; FDA accepts it case-by-case (mainly dose/PK-PD) with no general efficacy endorsement.

- **Empirical clinical probability-of-success base rates** **(addable here — published tables)** — the realistic denominator any genetic-support multiplier is applied to. Wong, Siah & Lo, *Biostatistics* 2019, 20(2):273 (PMID 29394327; 185,994 trials / 21,143 compounds, 2000–2015): overall Phase-I-to-approval PoS ≈ 13.8%, **oncology far lower (~3.4% in-sample)**. *Honest limit:* retrospective population averages, not individual-program forecasts. Multiplying a base rate by a genetic-support factor yields a rough prior — report it as "*still very unlikely, modestly de-risked,*" never as expected efficacy.

