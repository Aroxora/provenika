import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Entry {
  target: string;
  context: string;
  note: string;
  genetic: string;
  geneticStrong: boolean;
}

const REPO = 'https://github.com/Aroxora/provenika/blob/main/examples/portfolio';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">Cited · re-verifiable · bench-ready hypotheses</div>
      <h1>Bench-ready hypotheses —<br><span class="accent">cited, and ready to test.</span></h1>
      <p class="lead">
        A growing portfolio of oncology hypotheses: public ChEMBL bioactivity triaged and prioritized
        per target, each shipped with an <strong>experimental-validation request</strong> — the exact
        experiments and the real labs (and free routes like NCI-60) that would test it. These are
        <strong>hypotheses for the bench, not validated hits.</strong> Every figure is fetched-from-source
        or deterministically computed and re-checkable with <code class="mono">cad/verify.py</code>.
      </p>
    </section>

    <section class="grid">
      @for (e of entries; track e.target) {
        <div class="entry">
          <h3>{{ e.target }}</h3>
          <div class="ctx muted">{{ e.context }}</div>
          <div class="genetic" [class.strong]="e.geneticStrong">
            <span class="gtag" [class.strong]="e.geneticStrong">Target validation</span>{{ e.genetic }}
          </div>
          <p class="note">{{ e.note }}</p>
          <div class="links">
            <a [href]="repo + '/' + slug(e.target) + '/VALIDATION-REQUEST.md'" target="_blank" rel="noopener" class="link primary">Validation request →</a>
            <a [href]="repo + '/' + slug(e.target) + '/dossier.json'" target="_blank" rel="noopener" class="link">Dossier</a>
            <a [href]="repo + '/' + slug(e.target) + '/hits.csv'" target="_blank" rel="noopener" class="link">Shortlist</a>
          </div>
        </div>
      }
    </section>

    <section class="cta">
      <p>
        Want to test one? The honest first ask is small — a biochemical IC50 to confirm binding, then a
        selectivity panel. <a routerLink="/bench">See the experiment chain and the labs that run it →</a>
      </p>
      <p class="disc muted">
        Research only — not medical advice, not a treatment recommendation. A computational hit is a
        hypothesis for the wet lab, never evidence a therapy works.
      </p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.04rem; max-width:74ch; color:var(--text-dim); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:.8rem; margin-bottom:1.4rem; }
    .entry { background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px; padding:.9rem 1rem; }
    .entry h3 { margin:0 0 .15rem; font-size:1.2rem; }
    .ctx { font-size:.82rem; margin-bottom:.45rem; }
    .genetic { font-size:.82rem; line-height:1.4; margin:0 0 .5rem; color:var(--text-dim); display:flex; gap:.4rem; flex-wrap:wrap; align-items:baseline; }
    .gtag { font-size:.6rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:.1rem .35rem;
      border-radius:4px; background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .gtag.strong { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .note { font-size:.9rem; line-height:1.45; margin:0 0 .6rem; color:var(--text); }
    .links { display:flex; gap:.5rem; flex-wrap:wrap; }
    .link { font-size:.85rem; padding:.3rem .6rem; border-radius:7px; border:1px solid #24344a;
      text-decoration:none; color:var(--text-dim); background:#0f1722; }
    .link.primary { color:var(--accent); border-color:#1f5e44; }
    .link:hover { border-color:var(--accent); }

    .cta { max-width:880px; } .cta p { line-height:1.5; } .cta a { color:var(--accent); }
    .disc { font-size:.82rem; max-width:74ch; }
  `]
})
export class Portfolio {
  readonly repo = REPO;
  readonly entries: Entry[] = [
    {
      target: 'BTK',
      context: 'CLL / lymphoma — the ibrutinib / acalabrutinib target',
      note: 'A prioritized shortlist of potent BTK ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.',
      genetic: 'Cancer link is somatic-driven — no germline genetic signal (Open Targets)',
      geneticStrong: false,
    },
    {
      target: 'BRAF',
      context: 'Melanoma / colorectal — the V600E driver (vemurafenib / dabrafenib class)',
      note: 'A prioritized shortlist of potent BRAF ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.',
      genetic: 'Strong human genetic support for melanoma (0.70, Open Targets)',
      geneticStrong: true,
    },
    {
      target: 'KRAS',
      context: 'Pancreatic / colorectal / NSCLC — the historically "undruggable" oncogene (sotorasib / adagrasib G12C class)',
      note: 'A prioritized shortlist of potent KRAS ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.',
      genetic: 'Strong human genetic support for gastric cancer (0.90, Open Targets)',
      geneticStrong: true,
    },
  ];

  slug(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
}
