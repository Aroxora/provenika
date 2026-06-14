import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h2>About</h2>
      <p class="tag">An auditable evidence engine for oncology research — <em>compute or cite, never assert.</em></p>
      <p class="muted">
        A terminal-bound AI agent can't cure cancer, run a lab, or see a patient — and the deadliest
        failure of "AI for medicine" is a confident, fabricated number. So this project does the one
        honest thing it can: turn <strong>free public data</strong> (ChEMBL, UniProt, PDB, PubMed,
        ClinicalTrials.gov) into ranked, fully-cited, <strong>independently re-verifiable</strong>
        drug-discovery hypotheses, and make fabrication impossible to hide. Research only — not medical advice.
      </p>
    </section>

    <h3 class="sec-h">How the AI is wired</h3>
    <div class="card">
      <p>
        The language model is used only to <strong>orchestrate and explain</strong> — never as a source
        of facts. Every figure is fetched-and-cited or deterministically computed (see
        <a routerLink="/status">Status</a> and the repo's provenance/verify tooling).
      </p>
      <p class="muted">
        The agent talks to its model provider over either of two compatible APIs, and switches between
        them automatically if one is unavailable — so a single key keeps working across surfaces:
      </p>
      <table class="api">
        <tr><th></th><th>Base URL</th><th>Endpoint</th><th>Auth</th></tr>
        <tr><td>OpenAI format</td><td class="mono">https://api.deepseek.com</td><td class="mono">/chat/completions</td><td class="mono">Authorization: Bearer</td></tr>
        <tr><td>Anthropic format</td><td class="mono">https://api.deepseek.com/anthropic</td><td class="mono">/v1/messages</td><td class="mono">x-api-key + anthropic-version</td></tr>
      </table>
      <p class="muted small">
        Configurable via <span class="mono">LLM_FORMAT = openai | anthropic | auto</span>. Keys are
        bring-your-own and never committed — set them in a local <span class="mono">.env</span>,
        save them at runtime (<span class="mono">cli.py keys</span>), or use cloud secrets. The same
        provider-neutral wrapper supports <strong>DeepSeek, xAI (Grok 4.3), Google Gemini, OpenAI,
        and Anthropic</strong> — switch with one setting (<span class="mono">LLM_PROVIDER</span>), or
        compare them side by side on the <a routerLink="/settings">Settings → Comparison</a> page.
      </p>
    </div>

    <h3 class="sec-h">Open &amp; verifiable</h3>
    <div class="card">
      <p class="muted">
        Everything is open source and auditable: <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">github.com/Aroxora/provenika</a>.
        Prove any figure yourself — <span class="mono">python3 cad/verify.py --target EGFR</span> re-pulls
        each number from its public source. See <a routerLink="/status">Status</a> for live service health
        and <a routerLink="/outreach">Outreach</a> for our transparent fundraising log.
      </p>
    </div>

    <footer class="foot muted">
      Contact Bo Shang: <a href="mailto:bo@shang.software">bo@shang.software</a> ·
      <a href="mailto:bo@trenchwork.org">bo@trenchwork.org</a> ·
      <a href="tel:+15082600326">+1&nbsp;508-260-0326</a>.
    </footer>
  `,
  styles: [`
    .hero h2 { margin-top: 0; }
    .tag { font-size: 1.1rem; } .hero p, .card p { max-width: 80ch; }
    .sec-h { margin: 1.6rem 0 0.7rem; }
    .card { margin-bottom: 1rem; }
    .api { border-collapse: collapse; margin: 0.6rem 0; font-size: 0.85rem; width: 100%; }
    .api th, .api td { text-align: left; padding: 0.35rem 0.6rem; border-bottom: 1px solid var(--border, #2a3b34); }
    .mono { font-family: ui-monospace, Menlo, monospace; font-size: 0.82em; }
    .small { font-size: 0.85rem; }
    .foot { margin-top: 1.4rem; font-size: 0.85rem; }
    a { color: var(--accent); }
  `],
})
export class About {}
