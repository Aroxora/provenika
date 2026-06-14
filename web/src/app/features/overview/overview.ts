import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';
import { CheminformaticsService } from '../../core/cheminformatics.service';
import { METHODS, TAGLINE } from '../../core/methods';
import { GLOSSARY } from '../../core/glossary';

@Component({
  selector: 'app-overview',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h2>How it works</h2>
      <p class="tag">{{ tagline }}</p>
      <p class="muted">
        Everything runs in your browser against free, public, CORS-enabled databases — no backend,
        no API keys, no patient data. Pick a target above; every view below operates on it.
        <strong>Research / educational use only — not medical advice.</strong>
      </p>
      <div class="cta">
        <a routerLink="/dossier"><button class="primary">Start: dossier for {{ target() }} →</button></a>
        <a routerLink="/models"><button>∫ Interactive models →</button></a>
        <a routerLink="/report"><button>Jump to report →</button></a>
      </div>
    </section>

    <section class="strategy card">
      <h3>Compute or cite — never assert</h3>
      <p class="muted">
        A terminal-bound agent can't cure cancer, run a lab, or see a patient — and the deadliest
        failure mode of "AI for medicine" is a confident, fabricated number. So the one rule here is:
        <strong>no figure originates from a language model.</strong> Every value is either fetched
        live from a named public database or computed by deterministic open-source code — and links
        back to its primary source so you can re-prove it.
      </p>
      <ul class="guarantees">
        <li><strong>Fetched or computed, never invented</strong> — each figure carries its origin + source.</li>
        <li><strong>Re-verifiable</strong> — the CLI's <code>verify.py</code> re-pulls every number from its live source (PASS/DRIFT/FAIL).</li>
        <li><strong>Triage ≠ validation</strong> — scores rank hypotheses; they don't prove a molecule works.</li>
        <li><strong>No medical advice</strong> — no recommendations, prognoses, or treatment plans.</li>
      </ul>
    </section>

    @if (ready().length) {
      <h3 class="sec-h">Cheminformatics-ready targets <span class="muted">— precomputed RDKit profiles</span></h3>
      <p class="muted ready-note">These targets have full offline RDKit analysis (PAINS/Brenk, chemotype clusters, scaffolds) baked in — click to triage instantly.</p>
      <div class="ready">
        @for (r of ready(); track r.slug) {
          <button class="chip ready-chip" (click)="analyze(r.target)">{{ r.target }} <span class="muted">· {{ r.count }}</span></button>
        }
      </div>
    }

    <h3 class="sec-h">The pipeline</h3>
    <div class="flow">
      @for (s of stages; track s.id; let i = $index) {
        <a class="step card" [routerLink]="'/' + s.route">
          <div class="num">{{ i + 1 }}</div>
          <div class="step-body">
            <div class="step-title">{{ s.label }}</div>
            <div class="muted src">{{ s.source }}</div>
          </div>
        </a>
        @if (i < stages.length - 1) { <div class="arrow">→</div> }
      }
    </div>

    @if (methods.length) {
      <h3 class="sec-h">Methods &amp; sources</h3>
      <div class="methods">
        @for (m of methods; track m.id) {
          <div class="card method">
            <h4>{{ m.title }}</h4>
            <p>{{ m.what }}</p>
            <div class="m-meta">
              <span class="pill blue">{{ m.dataSource }}</span>
            </div>
            <p class="caveat muted">⚠ {{ m.caveat }}</p>
          </div>
        }
      </div>
    }

    @if (glossary.length) {
      <h3 class="sec-h">Glossary <span class="muted">— {{ glossary.length }} terms</span></h3>
      <div class="glossary">
        @for (g of glossary; track g.term) {
          <div class="card g">
            <div class="g-head"><strong>{{ g.term }}</strong>
              @if (g.typicalRange && g.typicalRange !== 'n/a') { <span class="pill">{{ g.typicalRange }}</span> }
            </div>
            <p>{{ g.definition }}</p>
            <p class="muted why">{{ g.whyItMatters }}</p>
            <div class="muted src">Source: {{ g.source }}</div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .hero { margin-bottom: 1.5rem; }
    .hero h2 { margin-top: 0; }
    .strategy { margin-bottom: 1.5rem; }
    .strategy h3 { margin-top: 0; color: var(--accent); }
    .strategy p { max-width: 80ch; font-size: 0.92rem; line-height: 1.5; }
    .guarantees { margin: 0.6rem 0 0; padding-left: 1.1rem; display: grid; gap: 0.35rem; }
    .guarantees li { font-size: 0.88rem; line-height: 1.4; }
    .guarantees code { font-size: 0.82rem; }
    .tag { font-size: 1.15rem; color: var(--text); max-width: 70ch; }
    .cta { display: flex; gap: 0.6rem; margin-top: 1rem; flex-wrap: wrap; }
    .sec-h { margin: 1.8rem 0 0.8rem; }
    .flow { display: flex; align-items: stretch; gap: 0.5rem; flex-wrap: wrap; }
    .step { display: flex; gap: 0.7rem; align-items: center; flex: 1 1 150px; min-width: 150px; text-decoration: none; color: var(--text); transition: border-color .15s; }
    .step:hover { border-color: var(--accent); text-decoration: none; }
    .num { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: #04130c; display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
    .step-title { font-weight: 600; font-size: 0.92rem; }
    .src { font-size: 0.75rem; }
    .arrow { display: grid; place-items: center; color: var(--text-dim); }
    .methods, .glossary { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.8rem; }
    .method h4 { margin: 0 0 0.4rem; color: var(--accent); }
    .method p { font-size: 0.88rem; line-height: 1.45; margin: 0.3rem 0; }
    .caveat { font-size: 0.8rem; }
    .g-head { display: flex; align-items: center; gap: 0.5rem; justify-content: space-between; }
    .g p { font-size: 0.86rem; line-height: 1.45; margin: 0.4rem 0; }
    .g .why { font-size: 0.8rem; }
    .g .src { font-size: 0.74rem; }
    @media (max-width: 700px) { .arrow { display: none; } }
    .ready-note { font-size: 0.85rem; max-width: 70ch; margin: 0 0 0.6rem; }
    .ready { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .ready-chip { padding: 0.3rem 0.7rem; border-radius: 999px; font-size: 0.85rem; }
    .ready-chip:hover { border-color: var(--accent); color: var(--accent); }
  `],
})
export class Overview {
  private store = inject(TargetStore);
  private chemSvc = inject(CheminformaticsService);
  private router = inject(Router);
  readonly target = this.store.target;
  readonly tagline = TAGLINE;
  readonly methods = METHODS;
  readonly glossary = GLOSSARY;
  readonly ready = signal<{ target: string; slug: string; count: number }[]>([]);

  constructor() {
    this.chemSvc.index().then((r) => this.ready.set(r));
  }

  analyze(target: string) {
    this.store.set(target);
    this.router.navigate(['/triage']);
  }

  readonly stages = [
    { id: 'disease', label: 'Disease → targets', source: 'Open Targets', route: 'disease' },
    { id: 'dossier', label: 'Target dossier', source: 'UniProt · ChEMBL · PDB', route: 'dossier' },
    { id: 'triage', label: 'Ligand triage', source: 'ChEMBL bioactivity', route: 'triage' },
    { id: 'structure', label: 'Structure', source: 'RCSB PDB · AlphaFold', route: 'structure' },
    { id: 'cost', label: 'Cost-benefit', source: 'Public benchmarks', route: 'cost-benefit' },
    { id: 'report', label: 'Report', source: 'Consolidated brief', route: 'report' },
  ];
}
