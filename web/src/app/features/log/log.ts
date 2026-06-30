import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface TimelineEvent { date: string; event: string; label?: string; }
interface OutreachEntry {
  id: string; name: string | null; firm: string | null; category: string;
  status: string; first_contacted: string | null; last_update: string | null;
  touches: number; replied: boolean; public_note?: string; timeline: TimelineEvent[];
}
interface OutreachLog {
  generated: string; note: string;
  totals: { contacted: number; replied: number; interested: number; in_pipeline: number; bounced?: number };
  entries: OutreachEntry[];
}

interface Service { name: string; status: 'ok' | 'warn' | 'fail'; detail: string; }
interface StatusDoc {
  generated: string;
  overall: 'ok' | 'warn' | 'fail';
  services: Service[];
  switch: { send_enabled: boolean; auto_reply_enabled: boolean; source: string };
  pipeline: { contacts: number; drafts: number; sent: number; replied: number; bounced: number };
}

@Component({
  selector: 'app-agent-log',
  imports: [RouterLink],
  template: `
    <div class="hero">
      <h1>{{ t('Agent activity — in the open', '代理活动 —— 全程公开') }}</h1>
      <p class="lead">
        @if (i18n.isZh()) {
          本项目言行一致。一个自主代理代表创始人开展外联。每一条经脱敏的联系记录、回复以及系统健康状态都在此公开，任何人都可以审计这一流程。<strong>电子邮件地址与邮件正文从不对外公开。</strong>
        } @else {
          This project practices what it preaches. An autonomous agent runs outreach on behalf of the founder.
          Every redacted contact, reply, and system health state is published here so anyone can audit the process.
          <strong>No email addresses or message bodies are ever made public.</strong>
        }
      </p>
    </div>

    @if (status(); as s) {
      <!-- Prominent current state -->
      <div class="state-banner card" [class.paused]="isPaused()">
        @if (isPaused()) {
          <div class="banner-head">
            <span class="pill paused">{{ t('PAUSED', '已暂停') }}</span>
            <strong>{{ t('Agent is currently paused by the owner', '代理当前已被所有者暂停') }}</strong>
          </div>
          <p class="banner-body">
            @if (i18n.isZh()) {
              发送 + 自动回复均为<strong>关闭</strong>。已为 {{ s.pipeline.contacts }} 个联系人准备了 {{ s.pipeline.drafts }} 份草稿。尚未发送任何邮件。这是正常的静默状态。
            } @else {
              Send + auto-reply are <strong>OFF</strong>. {{ s.pipeline.drafts }} drafts are prepared for {{ s.pipeline.contacts }} contacts.
              No messages have been sent. This is the normal resting state.
            }
          </p>
        } @else {
          <div class="banner-head">
            <span class="pill" [class.active]="s.switch.send_enabled">{{ t('ACTIVE', '运行中') }}</span>
            <strong>{{ t('Agent is running', '代理正在运行') }}</strong>
          </div>
          <p class="banner-body muted">{{ t('The 24/7 monitor is active and will send approved drafts within limits.', '全天候监控已激活，将在限额内发送已批准的草稿。') }}</p>
        }
        <div class="banner-meta muted">
          @if (i18n.isZh()) {
            数据截至 {{ s.generated }} · 开关来源：{{ s.switch.source }}
            · <a routerLink="/admin">管理开关</a>
          } @else {
            Data as of {{ s.generated }} · Switch source: {{ s.switch.source }}
            · <a routerLink="/admin">Manage switch</a>
          }
        </div>
      </div>

      <!-- Service health (neutral presentation) -->
      <h2 class="sec">{{ t('Service health', '服务健康状态') }}</h2>
      <div class="svcs">
        @for (svc of s.services; track svc.name) {
          <div class="svc card" [class]="svcStatusClass(svc)">
            <div class="dot" [class]="svc.status"></div>
            <div>
              <div class="nm">{{ svc.name }}</div>
              <div class="dt muted">{{ friendlyDetail(svc) }}</div>
            </div>
          </div>
        }
      </div>

      <!-- Pipeline snapshot -->
      <h2 class="sec">{{ t('Preparation & activity', '准备与活动') }}</h2>
      <div class="pipe card">
        <div class="stat">
          <div class="n">{{ s.pipeline.contacts }}</div>
          <div class="l muted">{{ t('prospects in list', '名单中的潜在对象') }}</div>
        </div>
        <div class="stat">
          <div class="n">{{ s.pipeline.drafts }}</div>
          <div class="l muted">{{ t('drafts prepared', '已准备草稿') }}</div>
        </div>
        <div class="stat">
          <div class="n">{{ s.pipeline.sent }}</div>
          <div class="l muted">{{ t('sent', '已发送') }}</div>
        </div>
        <div class="stat">
          <div class="n">{{ s.pipeline.replied }}</div>
          <div class="l muted">{{ t('replied', '已回复') }}</div>
        </div>
        <div class="stat">
          <div class="n">{{ s.pipeline.bounced }}</div>
          <div class="l muted">{{ t('bounced', '已退信') }}</div>
        </div>
      </div>
    } @else if (statusMissing()) {
      <p class="muted">{{ t('No status file published yet.', '尚未发布状态文件。') }}</p>
    }

    <!-- Outreach log -->
    <h2 class="sec">
      @if (i18n.isZh()) {
        外联日志 <span class="muted">—— 已脱敏并公开</span>
      } @else {
        Outreach log <span class="muted">— redacted &amp; public</span>
      }
    </h2>
    @if (log(); as l) {
      <div class="totals">
        <div class="t card"><div class="n">{{ l.totals.in_pipeline }}</div><div class="l muted">{{ t('in pipeline', '进行中') }}</div></div>
        <div class="t card"><div class="n">{{ l.totals.contacted }}</div><div class="l muted">{{ t('contacted', '已联系') }}</div></div>
        <div class="t card"><div class="n">{{ l.totals.replied }}</div><div class="l muted">{{ t('replied', '已回复') }}</div></div>
        <div class="t card"><div class="n">{{ l.totals.interested || 0 }}</div><div class="l muted">{{ t('interested', '有意向') }}</div></div>
      </div>

      @if (l.entries && l.entries.length) {
        <div class="log">
          @for (e of l.entries; track e.id) {
            <div class="entry card">
              <div class="who">
                <strong>{{ e.name || e.id }}</strong>
                @if (e.firm) { <span class="firm muted">· {{ e.firm }}</span> }
                <span class="pill">{{ e.category }}</span>
                <span class="pill" [class.green]="e.replied">{{ e.status }}</span>
              </div>
              @if (e.public_note) { <div class="note">{{ e.public_note }}</div> }
              <div class="timeline">
                @for (ev of e.timeline; track $index) {
                  <span class="ev" [class.reply]="ev.event === 'reply'">{{ ev.date }} {{ ev.event }}@if (ev.label){ <em>({{ ev.label }})</em> }</span>
                }
              </div>
              <div class="meta muted">
                @if (i18n.isZh()) {
                  {{ e.touches }} 次触达 · 最近 {{ e.last_update }}
                } @else {
                  {{ e.touches }} touches · last {{ e.last_update }}
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state card">
          <div class="empty-icon">◉</div>
          <h3>{{ t('No activity published yet', '尚无已公开的活动') }}</h3>
          <p>
            {{ t('This log only records real sends and inbound replies (fully redacted). When the owner flips the agent switch ON and approves the first drafts, the first entries will appear here automatically.', '本日志仅记录真实的发送与收到的回复（完全脱敏）。当所有者将代理开关置于开启并批准首批草稿后，首批条目将自动显示于此。') }}
          </p>
          <p class="muted small">
            @if (i18n.isZh()) {
              更新于 {{ l.generated }}。本页面的存在——即便为空——本身就是意义所在。
            } @else {
              Updated {{ l.generated }}. The presence of this page — even when empty — is the point.
            }
          </p>
        </div>
      }
    } @else {
      <p class="muted">{{ t('Loading log…', '正在加载日志…') }}</p>
    }

    <div class="explain card">
      <h3>{{ t('How the agent works', '代理如何工作') }}</h3>
      <p>
        @if (i18n.isZh()) {
          一个全天候监控程序（Mac + launchd）通过 Proton Bridge 监视收件箱。它读取 Firestore 开关（<code>control/outreach</code>），为已批准的潜在对象起草首次接触邮件，并在严格的速率限制内自动回复收到的邮件——对于主动冷外联，<strong>仅在人工批准之后</strong>才会进行。
        } @else {
          A 24/7 monitor (Mac + launchd) watches an inbox via Proton Bridge. It reads the Firestore switch
          (<code>control/outreach</code>), drafts first-touch emails for approved prospects, and auto-replies to inbound
          within strict rate limits — <strong>only after human approval</strong> for cold outreach.
        }
      </p>
      <p class="muted small">
        @if (i18n.isZh()) {
          所有进入发送阶段或产生回复的内容，都会汇总到上面的公开 JSON 文件中。完整源代码：仓库中的 <a href="https://github.com/Aroxora/provenika/tree/main/outreach" target="_blank" rel="noopener">outreach/</a>。同样的“要么计算、要么引用，绝不臆断”原则也适用于运营。
        } @else {
          Everything that reaches the send stage or generates a reply is summarized into the public JSON files above.
          Full source: <a href="https://github.com/Aroxora/provenika/tree/main/outreach" target="_blank" rel="noopener">outreach/</a> in the repo.
          The same “compute or cite, never assert” rule applies to operations.
        }
      </p>
    </div>
  `,
  styles: [`
    .hero { max-width: 780px; margin-bottom: 1.2rem; }
    .hero h1 { margin-bottom: .25rem; }
    .lead { max-width: 70ch; color: var(--text-dim); }

    .state-banner {
      margin-bottom: 1.1rem;
      background: linear-gradient(145deg, var(--bg-elev), #0f1722);
    }
    .banner-head { display: flex; align-items: center; gap: .6rem; margin-bottom: .35rem; }
    .banner-head strong { font-size: 1.05rem; }
    .banner-body { margin: 0 0 .4rem; }
    .banner-meta { font-size: .78rem; }

    .pill { font-size: .72rem; padding: .15rem .55rem; border-radius: 999px; border: 1px solid var(--border); }
    .pill.paused { color: #f0b060; border-color: #5e451f; background: #241c0e; }
    .pill.active { color: var(--accent); border-color: #1f5e44; background: #0c2119; }

    .sec { margin: 1.3rem 0 .45rem; font-size: 1.05rem; }

    .svcs { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: .5rem; margin-bottom: .9rem; }
    .svc { display: flex; gap: .5rem; align-items: center; }
    .svc .nm { font-weight: 600; }
    .svc .dt { font-size: .78rem; }
    .svc.paused .dot { background: #f0b060; }

    .dot { width: 12px; height: 12px; border-radius: 50%; background: #666; flex: 0 0 12px; }
    .dot.ok { background: #3ddc97; }
    .dot.warn { background: #f0b060; }
    .dot.fail { background: #ff6b6b; }

    .pipe { display: flex; gap: .55rem; flex-wrap: wrap; margin-bottom: .9rem; }
    .pipe .stat { text-align: center; min-width: 78px; }
    .pipe .n { font-size: 1.35rem; font-weight: 700; font-family: var(--mono); color: var(--accent); }
    .pipe .l { font-size: .72rem; color: var(--text-dim); }

    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: .5rem; margin-bottom: .7rem; }
    .t { text-align: center; }
    .t .n { font-size: 1.45rem; font-weight: 700; color: var(--accent); }
    .t .l { font-size: .7rem; }

    .log { display: grid; gap: .5rem; margin-bottom: .6rem; }
    .entry { display: grid; gap: .3rem; }
    .who { display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
    .firm { font-size: .88rem; }
    .note { font-size: .86rem; }
    .timeline { display: flex; flex-wrap: wrap; gap: .3rem .45rem; }
    .ev { font-size: .76rem; padding-left: .4rem; border-left: 2px solid var(--border); color: var(--text-dim); }
    .ev.reply { border-color: var(--accent); }
    .ev em { color: var(--accent); font-style: normal; }
    .meta { font-size: .72rem; }

    .empty-state {
      text-align: center;
      padding: 1.4rem 1rem;
      max-width: 520px;
    }
    .empty-state h3 { margin: .3rem 0 .4rem; }
    .empty-icon {
      font-size: 2rem; line-height: 1; margin-bottom: .2rem; opacity: .7;
    }
    .empty-state p { max-width: 46ch; margin: 0 auto .3rem; }

    .explain { margin-top: 1rem; max-width: 720px; }
    .explain p { margin-bottom: .4rem; }
    .small { font-size: .78rem; }
  `]
})
export class AgentLog {
  private http = inject(HttpClient);
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  readonly log = signal<OutreachLog | null>(null);
  readonly status = signal<StatusDoc | null>(null);
  readonly statusMissing = signal(false);

