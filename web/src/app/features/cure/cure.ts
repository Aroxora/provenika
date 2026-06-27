import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface AiSave { method: string; saves: string; cite: string; }
interface Pillar {
  n: string;
  title: string;
  proven: string;
  ai: AiSave[];
  irreducible: string;
  terminal?: boolean;
}

@Component({
  selector: 'app-cure',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">Literature-verified · cross-checked (Tavily + DeepSeek-v4) · real, no hallucination</div>
      <h1>How cancer is actually being cured —<br><span class="accent">and how AI saves the experiment.</span></h1>
      <p class="lead">
        There is no single cure. "Cancer" is hundreds of diseases, and progress is the sum of five
        levers below. Each section is <strong>first how it actually cures</strong> (what is proven in
        people), <strong>then how AI — especially AlphaFold-style structure prediction — saves
        experimentation</strong>, and finally the part that is <strong>irreducibly experimental</strong>.
        Every claim is corroborated across independent sources; investigational work is labelled.
      </p>
      <p class="thesis">
        AI compresses the cheap, in-silico <em>front</em> — structures, candidate selection,
        who-to-screen — so <strong>fewer experiments are run and fewer dead-end molecules get made.</strong>
        It never runs the experiment that proves a person is protected, a tumour shrinks, or a therapy
        is safe.
      </p>
    </section>

    @for (p of pillars; track p.title) {
      <section class="pillar" [class.terminal]="p.terminal">
        <div class="phead"><span class="pn">{{ p.n }}</span><h2>{{ p.title }}</h2></div>

        <div class="block proven">
          <h3>How it actually cures</h3>
          <p>{{ p.proven }}</p>
        </div>

        <div class="block ai">
          <h3>How AI saves the experiment</h3>
          @if (p.ai.length) {
            <ul>
              @for (m of p.ai; track m.method) {
                <li><strong>{{ m.method }}</strong> — {{ m.saves }} <span class="cite">{{ m.cite }}</span></li>
              }
            </ul>
          } @else {
            <p class="muted">Minimal here — the proven wins are biology, behaviour, and policy, not algorithms.</p>
          }
        </div>

        <div class="block irr">
          <h3>Still irreducibly experimental</h3>
          <p>{{ p.irreducible }}</p>
        </div>
      </section>
    }

    <section class="payoff">
      <h2>The honest payoff</h2>
      <p>
        <strong>AI gets to the cure with fewer experiments — it does not get there without them.</strong>
        AlphaFold-style prediction is the clearest win: it replaces <em>some</em> structural biology and
        front-loads design. But the cure is still built by the immunised person, the removed precancer,
        the synthesised-and-assayed molecule, the animal, and the trial — in oncology only
        <strong>~3.4%</strong> of programs entering Phase&nbsp;I are approved
        <span class="muted">(Wong, Siah &amp; Lo, <em>Biostatistics</em> 2019)</span>, at ~$2.6B and
        10–15 years each <span class="muted">(DiMasi et al. 2016)</span>.
      </p>
      <div class="cta-row">
        <a routerLink="/explore" class="btn primary large">Explore the in-silico front →</a>
        <a routerLink="/bench" class="btn ghost large">Take it to the bench →</a>
      </div>
      <p class="disc muted">Research only. Not medical advice, not a treatment recommendation, not a diagnosis.</p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.8rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.2rem; line-height:1.1; margin-bottom:.55rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:74ch; color:var(--text-dim); margin-bottom:.8rem; }
    .thesis { font-size:1rem; max-width:74ch; border-left:3px solid var(--accent); padding-left:.9rem; }

    .pillar { max-width:880px; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:1rem 1.1rem; margin-bottom:1rem; }
    .pillar.terminal { border-color:#3a1a22; background:linear-gradient(180deg,var(--bg-elev),#190f12); }
    .phead { display:flex; align-items:center; gap:.6rem; margin-bottom:.6rem; }
    .pn { display:grid; place-items:center; width:1.9rem; height:1.9rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--text-dim); }
    .phead h2 { margin:0; font-size:1.3rem; }
    .block { margin-bottom:.6rem; }
    .block h3 { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; margin:0 0 .3rem;
      padding-left:.5rem; border-left:3px solid #24344a; }
    .block.proven h3 { border-color:#1f456e; color:#6fb6ff; }
    .block.ai h3 { border-color:#1f5e44; color:var(--accent); }
    .block.irr h3 { border-color:#5e431f; color:#f0a868; }
    .block p, .block li { font-size:.92rem; line-height:1.5; color:var(--text); }
    .block ul { margin:.2rem 0 0; padding-left:1.1rem; } .block li { margin-bottom:.35rem; }
    .cite { color:var(--text-dim); font-size:.82rem; }

    .payoff { max-width:880px; margin-top:1.4rem; }
    .payoff h2 { font-size:1.3rem; } .payoff > p { font-size:1.02rem; line-height:1.55; max-width:78ch; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; margin:.9rem 0 .5rem; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }
    .disc { font-size:.82rem; }
  `]
})
export class Cure {
  readonly pillars: Pillar[] = [
    {
      n: '1', title: 'Prevention — the most decisively curative lever',
      proven: 'Stopping a cancer from ever occurring beats any treatment. The HPV vaccine cut cervical-cancer incidence ~87% in England\'s earliest-vaccinated cohort (Falcaro, Lancet 2021) and ~88% in Sweden when given before 17 (Lei, NEJM 2020); the HBV vaccine sharply cut childhood liver cancer in Taiwan (Chang, NEJM 1997); tobacco control is the single largest preventable cause of cancer death; and chemoprevention is guideline-backed — tamoxifen ~50% for high-risk breast cancer, aspirin ~60% in Lynch syndrome (CAPP2, Burn, Lancet 2020).',
      ai: [
        { method: 'Image-based risk models', saves: 'sharpen who to screen and who can be screened less, cutting needless imaging and biopsies', cite: '(Mirai, Sci Transl Med 2021; Sybil, JCO 2023; AVE cervix triage)' },
      ],
      irreducible: 'Immunogenicity, durability and safety are measured only in people over years; manufacturing and delivery are wet-lab + logistics; and the biggest lever — tobacco, behaviour, and uptake — is policy, which no model executes. AlphaFold has no proven prevention role yet (the approved vaccines predate it).',
    },
    {
      n: '2', title: 'Early detection — the biggest survival lever',
      proven: 'Stage at diagnosis dominates survival, and AI is FDA-authorised here today: Paige Prostate (first FDA AI pathology, 2021), GI Genius (real-time colonoscopy polyp detection, 2021), and AI-supported mammography (the randomised MASAI trial, Lång, Lancet Oncology 2023, found more cancers at roughly half the reading workload). Liquid biopsy / multi-cancer detection (e.g. Galleri) is investigational.',
      ai: [
        { method: 'Reads the scan or slide already being taken', saves: 'cuts misses and reader workload and triages where no pathologist is available — no new test required', cite: '(Paige, GI Genius, MASAI)' },
      ],
      irreducible: 'You still physically image or sample a living body; a pathologist confirms; a clinician removes the precancer; and only prospective trials prove a mortality benefit.',
    },
    {
      n: '3', title: 'Precision targeted therapy — where AlphaFold saves the most',
      proven: 'Matching a drug to a tumour\'s driver — EGFR, BTK, BRAF, KRAS G12C — is the daily work of oncology drug discovery, where Provenika operates.',
      ai: [
        { method: 'AlphaFold2/3 structure prediction', saves: 'gives a usable 3-D model from sequence (CASP14 median GDT-TS 92.4) and a 200M-model database — replacing some of the crystallography needed just to start design', cite: '(Jumper, Nature 2021; Abramson, Nature 2024)' },
        { method: 'Free-energy perturbation (FEP)', saves: 'ranks which of thousands of analogues are worth synthesising, to ~1 kcal/mol on a congeneric series', cite: '(Wang, JACS 2015)' },
        { method: 'Generative de-novo design', saves: 'proposes novel candidate molecules / binders to test', cite: '(RFdiffusion, Nature 2023; REINVENT)' },
      ],
      irreducible: 'A predicted structure is not a holo, induced-fit pocket — docking into AlphaFold models is materially worse than into experimental structures (Karelina, eLife 2023); FEP is relative and force-field-capped; and every candidate must still be synthesised and assayed — a Kd is measured, never computed to decision grade.',
    },
    {
      n: '4', title: 'Immunotherapy — turning the immune system on the tumour',
      proven: 'Checkpoint inhibitors and CAR-T (Kymriah, the first FDA-approved CAR-T, 2017) already cure some blood cancers. Personalised neoantigen mRNA vaccines are investigational but striking: mRNA-4157 (V940) + pembrolizumab cut melanoma recurrence ~49% vs pembrolizumab alone (KEYNOTE-942 Phase 2b; Moderna/Merck).',
      ai: [
        { method: 'Neoantigen prediction (peptide–MHC binding)', saves: 'pre-filters which of a patient\'s mutations are worth putting in a personalised vaccine — collapsing a vast experimental search', cite: '(NetMHCpan-4.1, NAR 2020)' },
        { method: 'AlphaFold / RFdiffusion for TCR–pMHC & antibody/binder design', saves: 'models immune-complex structures and designs binders in silico before lab synthesis', cite: '(AlphaFold-Multimer; RFdiffusion, Nature 2023)' },
      ],
      irreducible: 'The actual immune response, manufacturing each personalised product, and the trial that proves benefit.',
    },
    {
      n: '5', title: 'Resistance & combinations — staying ahead of evolution',
      proven: 'Cancers relapse via resistance mutations — EGFR T790M, answered by the third-generation inhibitor osimertinib (then C797S); KRAS allele switching. Combinations and sequencing extend control.',
      ai: [
        { method: 'Predict resistance mutations + model the mutant', saves: 'lets chemists design the next-generation inhibitor before the clinic needs it', cite: '(AlphaFold / stability-ΔΔG predictors)' },
      ],
      irreducible: 'Folding-stability ΔΔG is not the effect on drug binding (many resistance mutations reshape the pocket, not the fold); somatic evolution is read out in patients; and each next-gen drug still runs the entire pipeline.',
    },
    {
      n: '6', title: 'Translation & access — the irreducible clinic',
      proven: 'Biomarker-guided trials and patient stratification get the right drug to the right patient.',
      ai: [
        { method: 'Biomarker discovery & trial-patient matching', saves: 'shrinks the search for who benefits and speeds enrolment', cite: '' },
      ],
      irreducible: 'Efficacy and safety are settled only by Phase 1–3 clinical trials — in oncology only ~3.4% of programs entering Phase I are approved (Wong 2019), at ~$2.6B and 10–15 years each (DiMasi 2016). Approval, manufacturing, and equitable delivery are human, clinical, and economic — no model removes them.',
      terminal: true,
    },
  ];
}
