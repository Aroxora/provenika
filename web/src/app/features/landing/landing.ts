import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <div class="hero">
      <div class="badge">Open source · Public data only · Fully auditable</div>
      <h1>Every number is either <span class="accent">computed</span> or <span class="accent">cited</span>.<br>Never asserted.</h1>
      <p class="lead">
        Provenika turns free public biomedical data into ranked, re-verifiable oncology hypotheses.
        The same rule applies to our fundraising: the agentic outreach log is public and redacted.
      </p>

      <div class="cta-row">
        <a routerLink="/explore" class="btn primary large">Start exploring a target →</a>
        <a routerLink="/log" class="btn ghost large">See the live agent log</a>
      </div>

      <div class="quick">
        <span class="muted">Or jump straight in:</span>
        <a class="quick-link" (click)="goExplore('EGFR')">EGFR</a>
        <a class="quick-link" (click)="goExplore('BTK')">BTK</a>
        <a class="quick-link" (click)="goExplore('KRAS G12C')">KRAS G12C</a>
        <a class="quick-link" (click)="goExplore('BRAF')">BRAF</a>
      </div>
    </div>

    <div class="proof-grid">
      <div class="card proof">
        <div class="icon">🔎</div>
        <h3>Live from the source</h3>
        <p class="muted">Dossiers, ligand data, and structures are pulled on demand from ChEMBL, UniProt, and RCSB PDB. No cached lies.</p>
        <a routerLink="/explore">Try the explorer</a>
      </div>
      <div class="card proof">
        <div class="icon">📜</div>
        <h3>Radical transparency</h3>
        <p class="muted">Our autonomous outreach agent publishes every redacted contact, reply, and health status. See exactly who we’ve talked to and what the switch state is.</p>
        <a routerLink="/log">Read the agent log</a>
      </div>
      <div class="card proof">
        <div class="icon">✓</div>
        <h3>Verifiable by anyone</h3>
        <p class="muted">Run <code class="mono">python3 cad/verify.py --target EGFR</code> and watch it re-fetch every figure from the original public URL with a PASS/DRIFT/FAIL result.</p>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">View source on GitHub ↗</a>
      </div>
    </div>

    <div class="investor-teaser card">
      <h3>For investors and partners</h3>
      <p class="muted">We are building the reproducibility and provenance layer that black-box AI tools structurally cannot offer. The wedge is trust, not another proprietary model.</p>
      <div style="margin-top:.6rem">
        <a routerLink="/investors" class="btn primary">Read the investor narrative</a>
      </div>
      <div class="small muted" style="margin-top:.6rem">
        Contact: <a href="mailto:bo@shang.software">bo@shang.software</a> · <a href="tel:+15082600326">+1 508-260-0326</a>
      </div>
    </div>

    <p class="final-note muted">
      Research / decision-support only. Not medical advice. The entire system (code + live public log) is designed so that fabrication is expensive and detection is trivial.
    </p>
  `,
  styles: [`
    .hero { max-width: 760px; margin-bottom: 2.2rem; }
    .badge {
      display: inline-block; font-size: 0.78rem; padding: 0.2rem 0.7rem; border-radius: 999px;
      background: #11231c; color: var(--accent); border: 1px solid #1f5e44; margin-bottom: .6rem;
    }
    .hero h1 { font-size: 2.35rem; line-height: 1.05; margin-bottom: .35rem; }
    .accent { color: var(--accent); }
    .lead { font-size: 1.08rem; max-width: 58ch; color: var(--text-dim); margin-bottom: 1.1rem; }

    .cta-row { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: .7rem; }
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

    .investor-teaser { max-width: 720px; background: linear-gradient(145deg, var(--bg-elev), #0f1722); }
    .investor-teaser h3 { margin-top: 0; }
    .small { font-size: 0.82rem; }

    .final-note { max-width: 68ch; font-size: 0.8rem; margin-top: 1.4rem; }
  `]
})
export class Landing {
  private router = inject(Router);
  private store = inject(TargetStore);

  goExplore(t: string) {
    this.store.set(t);
    this.router.navigate(['/explore'], { queryParams: { t } });
  }
}
