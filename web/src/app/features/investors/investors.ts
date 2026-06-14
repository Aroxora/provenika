import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-investors',
  imports: [RouterLink],
  template: `
    <div class="inv-head">
      <h1>Provenika — for investors &amp; partners</h1>
      <p class="tag">The auditable evidence engine for oncology drug discovery.</p>
    </div>

    <div class="one-liner card">
      <strong>One rule:</strong> <em>compute or cite, never assert.</em><br>
      Every figure is fetched from a named public source or produced by deterministic code.
      A one-command verifier re-pulls the exact same numbers live from the original URLs.
    </div>

    <h2 class="sec">The problem</h2>
    <p class="muted">AI-for-drug-discovery tools (Schrödinger, Insilico, Causaly, BenchSci, Open Targets headline features) all ship confident outputs that cannot be independently audited. In a domain where a wrong number can waste years or mislead a clinical program, unverifiable synthesis is a liability. Pharma already spends ~$2.2B per approved asset (Deloitte). They will pay for tools that compress timelines, but only if the output is defensible to regulators, tumor boards, and peer reviewers.</p>

    <h2 class="sec">Our wedge</h2>
    <p class="muted">We are not competing on proprietary data or another black-box model. We are building the missing <strong>reproducibility and provenance layer</strong>. The hard, unglamorous part that incumbents have no incentive to build: every number tagged with its exact origin, an independent verifier that anyone can run, and a hard line against hallucinated facts.</p>
    <ul class="bullets">
      <li>Public data only (ChEMBL, UniProt, PDB, Europe PMC, ClinicalTrials.gov, Reactome).</li>
      <li>Client-side + Python ports of the same deterministic logic.</li>
      <li>Live public agentic outreach log (this site) — radical transparency on our own operations.</li>
      <li>Full source: <a href="https://github.com/Aroxora/provenika" target="_blank">github.com/Aroxora/provenika</a></li>
    </ul>

    <h2 class="sec">Proof you can run right now</h2>
    <div class="proof-box card">
      <code>python3 cad/verify.py --target EGFR</code><br>
      <span class="muted">Re-fetches every figure from its canonical public source and reports PASS / DRIFT / FAIL with the exact URLs.</span>
    </div>

    <h2 class="sec">Business reality (honest)</h2>
    <p class="muted">Free code over free public data has no data moat. Open Targets already gives away target triage for free. ChEMBL and PDB are public. The durable advantage is <strong>brand + trust + private-data integration</strong>. Revenue paths (in priority):</p>
    <ol class="paths">
      <li><strong>Grants &amp; open-science sustainability</strong> (Galaxy / Bioconductor model) — primary.</li>
      <li><strong>Open-core services</strong>: on-prem/private-data fusion + audit-ready provenance snapshots for regulated teams.</li>
      <li>Strategic tuck-in for an evidence intelligence company.</li>
    </ol>
    <p class="muted small">Detailed analysis: the <code>/business</code> directory in the repo. We dropped “cure” framing early because overpromise destroys the one asset we actually have — credibility.</p>

    <h2 class="sec">Why the live agent log matters here</h2>
    <p class="muted">The same agent that does outreach for the project also publishes its own activity. You can watch in real time whether we are sending, what the health of the system is, and what (redacted) responses we receive. This is the product principle applied to the company itself.</p>
    <a routerLink="/log" class="btn">View the current agent log &amp; status →</a>

    <h2 class="sec">Contact</h2>
    <p>
      Bo Shang<br>
      <a href="mailto:bo@shang.software">bo@shang.software</a> · <a href="mailto:bo@trenchwork.org">bo@trenchwork.org</a> · <a href="tel:+15082600326">+1 508-260-0326</a><br>
      <a routerLink="/explore">Explore the live tool</a> · <a href="https://github.com/Aroxora/provenika" target="_blank">GitHub</a>
    </p>

    <div class="disclaimer">
      Research / decision-support only. Not medical advice. Market context drawn from public filings and research reports (see repo for citations). This is not a solicitation.
    </div>
  `,
  styles: [`
    .inv-head { margin-bottom: 1.1rem; }
    .tag { font-size: 1.05rem; color: var(--text-dim); }
    .one-liner { font-size: 1.02rem; max-width: 760px; }
    .sec { margin-top: 1.65rem; margin-bottom: .35rem; }
    .bullets { padding-left: 1.1rem; color: var(--text-dim); }
    .proof-box { font-family: var(--mono); font-size: .95rem; background: #0c121a; }
    .paths { color: var(--text-dim); }
    .paths li { margin: .35rem 0; }
    .small { font-size: .8rem; }
  `]
})
export class Investors {}
