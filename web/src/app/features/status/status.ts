import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface Service { name: string; status: 'ok' | 'warn' | 'fail'; detail: string }
interface StatusDoc {
  generated: string;
  overall: 'ok' | 'warn' | 'fail';
  services: Service[];
  switch: { send_enabled: boolean; auto_reply_enabled: boolean; source: string };
  pipeline: { contacts: number; drafts: number; sent: number; replied: number; bounced: number };
}

@Component({
  selector: 'app-status',
  imports: [RouterLink],
  template: `
    <section class="hero card">
      <h2>Service status</h2>
      <p class="muted">
        Live health of the outreach service — written by the agent's own health check
        (<code>outreach/cli.py health</code>) and the 24/7 monitor. Redacted &amp; public: no secrets,
        no addresses, no message contents. Counts are real.
      </p>
    </section>

    @if (doc(); as d) {
      <div class="overall card" [class]="d.overall">
        <span class="dot"></span>
        <strong>{{ d.overall === 'ok' ? 'All systems operational' : d.overall === 'warn' ? 'Degraded' : 'Service issue' }}</strong>
        <span class="muted">— as of {{ d.generated }}</span>
      </div>

      <h3 class="sec-h">Services</h3>
      <div class="svcs">
        @for (s of d.services; track s.name) {
          <div class="card svc">
            <span class="dot" [class]="s.status"></span>
            <div><div class="nm">{{ s.name }}</div><div class="muted dt">{{ s.detail }}</div></div>
          </div>
        }
      </div>

      <h3 class="sec-h">Agent switch</h3>
      <div class="card switch">
        Sending: <strong [class.on]="d.switch.send_enabled">{{ d.switch.send_enabled ? 'ON' : 'OFF' }}</strong> ·
        Auto-reply: <strong [class.on]="d.switch.auto_reply_enabled">{{ d.switch.auto_reply_enabled ? 'ON' : 'OFF' }}</strong>
        <span class="muted">(source: {{ d.switch.source }})</span>
        <span class="muted"> — owner controls this on the <a routerLink="/admin">Admin</a> tab.</span>
      </div>

      <h3 class="sec-h">Pipeline</h3>
      <div class="stats">
        <div class="stat card"><div class="n">{{ d.pipeline.contacts }}</div><div class="muted">contacts</div></div>
        <div class="stat card"><div class="n">{{ d.pipeline.drafts }}</div><div class="muted">drafts</div></div>
        <div class="stat card"><div class="n">{{ d.pipeline.sent }}</div><div class="muted">sent</div></div>
        <div class="stat card"><div class="n">{{ d.pipeline.replied }}</div><div class="muted">replied</div></div>
        <div class="stat card"><div class="n">{{ d.pipeline.bounced }}</div><div class="muted">bounced</div></div>
      </div>
    } @else if (missing()) {
      <p class="muted">No status published yet. Run <code>python3 outreach/cli.py health</code> or start the monitor.</p>
    } @else {
      <p class="muted">Loading…</p>
    }
  `,
  styles: [`
    .hero h2 { margin-top: 0; } .hero p { max-width: 80ch; }
    .overall { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; }
    .sec-h { margin: 1.4rem 0 0.7rem; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--text-dim); flex-shrink: 0; }
    .dot.ok, .overall.ok .dot { background: #3fb950; } .dot.warn, .overall.warn .dot { background: #d29922; }
    .dot.fail, .overall.fail .dot { background: #f85149; }
    .svcs { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.6rem; }
    .svc { display: flex; align-items: center; gap: 0.6rem; } .svc .nm { font-weight: 600; } .svc .dt { font-size: 0.8rem; }
    .switch strong { color: var(--text-dim); } .switch strong.on { color: var(--accent); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.6rem; }
    .stat { text-align: center; } .stat .n { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
  `],
})
export class Status {
  private http = inject(HttpClient);
  readonly doc = signal<StatusDoc | null>(null);
  readonly missing = signal(false);
  constructor() {
    firstValueFrom(this.http.get<StatusDoc>('data/outreach/status.json'))
      .then((d) => this.doc.set(d))
      .catch(() => this.missing.set(true));
  }
}
