import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';

interface Row {
  symbol: string;
  approved_symbol?: string;
  ensembl_id?: string;
  genetic_score: number | null;
  genetic_cancer: string | null;
  somatic_score: number | null;
  known_drug_score: number | null;
  readout: string;
  url?: string;
  error?: string;
}
interface Panel {
  generated: string;
  source: string;
  panel_size: number;
  ranked: Row[];
  disclaimer: string;
}

@Component({
  selector: 'app-targets',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">Live Open Targets data · re-verifiable · not a forecast</div>
      <h1>Which targets to pursue —<br><span class="accent">ranked by human genetics.</span></h1>
      <p class="lead">
        Picking the target is the single most consequential decision in a cancer program, and the most
        predictive prior we have is <strong>human genetic evidence</strong>: drug mechanisms with human
        genetic support are about <strong>twice as likely to win approval</strong>
        (<a href="https://www.nature.com/articles/ng.3314" target="_blank" rel="noopener">Nelson et al., Nat Genet 2015</a>).
        Every number below is <strong>fetched live from the
        <a href="https://platform.opentargets.org" target="_blank" rel="noopener">Open Targets Platform</a></strong> —
        none is computed, blended, or model-produced. The ranking key is Open Targets' own cancer
        genetic-evidence score; we invent no composite that would imply a prediction the data can't make.
      </p>
    </section>

    @if (panel(); as p) {
      <section class="legend">
        <div class="key">
          <span class="dot strong"></span> strong genetic support (≥0.5) ·
          <span class="dot mod"></span> moderate (0.2–0.5) ·
          <span class="dot weak"></span> weak (&lt;0.2)
        </div>
        <div class="opp-note">
          <strong>Genetically validated, not yet well-drugged</strong> rows (strong genetics, weak
          clinical/drug precedent) are flagged <span class="opp-chip">opportunity</span> — but read it
          honestly: a low drug score often means the target is <em>historically hard</em> (a lost tumor
          suppressor, or the RAS family), not an easy win.
        </div>
      </section>

      <section class="tablewrap">
        <table class="rank">
          <thead>
            <tr>
              <th>#</th><th>Target</th><th>Cancer genetic support</th><th>Cancer (genetic)</th>
              <th title="Strongest somatic-mutation evidence across this target's cancer associations">Somatic</th>
              <th title="Strongest clinical / known-drug precedent across this target's cancer associations">Clinical / drug</th>
            </tr>
          </thead>
          <tbody>
            @for (r of ranked(); track r.symbol; let i = $index) {
              <tr [class.opp]="isOpportunity(r)">
                <td class="rk">{{ i + 1 }}</td>
                <td class="sym">
                  <a [href]="r.url" target="_blank" rel="noopener">{{ r.symbol }}</a>
                  @if (isOpportunity(r)) { <span class="opp-chip" title="strong genetics, weak drug precedent">opportunity</span> }
                  @if (worked(r.symbol)) { <a class="bench-chip" routerLink="/portfolio" title="we have a bench-ready hypothesis for this">in portfolio →</a> }
                </td>
                <td class="gsc">
                  @if (r.genetic_score !== null) {
                    <div class="bar"><span [style.width.%]="r.genetic_score * 100" [class]="band(r.genetic_score)"></span></div>
                    <span class="num">{{ r.genetic_score.toFixed(2) }}</span>
                  } @else { <span class="muted">—</span> }
                </td>
                <td class="dis">{{ r.genetic_cancer || '—' }}</td>
                <td class="ctx">{{ fmt(r.somatic_score) }}</td>
                <td class="ctx">{{ fmt(r.known_drug_score) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <section class="cta">
        <p>
          See which of these we've already worked into a cited, bench-ready hypothesis on the
          <a routerLink="/portfolio">Portfolio →</a>, and how any of them would be tested on
          <a routerLink="/bench">To the Bench →</a>. For an already-drugged target, the
          <a routerLink="/resistance">Resistance landscape →</a> names the specific gap a next-gen
          molecule must cover.
        </p>
        <p class="repro muted">
          Snapshot fetched {{ p.generated }} from {{ p.source }}. Reproduce live:
          <code class="mono">make panel</code> or <code class="mono">python3 cad/target_panel.py --json</code>.
          Verify any single value by opening its Open Targets link above.
        </p>
        <p class="disc muted">{{ p.disclaimer }}</p>
      </section>
    } @else if (failed()) {
      <p class="muted">Couldn't load the target panel snapshot. Reproduce it locally with <code class="mono">make panel</code>.</p>
    } @else {
      <p class="muted">Loading the ranked target panel…</p>
    }
  `,
  styles: [`
    .hero { max-width: 900px; margin-bottom: 1.4rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.04rem; max-width:80ch; color:var(--text-dim); } .lead a { color:var(--accent); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .legend { display:flex; flex-direction:column; gap:.5rem; margin-bottom:.9rem; }
    .key { font-size:.82rem; color:var(--text-dim); }
    .dot { display:inline-block; width:.7rem; height:.7rem; border-radius:50%; vertical-align:middle; margin:0 .15rem 0 .5rem; }
    .dot.strong { background:var(--accent); } .dot.mod { background:#f0a868; } .dot.weak { background:#7c8aa0; }
    .opp-note { font-size:.85rem; color:var(--text-dim); max-width:80ch; line-height:1.5;
      background:var(--bg-elev); border:1px solid #1c2738; border-left:3px solid var(--accent); border-radius:8px; padding:.6rem .8rem; }
    .opp-chip { font-size:.6rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:.08rem .35rem;
      border-radius:4px; background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-left:.35rem; vertical-align:middle; }
    .bench-chip { font-size:.62rem; font-weight:600; padding:.08rem .35rem; border-radius:4px;
      background:#281a10; color:#f0a868; border:1px solid #5e431f; margin-left:.35rem; text-decoration:none; vertical-align:middle; }

    .tablewrap { overflow-x:auto; margin-bottom:1.4rem; }
    table.rank { border-collapse:collapse; width:100%; font-size:.88rem; min-width:680px; }
    table.rank th { text-align:left; padding:.5rem .6rem; border-bottom:1px solid #24344a; color:var(--text-dim);
      font-weight:600; font-size:.78rem; position:sticky; top:0; background:var(--bg); }
    table.rank td { padding:.45rem .6rem; border-bottom:1px solid #16202e; vertical-align:middle; }
    tr.opp { background:#0f1a14; }
    .rk { color:var(--text-dim); width:2.2rem; }
    .sym a { color:var(--text); font-weight:700; text-decoration:none; } .sym a:hover { color:var(--accent); }
    .gsc { white-space:nowrap; } .gsc .bar { display:inline-block; width:84px; height:8px; border-radius:999px;
      background:#16202e; overflow:hidden; vertical-align:middle; margin-right:.45rem; }
    .gsc .bar span { display:block; height:100%; }
    .gsc .bar span.strong { background:var(--accent); } .gsc .bar span.mod { background:#f0a868; } .gsc .bar span.weak { background:#7c8aa0; }
    .gsc .num { font-family:var(--mono); font-size:.82rem; }
    .dis { color:var(--text-dim); } .ctx { font-family:var(--mono); font-size:.82rem; color:var(--text-dim); }

    .cta { max-width:900px; } .cta p { line-height:1.55; } .cta a { color:var(--accent); }
    .repro, .disc { font-size:.82rem; max-width:80ch; }
  `]
})
export class Targets {
  private http = inject(HttpClient);
  readonly panel = signal<Panel | null>(null);
  readonly failed = signal(false);

  // Targets already worked into a bench-ready hypothesis (kept in sync with /portfolio).
  private readonly inPortfolio = new Set(['BTK', 'BRAF', 'KRAS', 'PIK3CA', 'EGFR', 'ERBB2']);

  readonly ranked = computed(() => (this.panel()?.ranked ?? []).filter(r => !r.error));

  constructor() {
    firstValueFrom(this.http.get<Panel>('/data/target-panel.json'))
      .then(p => this.panel.set(p))
      .catch(() => this.failed.set(true));
  }

  band(s: number): string { return s >= 0.5 ? 'strong' : s >= 0.2 ? 'mod' : 'weak'; }
  fmt(s: number | null): string { return s === null || s === undefined ? '—' : s.toFixed(2); }
  worked(sym: string): boolean { return this.inPortfolio.has(sym); }

  // "Genetically validated but not yet well-drugged": strong genetics, weak/absent clinical precedent.
  isOpportunity(r: Row): boolean {
    return (r.genetic_score ?? 0) >= 0.7 && (r.known_drug_score === null || (r.known_drug_score ?? 1) < 0.5);
  }
}
