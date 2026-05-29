import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';
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
  `],
})
export class Overview {
  private store = inject(TargetStore);
  readonly target = this.store.target;
  readonly tagline = TAGLINE;
  readonly methods = METHODS;
  readonly glossary = GLOSSARY;

  readonly stages = [
    { id: 'disease', label: 'Disease → targets', source: 'Open Targets', route: 'disease' },
    { id: 'dossier', label: 'Target dossier', source: 'UniProt · ChEMBL · PDB', route: 'dossier' },
    { id: 'triage', label: 'Ligand triage', source: 'ChEMBL bioactivity', route: 'triage' },
    { id: 'structure', label: 'Structure', source: 'RCSB PDB · AlphaFold', route: 'structure' },
    { id: 'cost', label: 'Cost-benefit', source: 'Public benchmarks', route: 'cost-benefit' },
    { id: 'report', label: 'Report', source: 'Consolidated brief', route: 'report' },
  ];
}
