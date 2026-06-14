import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeysService, Provider } from '../../core/keys.service';

@Component({
  selector: 'app-settings',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h2>Settings — your API keys</h2>
      <p class="muted">
        Save your own provider keys to run the <strong>model comparison</strong>. Keys are stored
        <strong>only in this browser</strong> (localStorage) and sent <strong>only directly</strong> to
        each model/Tavily API — never to our servers (this site is static, there is no backend). Clear
        them anytime. <strong>Tavily is required;</strong> add at least one model provider.
      </p>
    </section>

    <div class="card grid">
      @for (f of fields; track f.p) {
        <label class="row">
          <span class="lbl">{{ f.label }} @if (f.req) { <span class="req">required</span> }
            @if (saved()[f.p]) { <span class="ok">✓ saved</span> }</span>
          <span class="inrow">
            <input [type]="show()[f.p] ? 'text' : 'password'" [value]="draft()[f.p]"
                   (input)="set(f.p, $any($event.target).value)" [placeholder]="f.ph" autocomplete="off" />
            <button type="button" class="mini" (click)="toggle(f.p)">{{ show()[f.p] ? 'hide' : 'show' }}</button>
            <button type="button" class="mini" (click)="clearOne(f.p)" [disabled]="!saved()[f.p]">clear</button>
          </span>
        </label>
      }
      <div class="actions">
        <button class="primary" (click)="save()">Save keys</button>
        <button (click)="clearAll()">Clear all</button>
        @if (msg()) { <span class="msg">{{ msg() }}</span> }
      </div>
    </div>

    <div class="card cmp">
      <h3>Model comparison</h3>
      <p class="muted">Run the same prompt across 2–3 models side by side, grounded with Tavily sources.</p>
      @if (keys.ready) {
        <a routerLink="/compare"><button class="primary">Open model comparison →</button></a>
      } @else {
        <p class="muted small">Save your Tavily key and at least one model key above to unlock it.</p>
      }
    </div>

    <p class="muted foot">
      Where to get keys: DeepSeek (platform.deepseek.com), xAI (console.x.ai), OpenAI (platform.openai.com),
      Anthropic (console.anthropic.com), Tavily (tavily.com). The same keys work in the open-source CLI.
    </p>
  `,
  styles: [`
    .hero h2 { margin-top: 0; } .hero p { max-width: 80ch; }
    .grid { display: grid; gap: 0.8rem; max-width: 640px; }
    .row { display: grid; gap: 0.3rem; }
    .lbl { font-weight: 600; font-size: 0.9rem; }
    .req { color: #d29922; font-size: 0.75rem; font-weight: 400; }
    .ok { color: var(--accent); font-size: 0.75rem; font-weight: 400; }
    .inrow { display: flex; gap: 0.4rem; }
    input { flex: 1; padding: 0.45rem 0.6rem; background: var(--bg, #0d1117); color: var(--text); border: 1px solid var(--border, #2a3b34); border-radius: 6px; font-family: ui-monospace, monospace; font-size: 0.82rem; }
    .mini { font-size: 0.78rem; padding: 0.2rem 0.5rem; }
    .actions { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.4rem; }
    .msg { color: var(--accent); font-size: 0.85rem; }
    .cmp { margin-top: 1rem; } .cmp h3 { margin-top: 0; }
    .small { font-size: 0.85rem; } .foot { font-size: 0.8rem; margin-top: 1rem; max-width: 80ch; }
  `],
})
export class Settings {
  readonly keys = inject(KeysService);
  readonly fields: { p: Provider; label: string; req?: boolean; ph: string }[] = [
    { p: 'tavily', label: 'Tavily', req: true, ph: 'tvly-...' },
    { p: 'deepseek', label: 'DeepSeek', ph: 'sk-...' },
    { p: 'xai', label: 'xAI (Grok)', ph: 'xai-...' },
    { p: 'openai', label: 'OpenAI', ph: 'sk-...' },
    { p: 'anthropic', label: 'Anthropic', ph: 'sk-ant-...' },
  ];
  readonly draft = signal<Record<string, string>>({ ...this.keys.keys() });
  readonly saved = signal<Record<string, string>>({ ...this.keys.keys() });
  readonly show = signal<Record<string, boolean>>({});
  readonly msg = signal('');

  set(p: Provider, v: string) { this.draft.set({ ...this.draft(), [p]: v }); }
  toggle(p: Provider) { this.show.set({ ...this.show(), [p]: !this.show()[p] }); }
  save() {
    this.keys.save(this.draft() as any);
    this.saved.set({ ...this.keys.keys() });
    this.msg.set('Saved to this browser.');
    setTimeout(() => this.msg.set(''), 2500);
  }
  clearOne(p: Provider) {
    this.keys.clearOne(p);
    this.draft.set({ ...this.draft(), [p]: '' });
    this.saved.set({ ...this.keys.keys() });
  }
  clearAll() {
    this.keys.clearAll();
    this.draft.set({ ...this.keys.keys() });
    this.saved.set({ ...this.keys.keys() });
    this.msg.set('Cleared.');
    setTimeout(() => this.msg.set(''), 2500);
  }
}
