import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';

interface Gap { limit: string; ai: string; need: string; }
interface Stage { n: number; stage: string; exp: string; ai: string; aiCan: boolean; }

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <!-- ============ LEAD ============ -->
    <section class="lead">
      <div class="badge">Literature-verified · No hallucination · Public data only</div>
      <h1>AI can design the hypothesis.<br><span class="accent">Curing cancer needs everything that follows.</span></h1>
      <p class="sub">
        Provenika is honest about exactly <strong>how much</strong> of cancer-drug discovery AI and
        compute can do — and the <strong>experimental and clinical path</strong> that must follow,
        which no model replaces. AI gets you to a better hypothesis, faster and cheaper. <em>It does not
        get you to a cure.</em>
      </p>
      <div class="cta-row">
        <a routerLink="/explore" class="btn primary large">Explore a target →</a>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener" class="btn ghost large">The cited breakdown ↗</a>
      </div>
      <div class="quick">
        <span class="muted">Jump in:</span>
        <a class="quick-link" (click)="goExplore('EGFR')">EGFR</a>
        <a class="quick-link" (click)="goExplore('BTK')">BTK</a>
        <a class="quick-link" (click)="goExplore('KRAS G12C')">KRAS G12C</a>
        <a class="quick-link" (click)="goExplore('BRAF')">BRAF</a>
      </div>
    </section>

    <!-- ============ PART 1 — WHAT AI CAN DO ============ -->
    <section class="part">
      <div class="part-head"><span class="num good">1</span><h2>What AI &amp; compute can do</h2></div>
      <p class="muted lede">The cheap, in-silico <strong>front</strong> of discovery: rank, prioritise, and
        de-risk what to make and test. Every method below is fact-checked against the literature — real
        tool, real citation, real accuracy, honest limit. None replaces an experiment; each narrows one.</p>
      <div class="gap-grid">
        @for (g of gaps; track g.limit) {
          <div class="gap">
            <h3>{{ g.limit }}</h3>
            <div class="row"><span class="tag good">AI can</span><span>{{ g.ai }}</span></div>
            <div class="row"><span class="tag warn">Still needs</span><span>{{ g.need }}</span></div>
          </div>
        }
      </div>
    </section>

    <!-- ============ PART 2 — WHAT MUST FOLLOW FOR AN ACTUAL CURE ============ -->
    <section class="part">
      <div class="part-head"><span class="num warn">2</span><h2>What must follow — the path to an actual cure</h2></div>
      <p class="muted lede">Every stage below is an <strong>experiment</strong>. AI can front-load and
        de-risk the early ones; the validation, and the entire back half, are irreducibly wet-lab,
        animal, and human. This is the gap between a computational hit and a medicine.</p>
      <ol class="path">
        @for (s of cure; track s.n) {
          <li [class.no-ai]="!s.aiCan">
            <div class="step-n">{{ s.n }}</div>
            <div class="step-body">
              <h3>{{ s.stage }}</h3>
              <div class="row"><span class="tag warn">Experiment required</span><span>{{ s.exp }}</span></div>
              <div class="row">
                <span class="tag" [class.good]="s.aiCan" [class.dead]="!s.aiCan">{{ s.aiCan ? 'AI helps' : 'AI cannot' }}</span>
                <span>{{ s.ai }}</span>
              </div>
            </div>
          </li>
        }
      </ol>
      <p class="blunt">
        Across 2000–2015, ~13.8% of drugs entering Phase&nbsp;I were approved — and in oncology,
        only <strong>~3.4%</strong> <span class="muted">(Wong, Siah &amp; Lo, <em>Biostatistics</em> 2019)</span>.
        At ~$2.6B and 10–15 years per approved drug <span class="muted">(DiMasi et al. 2016)</span>, the
        cost of a cure is overwhelmingly the experiment. That is the part no AI removes — only accelerates
        the front of.
      </p>
    </section>

    <!-- ============ PROOF ============ -->
    <div class="proof-grid">
      <div class="card proof">
        <div class="icon">🔎</div><h3>Live from the source</h3>
        <p class="muted">Dossiers, ligand data, and structures are pulled on demand from ChEMBL, UniProt, and RCSB PDB. No cached lies.</p>
        <a routerLink="/explore">Try the explorer</a>
      </div>
      <div class="card proof">
        <div class="icon">✓</div><h3>Verifiable by anyone</h3>
        <p class="muted">Run <code class="mono">python3 cad/verify.py --target EGFR</code> — it re-fetches every figure from its public URL with a PASS/DRIFT/FAIL.</p>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">View source ↗</a>
      </div>
      <div class="card proof">
        <div class="icon">🧬</div><h3>Docking, actually run</h3>
        <p class="muted">The full pipeline — incl. AutoDock Vina docking — runs on AWS; the redocking benchmark scores 52.6% / 1.90&nbsp;Å median, re-derivable offline.</p>
        <a routerLink="/explore">See a structure-aware shortlist</a>
      </div>
    </div>

    <p class="final-note muted">
      Research / decision-support only. <strong>Not for patient care</strong>, diagnosis, or treatment.
      A computational hit is a hypothesis for the wet lab — never evidence a therapy works.
    </p>
  `,
  styles: [`
    .lead { max-width: 820px; margin-bottom: 2.2rem; }
    .badge { display:inline-block; font-size:.78rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    .lead h1 { font-size:2.3rem; line-height:1.08; margin-bottom:.5rem; }
    .accent { color:var(--accent); }
    .sub { font-size:1.1rem; max-width:64ch; color:var(--text-dim); margin-bottom:1.1rem; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; margin-bottom:.6rem; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }
    .quick { font-size:.9rem; }
    .quick-link { margin-left:.35rem; cursor:pointer; } .quick-link:hover { text-decoration:underline; }

    .part { margin: 2.2rem 0; max-width: 960px; }
    .part-head { display:flex; align-items:center; gap:.6rem; margin-bottom:.3rem; }
    .part-head h2 { margin:0; font-size:1.5rem; }
    .num { display:grid; place-items:center; width:1.7rem; height:1.7rem; border-radius:50%; font-weight:700; font-size:.95rem; }
    .num.good { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .num.warn { background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .lede { max-width:74ch; margin-bottom:1rem; }

    .gap-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:.7rem; }
    .gap { background:var(--bg-elev); border:1px solid #1c2738; border-radius:10px; padding:.7rem .85rem; }
    .gap h3 { margin:0 0 .45rem; font-size:1rem; }

    .row { display:flex; gap:.5rem; align-items:flex-start; font-size:.86rem; line-height:1.35; margin-bottom:.35rem; }
    .row span:last-child { color:var(--text-dim); }
    .tag { flex:none; font-size:.64rem; font-weight:600; letter-spacing:.03em; text-transform:uppercase;
      padding:.12rem .4rem; border-radius:5px; margin-top:.05rem; white-space:nowrap; }
    .tag.good { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .tag.warn { background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .tag.dead { background:#2a1416; color:#e0788a; border:1px solid #5e1f2a; }

    .path { list-style:none; padding:0; margin:0; display:grid; gap:.6rem; }
    .path li { display:flex; gap:.8rem; background:var(--bg-elev); border:1px solid #1c2738; border-radius:10px; padding:.7rem .85rem; }
    .path li.no-ai { border-color:#3a1a22; background:linear-gradient(180deg,var(--bg-elev),#1a0f12); }
    .step-n { flex:none; display:grid; place-items:center; width:1.9rem; height:1.9rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--text-dim); }
    .step-body { flex:1; } .step-body h3 { margin:0 0 .4rem; font-size:1rem; }

    .blunt { max-width:74ch; font-size:.95rem; line-height:1.5; margin-top:1.1rem;
      border-left:3px solid #5e431f; padding-left:.9rem; color:var(--text); }

    .proof-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin:1.8rem 0 1.6rem; }
    .proof { display:flex; flex-direction:column; } .proof .icon { font-size:1.4rem; }
    .proof h3 { margin:.15rem 0 .25rem; } .proof p { flex:1; margin-bottom:.4rem; } .proof a { font-size:.9rem; }
    .final-note { max-width:74ch; font-size:.82rem; margin-top:1.2rem; }
  `]
})
export class Landing {
  private router = inject(Router);
  private store = inject(TargetStore);

  readonly gaps: Gap[] = [
    { limit: 'Binding affinity', ai: 'FEP/TI free-energy on a congeneric series; gnina / RTMScore pose rescoring', need: 'SPR / ITC / enzyme IC50 — a measured Kd' },
    { limit: 'Synthesis', ai: 'Retrosynthesis routes (AiZynthFinder, ASKCOS) + synthesizability scores', need: 'A chemist actually making the molecule' },
    { limit: 'Cell engagement', ai: 'Permeability / efflux liability flags (ADMET-AI, BOILED-Egg)', need: 'CETSA / NanoBRET in-cell target-engagement assay' },
    { limit: 'Selectivity', ai: 'Off-target nominations (SEA, PIDGIN, reverse-docking, kinome ML)', need: 'KinomeScan / radioligand safety panels' },
    { limit: 'ADMET / PK', ai: 'QSAR endpoint estimates (ADMET-AI, ADMETlab); PBPK if parameterised', need: 'In-vitro ADME (Caco-2, microsomes, hERG) + animal PK' },
    { limit: 'Missing structure / data', ai: 'Predicted structures & co-folds (AlphaFold2/3, Boltz, Chai)', need: 'X-ray / cryo-EM + new bioactivity measurement' },
  ];

  readonly cure: Stage[] = [
    { n: 1, stage: 'Confirm it binds', exp: 'Biophysical / biochemical assay (SPR, ITC, enzyme IC50)', ai: 'FEP/TI free-energy + ML rescoring rank which analog to test', aiCan: true },
    { n: 2, stage: 'Make the molecule', exp: 'Medicinal-chemistry synthesis at the bench', ai: 'Retrosynthesis (AiZynthFinder / ASKCOS) proposes routes — a chemist still executes them', aiCan: true },
    { n: 3, stage: 'Engage the target inside a cell', exp: 'Cell assays — CETSA / NanoBRET engagement, viability', ai: 'Permeability / efflux ML flags liabilities only', aiCan: true },
    { n: 4, stage: 'Prove selectivity & off-target safety', exp: 'Profiling panels (KinomeScan, radioligand, safety pharmacology)', ai: 'Nominates off-targets to test; cannot measure them', aiCan: true },
    { n: 5, stage: 'ADMET & exposure', exp: 'In-vitro ADME (microsomes, hERG) + animal PK / tox', ai: 'QSAR + PBPK estimate surrogates, not in-vivo exposure', aiCan: true },
    { n: 6, stage: 'Show efficacy in vivo', exp: 'Animal tumour models', ai: 'Almost nothing — human genetic validation only shifts the population prior (~2×)', aiCan: false },
    { n: 7, stage: 'Prove it works & is safe in humans', exp: 'Phase 1–3 clinical trials', ai: 'No method predicts clinical efficacy — ~3.4% of oncology trials succeed', aiCan: false },
    { n: 8, stage: 'Approval, manufacturing & access', exp: 'Regulatory review, scale-up, and delivery to patients', ai: 'Out of scope — this is the clinic, industry, and the health system', aiCan: false },
  ];

  goExplore(t: string) {
    this.store.set(t);
    this.router.navigate(['/explore'], { queryParams: { t } });
  }
}
