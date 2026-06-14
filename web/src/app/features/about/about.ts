import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  template: `
    <h1>About Provenika</h1>
    <p class="lead">An auditable evidence engine for oncology research. <strong>Compute or cite, never assert.</strong></p>

    <div class="card">
      <p>The project exists because confident but unverifiable output from AI systems is dangerous in drug discovery. We turn free public data (ChEMBL, UniProt, RCSB PDB, Europe PMC, ClinicalTrials.gov) into ranked, fully-cited, independently re-verifiable hypotheses. The same rule applies to how we operate: the agentic outreach log is public.</p>
    </div>

    <h3>Verifiability</h3>
    <p>Run <code class="mono">python3 cad/verify.py --target EGFR</code> from the repo. It re-pulls every figure from its original public source and reports PASS/DRIFT/FAIL with the exact URLs.</p>

    <h3>Open source</h3>
    <p><a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">github.com/Aroxora/provenika</a> — full pipeline in <code>cad/</code>, outreach agent in <code>outreach/</code>, this site in <code>web/</code>.</p>

    <h3>Contact</h3>
    <p>Bo Shang — <a href="mailto:bo@shang.software">bo@shang.software</a> · <a href="mailto:bo@trenchwork.org">bo@trenchwork.org</a> · +1 508-260-0326</p>

    <div class="disclaimer">
      Research and decision-support only. Not medical advice. Not a treatment recommendation.
    </div>
  `,
  styles: [`
    .lead { font-size: 1.1rem; max-width: 70ch; }
    .mono { font-family: var(--mono); }
    a { color: var(--accent-2); }
  `]
})
export class About {}
