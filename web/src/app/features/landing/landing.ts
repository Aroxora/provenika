import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';

interface Gap {
  limit: string;
  ai: string;
  need: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <!-- LEAD: what AI can replace in the experiment, and what only the lab & clinic can do -->
    <section class="lead-feature">
      <div class="badge">Literature-verified · No hallucination · Public data only</div>
      <h1>What AI can replace in the experiment —<br><span class="accent">and what only the lab and clinic can do to cure cancer.</span></h1>
      <p class="lead">
        Provenika is honest about exactly <strong>how much</strong> of cancer-drug discovery AI and
        compute can do — and <strong>the part they cannot</strong>, that only the wet lab, animals, and
        the clinic can. AI gets you to a better hypothesis, faster and cheaper. <em>It does not get you
        to a cure.</em> Every computational method below narrows an experiment; none replaces it.
      </p>

      <div class="gap-grid">
        @for (g of gaps; track g.limit) {
          <div class="gap">
            <h3>{{ g.limit }}</h3>
            <div class="row ai"><span class="tag good">AI can</span><span>{{ g.ai }}</span></div>
            <div class="row need"><span class="tag warn">Still needs</span><span>{{ g.need }}</span></div>
          </div>
        }
      </div>

      <p class="why muted">
        Each method is fact-checked against the literature (real open-source tool, real citation, real
        accuracy figure, honest limit) — see the
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">full cited breakdown</a>.
        ~97% of oncology programs that enter trials never reach patients; that gap is experimental, not
        computational.
      </p>

      <div class="cta-row">
        <a routerLink="/explore" class="btn primary large">Explore a target →</a>
        <a routerLink="/log" class="btn ghost large">See the live agent log</a>
      </div>
      <div class="quick">
        <span class="muted">Jump in:</span>
        <a class="quick-link" (click)="goExplore('EGFR')">EGFR</a>
        <a class="quick-link" (click)="goExplore('BTK')">BTK</a>
        <a class="quick-link" (click)="goExplore('KRAS G12C')">KRAS G12C</a>
        <a class="quick-link" (click)="goExplore('BRAF')">BRAF</a>
      </div>
    </section>

    <div class="proof-grid">
      <div class="card proof">
        <div class="icon">🔎</div>
        <h3>Live from the source</h3>
        <p class="muted">Dossiers, ligand data, and structures are pulled on demand from ChEMBL, UniProt, and RCSB PDB. No cached lies.</p>
        <a routerLink="/explore">Try the explorer</a>
      </div>
      <div class="card proof">
        <div class="icon">✓</div>
        <h3>Verifiable by anyone</h3>
        <p class="muted">Run <code class="mono">python3 cad/verify.py --target EGFR</code> and watch it re-fetch every figure from the original public URL with a PASS/DRIFT/FAIL result.</p>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">View source on GitHub ↗</a>
      </div>
      <div class="card proof">
        <div class="icon">🧬</div>
        <h3>Docking, actually run</h3>
        <p class="muted">The full pipeline — including AutoDock Vina docking — runs on AWS; the redocking benchmark scores 52.6% / 1.90&nbsp;Å median, re-derivable offline.</p>
        <a routerLink="/explore">See a structure-aware shortlist</a>
      </div>
    </div>

    <p class="final-note muted">
      Research / decision-support only. <strong>Not for patient care</strong>, diagnosis, or treatment.
      A computational hit is a hypothesis for the wet lab — never evidence a therapy works.
    </p>
  `,
  styles: [`
    .lead-feature { max-width: 920px; margin-bottom: 2rem; }
    .badge {
      display: inline-block; font-size: 0.78rem; padding: 0.2rem 0.7rem; border-radius: 999px;
      background: #11231c; color: var(--accent); border: 1px solid #1f5e44; margin-bottom: .7rem;
    }
    .lead-feature h1 { font-size: 2.1rem; line-height: 1.12; margin-bottom: .5rem; }
    .accent { color: var(--accent); }
    .lead { font-size: 1.05rem; max-width: 70ch; color: var(--text-dim); margin-bottom: 1.2rem; }

    .gap-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: .7rem; margin-bottom: 1.1rem;
    }
    .gap {
      background: var(--bg-elev); border: 1px solid #1c2738; border-radius: 10px; padding: .7rem .85rem;
    }
    .gap h3 { margin: 0 0 .45rem; font-size: 1rem; }
    .gap .row { display: flex; gap: .5rem; align-items: flex-start; font-size: .86rem; line-height: 1.35; margin-bottom: .35rem; }
    .gap .row span:last-child { color: var(--text-dim); }
    .tag {
      flex: none; font-size: .66rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase;
      padding: .12rem .4rem; border-radius: 5px; margin-top: .05rem;
    }
    .tag.good { background: #11231c; color: var(--accent); border: 1px solid #1f5e44; }
    .tag.warn { background: #281a10; color: #f0a868; border: 1px solid #5e431f; }

    .why { font-size: .85rem; max-width: 72ch; margin-bottom: 1.1rem; }
    .cta-row { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: .6rem; }
    .btn.large { padding: .65rem 1.15rem; font-size: 1rem; }
    .quick { font-size: .9rem; }
    .quick-link { margin-left: .35rem; cursor: pointer; }
    .quick-link:hover { text-decoration: underline; }

    .proof-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1.6rem;
    }
    .proof { display: flex; flex-direction: column; }
    .proof .icon { font-size: 1.4rem; margin-bottom: .15rem; }
    .proof h3 { margin: .15rem 0 .25rem; }
    .proof p { flex: 1; margin-bottom: .4rem; }
    .proof a { font-size: .9rem; }

    .final-note { max-width: 72ch; font-size: 0.82rem; margin-top: 1.4rem; }
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
    { limit: 'Missing structure / data', ai: 'Predicted structures & co-folds (AlphaFold2/3, Boltz, Chai); active learning', need: 'X-ray / cryo-EM + new bioactivity measurement' },
    { limit: 'Efficacy & safety', ai: 'Shifts the population prior (human genetic validation ~2×, Open Targets)', need: 'Phase 1–3 clinical trials — nothing predicts this' },
  ];

  goExplore(t: string) {
    this.store.set(t);
    this.router.navigate(['/explore'], { queryParams: { t } });
  }
}
