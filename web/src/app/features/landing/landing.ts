import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';

interface Pillar {
  n: string;
  title: string;
  proven: string;
  ai: string;
  irreducible: string;
  link?: { to: string; label: string };
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <section class="lead">
      <div class="badge">Literature-verified · cross-checked (Tavily + DeepSeek) · public data</div>
      <h1>How cancer is actually being cured —<br><span class="accent">and where AI saves the experiment.</span></h1>
      <p class="sub">
        There is no single cure. Cancer is hundreds of diseases, and progress is the sum of five levers:
        <strong>prevent it · find it earlier · hit it precisely · turn the immune system on it · stay
        ahead of resistance.</strong> AI — most clearly <strong>AlphaFold-style structure prediction</strong>
        — compresses the cheap, in-silico <em>front</em> of each, so fewer experiments are run and fewer
        dead-end molecules get made. It never runs the experiment that proves a person is protected, a
        tumour shrinks, or a therapy is safe.
      </p>
      <div class="cta-row">
        <a routerLink="/cure" class="btn primary large">How cancer is cured →</a>
        <a routerLink="/explore" class="btn ghost large">Explore a target</a>
      </div>
    </section>

    <section class="pillars">
      @for (p of pillars; track p.title) {
        <div class="pillar" [class.terminal]="p.n === '6'">
          <div class="phead"><span class="pn">{{ p.n }}</span><h3>{{ p.title }}</h3></div>
          <div class="prow"><span class="tag proven">Proven</span><span>{{ p.proven }}</span></div>
          <div class="prow"><span class="tag good">AI saves the experiment</span><span>{{ p.ai }}</span></div>
          <div class="prow"><span class="tag warn">Irreducibly experimental</span><span>{{ p.irreducible }}</span></div>
          @if (p.link) {
            <a class="pillar-link" [routerLink]="p.link.to">{{ p.link.label }}</a>
          }
        </div>
      }
    </section>

    <p class="payoff">
      The honest payoff: <strong>AI gets to the cure with fewer experiments — it does not get there
      without them.</strong> AlphaFold-style prediction is the clearest win: it replaces <em>some</em>
      structural biology and front-loads design. But the cure is still built by the immunised person,
      the removed precancer, the synthesised-and-assayed molecule, the animal, and the trial — in
      oncology only <strong>~3.4%</strong> of programs entering Phase&nbsp;I are approved
      <span class="muted">(Wong, Siah &amp; Lo, <em>Biostatistics</em> 2019)</span>.
    </p>

    <div class="proof-grid">
      <div class="card proof"><div class="icon">🔎</div><h3>Live from the source</h3>
        <p class="muted">Dossiers, ligands, and structures pulled on demand from ChEMBL, UniProt, RCSB PDB. No cached lies.</p>
        <a routerLink="/explore">Try the explorer</a></div>
      <div class="card proof"><div class="icon">✓</div><h3>Verifiable by anyone</h3>
        <p class="muted">Run <code class="mono">python3 cad/verify.py --target EGFR</code> — every figure re-fetched from its public URL, PASS/DRIFT/FAIL.</p>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">View source ↗</a></div>
      <div class="card proof"><div class="icon">🧬</div><h3>Docking, actually run</h3>
        <p class="muted">Full pipeline incl. AutoDock Vina runs on AWS; redocking benchmark 52.6% / 1.90&nbsp;Å median, re-derivable offline.</p>
        <a routerLink="/explore">See a structure-aware shortlist</a></div>
    </div>

