import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Stat {
  figure: string;
  label: string;
  sub: string;
  href: string;      // every figure links to where it can be re-checked
  internal: boolean; // routerLink vs external repo link
}

const REPO = 'https://github.com/Aroxora/provenika/blob/main';

@Component({
  selector: 'app-impact',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">Every figure here links to its source · re-checkable with cad/verify.py</div>
      <h1>What this actually does —<br><span class="accent">real, and re-provable.</span></h1>
      <p class="lead">
        Provenika replaces the cheap, in-silico <em>front</em> of oncology drug discovery so fewer
        experiments are wasted — target triage to docking setup, every number fetched-from-source or
        deterministically computed, <strong>never asserted</strong>. It does not run the experiment that
        proves a tumour shrinks; it gets to the bench handoff with the work compressed and the evidence
        intact. Here is what that amounts to today — click any number to check it yourself.
      </p>
    </section>

    <section class="grid">
      @for (s of stats; track s.label) {
        <div class="stat">
          <div class="fig">{{ s.figure }}</div>
          <div class="lab">{{ s.label }}</div>
          <div class="sub muted">{{ s.sub }}</div>
          @if (s.internal) {
            <a [routerLink]="s.href" class="src">See it →</a>
          } @else {
            <a [href]="s.href" target="_blank" rel="noopener" class="src">Source →</a>
          }
        </div>
      }
    </section>

    <section class="panel">
      <h2>The honest boundary</h2>
      <p>
        AI gets to the cure with <strong>fewer</strong> experiments — it does not get there without them.
        Structure prediction (AlphaFold-style) and docking rank what to make so the wet lab runs the right
        assays first; they do not replace the assay, the cell, the animal, or the trial. Provenika says so
        on every artifact, and where <strong>prevention</strong> beats any molecule — HBV vaccination for
        liver cancer, <em>H. pylori</em> eradication for gastric — it says that too.
        <a routerLink="/cure">See lever by lever →</a>
      </p>
    </section>

    <section class="panel anti">
      <h2>Why you can trust the numbers</h2>
      <p>
        The anti-hallucination contract: <strong>no figure originates from a language model.</strong>
        Counts come from public databases (ChEMBL, UniProt, RCSB, Open Targets); scores, docking boxes and
        liability flags are recomputed deterministically; and <code class="mono">cad/verify.py</code>
        independently re-pulls each one from its live source and fails CI if anything can't be reproduced.
        The optional plain-language layer is held to a number-guard that rejects any value it didn't read
        from the data. <a routerLink="/portfolio">Start at a bench-ready hypothesis →</a>
      </p>
    </section>

    <p class="disc muted">
      Research &amp; decision-support only — not medical advice, not a treatment recommendation. A
      computational hit is a hypothesis for the wet lab, never evidence a therapy works. Built from public
      data by <a href="https://erosolarai.com" target="_blank" rel="noopener">ErosolarAI</a>.
    </p>
  `,
  styles: [`
    .hero { max-width: 900px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.2rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:80ch; color:var(--text-dim); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.8rem; margin-bottom:1.6rem; }
    .stat { background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px; padding:1rem; }
    .fig { font-size:1.9rem; font-weight:800; color:var(--accent); line-height:1.05; }
    .lab { font-weight:600; margin:.25rem 0 .2rem; }
    .sub { font-size:.82rem; line-height:1.4; }
    .src { display:inline-block; margin-top:.5rem; font-size:.82rem; color:var(--accent); text-decoration:none; }
    .src:hover { text-decoration:underline; }

    .panel { max-width:80ch; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:1rem 1.2rem; margin-bottom:1rem; }
    .panel.anti { border-left:3px solid var(--accent); }
    .panel h2 { font-size:1.15rem; margin:0 0 .4rem; }
    .panel p { line-height:1.6; margin:0; color:var(--text-dim); } .panel a { color:var(--accent); }
    .disc { font-size:.82rem; max-width:80ch; margin-top:1rem; }
  `]
})
export class Impact {
  readonly stats: Stat[] = [
    { figure: '5', label: 'Bench-ready hypotheses',
      sub: 'BTK · BRAF · KRAS · PIK3CA · EGFR — each a cited shortlist + an experimental-validation request',
      href: '/portfolio', internal: true },
    { figure: '33', label: 'Targets ranked by human genetics',
      sub: 'the oncogenome scored by cancer genetic support (Open Targets) — the prior that ~2×-es approval odds',
      href: '/targets', internal: true },
    { figure: '52.6%', label: 'Docking re-finds the crystal pose',
      sub: '20/38 oncology co-crystals within 2 Å (median 1.90 Å) — a real redocking benchmark, not a claim',
      href: REPO + '/examples/validation-redock/README.md', internal: false },
    { figure: '0.89', label: 'Ligand-ranking ROC AUC',
      sub: 'EGFR actives vs decoys (60 vs 240) — the triage separates real binders from look-alikes',
      href: REPO + '/examples/validation-enrichment/EGFR.json', internal: false },
    { figure: '中国', label: 'A complete in-China workflow',
      sub: 'burden → target → compounds → domestic suppliers → domestic CROs → a Simplified-Chinese pitch, no Google needed',
      href: REPO + '/docs/CHINA.md', internal: false },
    { figure: '24', label: 'Test suites guarding it',
      sub: 'offline checks in CI — including the verifier that re-pulls every figure and fails on a mismatch',
      href: REPO + '/cad', internal: false },
  ];
}
