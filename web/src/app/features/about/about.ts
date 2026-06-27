import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  template: `
    <h1>About Provenika</h1>
    <p class="lead">An honest map of <strong>how cancer is actually being cured — and where AI saves the experiment.</strong> Compute or cite, never assert.</p>

    <div class="card">
      <p>The mission is to be exact about the boundary between what AI/compute can do and what only the wet lab and clinic can. Cancer is cured by the sum of five levers — prevention, early detection, precision therapy, immunotherapy, and managing resistance — and AI (most clearly AlphaFold-style structure prediction) compresses the cheap, in-silico front of each, so fewer experiments are run and fewer dead-end molecules get made. It never runs the experiment that proves a person is protected, a tumour shrinks, or a therapy is safe. See <a routerLink="/cure">the full cited map</a>.</p>
      <p>Provenika exists because confident-but-unverifiable AI output is dangerous in drug discovery. We turn free public data (ChEMBL, UniProt, RCSB PDB) into ranked, fully-cited, independently re-verifiable hypotheses — every figure fetched-and-cited or deterministically recomputed, never model-generated.</p>
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