    <p class="final-note muted">
      Research / decision-support only. <strong>Not for patient care</strong>, diagnosis, or treatment.
      A computational hit is a hypothesis for the wet lab — never evidence a therapy works.
    </p>
  `,
  styles: [`
    .lead { max-width: 880px; margin-bottom: 1.8rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    .lead h1 { font-size:2.25rem; line-height:1.1; margin-bottom:.5rem; }
    .accent { color:var(--accent); }
    .sub { font-size:1.06rem; max-width:72ch; color:var(--text-dim); margin-bottom:1.1rem; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }

    .pillars { display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:.8rem; margin-bottom:1.3rem; }
    .pillar { background:var(--bg-elev); border:1px solid #1c2738; border-radius:11px; padding:.85rem .95rem; }
    .pillar.terminal { border-color:#3a1a22; background:linear-gradient(180deg,var(--bg-elev),#1a0f12); }
    .phead { display:flex; align-items:center; gap:.55rem; margin-bottom:.55rem; }
    .pn { display:grid; place-items:center; width:1.7rem; height:1.7rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--text-dim); }
    .phead h3 { margin:0; font-size:1.05rem; }
    .prow { display:flex; gap:.5rem; align-items:flex-start; font-size:.85rem; line-height:1.4; margin-bottom:.4rem; }
    .prow span:last-child { color:var(--text-dim); }
    .tag { flex:none; font-size:.62rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase;
      padding:.13rem .42rem; border-radius:5px; margin-top:.1rem; white-space:nowrap; }
    .tag.proven { background:#10202c; color:#6fb6ff; border:1px solid #1f456e; }
    .tag.good { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .tag.warn { background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .pillar-link { display:inline-block; margin-top:.2rem; font-size:.82rem; font-weight:600; color:var(--accent);
      text-decoration:none; border-bottom:1px solid transparent; } .pillar-link:hover { border-bottom-color:var(--accent); }

    .payoff { max-width:78ch; font-size:1rem; line-height:1.55; margin:0 0 1.6rem;
      border-left:3px solid var(--accent); padding-left:.95rem; }

    .proof-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin-bottom:1.4rem; }
    .proof { display:flex; flex-direction:column; } .proof .icon { font-size:1.4rem; }
    .proof h3 { margin:.15rem 0 .25rem; } .proof p { flex:1; margin-bottom:.4rem; } .proof a { font-size:.9rem; }
    .final-note { max-width:74ch; font-size:.82rem; }
  `]
})
export class Landing {
  private router = inject(Router);
  private store = inject(TargetStore);

  readonly pillars: Pillar[] = [
    { n: '1', title: 'Prevention', proven: 'HPV vaccine → 87% lower cervical cancer (Falcaro, Lancet 2021); HBV → liver cancer; aspirin → ~60% in Lynch (CAPP2).', ai: 'Risk models (Mirai, Sybil, AVE) sharpen who to screen — fewer needless scans & biopsies.', irreducible: 'Immunity & safety proven in people over years; behaviour and policy change the rest.' },
    { n: '2', title: 'Early detection', proven: 'FDA-cleared AI today: Paige Prostate, GI Genius (colonoscopy), AI mammography (MASAI trial).', ai: 'Reads the scan or slide already being taken — cuts misses and reader workload.', irreducible: 'You still image or sample a living body; mortality benefit needs prospective trials.' },
    { n: '3', title: 'Precision targeted therapy', proven: 'EGFR / BTK / BRAF / KRAS-G12C inhibitors matched to a tumour driver.', ai: 'AlphaFold2/3 structures (CASP14 GDT 92.4) replace some crystallography; FEP ranks which analog to synthesise.', irreducible: 'Predicted ≠ holo pocket; every candidate is still synthesised and assayed — a Kd is measured.' },
    { n: '4', title: 'Immunotherapy', proven: 'Checkpoint inhibitors; CAR-T (Kymriah, 2017); mRNA neoantigen vaccine −49% melanoma recurrence (KEYNOTE-942, investigational).', ai: 'Neoantigen prediction (NetMHCpan) pre-filters which mutations go in the vaccine.', irreducible: 'The immune response, per-patient manufacturing, and the trial.' },
    { n: '5', title: 'Resistance & combinations', proven: 'EGFR T790M answered by osimertinib; combinations extend control.', ai: 'Predict resistance mutations and model the mutant to design the next-gen inhibitor early.', irreducible: 'Folding ΔΔG ≠ binding effect; somatic evolution is read out in patients.', link: { to: '/resistance', label: 'See the per-target resistance landscape — the specific gap a next-gen molecule must cover →' } },
    { n: '6', title: 'Translation & access', proven: 'Biomarker-guided trials and patient stratification.', ai: 'Biomarker discovery and trial-patient matching shrink the search for who benefits.', irreducible: 'Efficacy & safety only in Phase 1–3 trials (~3.4% oncology PoS); approval, manufacturing, access.' },
  ];

  goExplore(t: string) {
    this.store.set(t);
    this.router.navigate(['/explore'], { queryParams: { t } });
  }
}
