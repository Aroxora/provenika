import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeysService } from '../../core/keys.service';
import { CompareService, MODELS, ModelChoice, RunResult } from '../../core/compare.service';

interface Col { choice: ModelChoice; result?: RunResult; running: boolean }

@Component({
  selector: 'app-compare',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h2>Model comparison</h2>
      <p class="muted">
        Same prompt, 2–3 models, side by side — grounded with Tavily sources. Runs in your browser with
        your saved keys. <a routerLink="/settings">Manage keys in Settings.</a>
      </p>
    </section>

    @if (!keys.ready) {
      <div class="card"><p class="muted">
        You need a saved <strong>Tavily</strong> key and at least one model key first.
        <a routerLink="/settings">Go to Settings →</a>
      </p></div>
    } @else {
      <div class="card">
        <label class="lbl">Prompt</label>
        <textarea [value]="prompt()" (input)="prompt.set($any($event.target).value)" rows="4"
                  placeholder="e.g. Summarize the evidence for EGFR as an oncology target in 5 bullets."></textarea>

        <label class="lbl">Models <span class="muted">(pick 2–3 — only providers you have keys for)</span></label>
        <div class="models">
          @for (m of available(); track m.id) {
            <label class="chk" [class.disabled]="!selected().includes(m.id) && selected().length >= 3">
              <input type="checkbox" [checked]="selected().includes(m.id)" (change)="toggle(m.id)"
                     [disabled]="!selected().includes(m.id) && selected().length >= 3" />
              {{ m.label }}
            </label>
          }
        </div>
        @if (unavailable().length) {
          <p class="muted small">No key for: {{ unavailableLabels() }} — add in <a routerLink="/settings">Settings</a>.</p>
        }

        <div class="actions">
          <button class="primary" (click)="run()" [disabled]="!canRun() || busy()">
            {{ busy() ? 'Running…' : 'Run comparison' }}</button>
          <span class="muted small">{{ selected().length }}/3 selected (min 2)</span>
        </div>
      </div>

      @if (tavily(); as t) {
        <div class="card tav">
          <h3>Tavily sources <span class="muted">— grounding</span></h3>
          @if (t.error) { <p class="muted">Tavily error: {{ t.error }}</p> }
          @else {
            @if (t.answer) { <p class="ans">{{ t.answer }}</p> }
            <ul>@for (s of t.sources; track s.url) { <li><a [href]="s.url" target="_blank" rel="noopener">{{ s.title || s.url }}</a></li> }</ul>
          }
        </div>
      }

      @if (cols().length) {
        <div class="cols" [style.grid-template-columns]="'repeat(' + cols().length + ', 1fr)'">
          @for (c of cols(); track c.choice.id) {
            <div class="card col">
              <div class="chead">{{ c.choice.label }}
                @if (c.result && c.result.ok) { <span class="muted ms">{{ c.result.ms }}ms</span> }</div>
              @if (c.running) { <p class="muted">running…</p> }
              @else if (c.result?.ok) { <pre class="out">{{ c.result?.text }}</pre> }
              @else if (c.result) { <p class="err">{{ c.result?.error }}</p> }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .hero h2 { margin-top: 0; } .hero p { max-width: 80ch; }
    .lbl { display: block; font-weight: 600; margin: 0.6rem 0 0.3rem; }
    textarea { width: 100%; padding: 0.6rem; background: var(--bg,#0d1117); color: var(--text); border: 1px solid var(--border,#2a3b34); border-radius: 6px; font-family: inherit; }
    .models { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .chk { display: flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; }
    .chk.disabled { opacity: 0.5; }
    .actions { display: flex; align-items: center; gap: 0.8rem; margin-top: 0.8rem; }
    .small { font-size: 0.82rem; }
    .tav .ans { font-size: 0.9rem; } .tav ul { margin: 0.3rem 0 0; padding-left: 1.1rem; } .tav a { color: var(--accent); }
    .cols { display: grid; gap: 0.6rem; margin-top: 0.8rem; }
    .col { display: flex; flex-direction: column; }
    .chead { font-weight: 600; margin-bottom: 0.4rem; } .ms { font-weight: 400; font-size: 0.78rem; }
    .out { white-space: pre-wrap; font-size: 0.82rem; line-height: 1.45; margin: 0; font-family: inherit; }
    .err { color: #ff6b6b; font-size: 0.82rem; white-space: pre-wrap; }
    @media (max-width: 700px) { .cols { grid-template-columns: 1fr !important; } }
  `],
})
export class Compare {
  readonly keys = inject(KeysService);
  private svc = inject(CompareService);
  readonly prompt = signal('');
  readonly selected = signal<string[]>([]);
  readonly busy = signal(false);
  readonly cols = signal<Col[]>([]);
  readonly tavily = signal<{ answer: string; sources: { title: string; url: string }[]; error?: string } | null>(null);

  readonly available = computed(() => MODELS.filter((m) => this.keys.has(m.provider)));
  readonly unavailable = computed(() => MODELS.filter((m) => !this.keys.has(m.provider)));
  unavailableLabels() { return this.unavailable().map((m) => m.label).join(', '); }
  canRun() { return this.prompt().trim().length > 0 && this.selected().length >= 2; }

  toggle(id: string) {
    const s = this.selected();
    if (s.includes(id)) this.selected.set(s.filter((x) => x !== id));
    else if (s.length < 3) this.selected.set([...s, id]);
  }

  async run() {
    if (!this.canRun()) return;
    this.busy.set(true);
    const chosen = MODELS.filter((m) => this.selected().includes(m.id));
    this.cols.set(chosen.map((choice) => ({ choice, running: true })));
    this.tavily.set(null);
    const prompt = this.prompt().trim();
    // Tavily grounding + all model calls in parallel.
    const tav = this.svc.tavily(prompt).then((t) => this.tavily.set(t));
    await Promise.all([
      tav,
      ...chosen.map(async (choice, i) => {
        const result = await this.svc.run(choice, prompt);
        this.cols.set(this.cols().map((c, j) => (j === i ? { ...c, result, running: false } : c)));
      }),
    ]);
    this.busy.set(false);
  }
}
