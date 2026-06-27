import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Partner { name: string; url: string; what: string; free?: boolean; }
interface Step { n: string; title: string; question: string; assay: string; partners: Partner[]; }

@Component({
  selector: 'app-bench',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">The bridge from hypothesis to bench · real labs, verified</div>
      <h1>You have a cited hypothesis.<br><span class="accent">Here's how to test it — and who can.</span></h1>
      <p class="lead">
        Provenika ends at a ranked, re-verifiable <em>hypothesis</em> — public ChEMBL bioactivity
        re-ranked by structure-aware docking. That is not a validated hit; only the wet lab proves it.
        Below is the exact, ordered chain of experiments that would test a candidate, and the real
        labs, CROs, and <strong>free programs</strong> that run each step. The pipeline can emit a
        ready-to-send package (candidates, poses, provenance) per target.
      </p>
      <p class="how muted">
        Generate one for any run: <code class="mono">python3 cad/validation_package.py --run runs/egfr</code>
        — it writes a cited validation request + a draft pitch (it sends nothing; you decide who to contact).
      </p>
    </section>

    @for (s of steps; track s.title) {
      <section class="step">
        <div class="shead"><span class="sn">{{ s.n }}</span><h2>{{ s.title }}</h2></div>
        <p class="q"><strong>Question:</strong> {{ s.question }}</p>
        <p class="a"><strong>Assay:</strong> {{ s.assay }}</p>
        <div class="partners">
          @for (p of s.partners; track p.name) {
            <a class="partner" [href]="p.url" target="_blank" rel="noopener">
              <span class="pname">{{ p.name }} @if (p.free) { <span class="free">FREE</span> }</span>
              <span class="pwhat muted">{{ p.what }}</span>
            </a>
          }
        </div>
      </section>
    }

    <section class="cta">
      <h2>Request validation</h2>
      <p>
        Have a target or a candidate set you want tested? The honest ask is small and concrete: a
        biochemical IC50 to confirm binding, then a selectivity panel. Every figure is traceable and
        re-checkable — the SMILES, docking poses, and provenance manifest travel with the request.
      </p>
      <div class="cta-row">
        <a [href]="mailto" class="btn primary large">Email to start a validation →</a>
        <a routerLink="/explore" class="btn ghost large">Build a shortlist first</a>
      </div>
      <p class="disc muted">
        Provenika hands off a hypothesis; the lab decides what to test. Research only — not medical
        advice, not a treatment recommendation. ΔG is a predicted ranking aid, never a measured affinity.
      </p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:74ch; color:var(--text-dim); margin-bottom:.7rem; }
    .how { font-size:.9rem; max-width:74ch; }
    .mono { font-family: var(--mono); background:#0f1722; padding:.1rem .35rem; border-radius:5px; }

    .step { max-width:880px; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:.9rem 1.05rem; margin-bottom:.8rem; }
    .shead { display:flex; align-items:center; gap:.6rem; margin-bottom:.5rem; }
    .sn { display:grid; place-items:center; width:1.8rem; height:1.8rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--accent); }
    .shead h2 { margin:0; font-size:1.2rem; }
    .q, .a { font-size:.92rem; line-height:1.45; margin:.15rem 0; }
    .partners { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.5rem; margin-top:.55rem; }
    .partner { display:flex; flex-direction:column; gap:.1rem; padding:.5rem .65rem; border:1px solid #24344a;
      border-radius:8px; text-decoration:none; background:#0f1722; }
    .partner:hover { border-color:var(--accent); }
    .pname { font-weight:600; font-size:.9rem; color:var(--text); }
    .pwhat { font-size:.8rem; }
    .free { font-size:.6rem; font-weight:700; letter-spacing:.04em; padding:.06rem .3rem; border-radius:4px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; vertical-align:middle; }

    .cta { max-width:880px; margin-top:1.3rem; }
    .cta h2 { font-size:1.3rem; } .cta > p { max-width:78ch; line-height:1.5; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; margin:.9rem 0 .5rem; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }
    .disc { font-size:.82rem; max-width:74ch; }
  `]
})
export class Bench {
  readonly mailto = 'mailto:bo@shang.software?subject=Provenika%20%E2%80%94%20experimental%20validation%20collaboration&body=Target%20or%20candidate%20set%3A%20%0AAssay%20of%20interest%20(binding%20IC50%2C%20selectivity%2C%20cell)%3A%20';

  readonly steps: Step[] = [
    {
      n: '1', title: 'Confirm it binds',
      question: 'Does the prioritized compound actually bind the target, and how tightly?',
      assay: 'Biochemical potency (enzyme IC50/Ki) + a biophysical binding readout (SPR/ITC) vs the purified target.',
      partners: [
        { name: 'Reaction Biology', url: 'https://www.reactionbiology.com', what: 'biochemical enzyme IC50/Ki + binding profiling' },
        { name: 'Eurofins Discovery', url: 'https://www.eurofinsdiscovery.com', what: 'enzyme & biophysical binding assays, custom IC50' },
      ],
    },
    {
      n: '2', title: 'Prove selectivity',
      question: 'Is it selective, or a promiscuous binder — a primary oncology liability?',
      assay: 'An off-target / kinome selectivity panel on the top candidates.',
      partners: [
        { name: 'Eurofins DiscoverX KINOMEscan', url: 'https://www.eurofinsdiscovery.com', what: 'kinome-wide selectivity (competitive binding)' },
        { name: 'Reaction Biology kinase panels', url: 'https://www.reactionbiology.com', what: 'large biochemical kinase selectivity panels' },
      ],
    },
    {
      n: '3', title: 'Engage the target in a cell',
      question: 'Does it cross into cells, hit the target in situ, and kill the cancer cell?',
      assay: 'Cellular target-engagement (CETSA/NanoBRET) + viability in relevant tumour lines; NCI-60 for breadth.',
      partners: [
        { name: 'NCI Developmental Therapeutics Program', url: 'https://dtp.cancer.gov', what: '60-human-tumour-cell-line screening for qualifying compounds', free: true },
        { name: 'Charles River / WuXi AppTec', url: 'https://www.criver.com', what: 'cellular potency, viability, target-engagement assays' },
      ],
    },
    {
      n: '4', title: 'Establish ADMET / PK',
      question: 'Is it developable and safe enough to advance?',
      assay: 'In-vitro ADME (microsomes, hERG, Caco-2) and, if it advances, animal PK/tox.',
      partners: [
        { name: 'Charles River Laboratories', url: 'https://www.criver.com', what: 'in-vitro ADME (microsomes, hERG, Caco-2) and PK' },
        { name: 'Structural Genomics Consortium (SGC)', url: 'https://www.thesgc.org', what: 'open chemical-probe & target-validation collaborations', free: true },
      ],
    },
  ];
}