  readonly isPaused = computed(() => {
    const s = this.status();
    return !!s && !s.switch.send_enabled;
  });

  constructor() {
    firstValueFrom(this.http.get<OutreachLog>('data/outreach/log.json'))
      .then(l => this.log.set(l))
      .catch(() => this.log.set({
        generated: '',
        note: '',
        totals: { contacted: 0, replied: 0, interested: 0, in_pipeline: 0 },
        entries: []
      }));

    firstValueFrom(this.http.get<StatusDoc>('data/outreach/status.json'))
      .then(s => this.status.set(s))
      .catch(() => this.statusMissing.set(true));
  }

  // Soften alarming labels when the agent is intentionally paused
  friendlyDetail(svc: Service): string {
    if (svc.name === 'Outreach monitor' && svc.detail === 'unavailable') {
      return this.isPaused() ? this.t('paused (switch OFF)', '已暂停（开关关闭）') : this.t('not running', '未运行');
    }
    if (svc.name === 'Firestore control' && svc.detail === 'degraded') {
      return this.isPaused() ? this.t('paused (local source)', '已暂停（本地源）') : svc.detail;
    }
    return svc.detail;
  }

  svcStatusClass(svc: Service): string {
    if ((svc.name === 'Outreach monitor' || svc.name === 'Firestore control') && this.isPaused()) {
      return 'paused';
    }
    return '';
  }
}
