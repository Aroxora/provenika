import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface Mutation { mut: string; confers: string; covered_by: string; ref: string; url?: string; }
interface TargetEntry { symbol: string; context: string; mutations: Mutation[]; unmet: string; }
interface Landscape {
  generated?: string;
  source: string;
  n_targets: number;
  targets: TargetEntry[];
  disclaimer: string;
}

@Component({
  selector: 'app-resistance',
  imports: [RouterLink],
  template: `
    <section class="hero">
      @if (i18n.isZh()) {
        <div class="badge">第五个杠杆 · 领先于耐药 · 精选并引用</div>
        <h1>仅有强效结合还不够 —<br><span class="accent">要覆盖已获批药物未能覆盖的耐药。</span></h1>
        <p class="lead">
          靶向治疗很少是因为从未起效而失败；它们失败，往往是因为肿瘤演化出了<strong>耐药突变</strong>。
          因此，对一个已有药物的靶点而言，最具价值的新分子，正是能覆盖当今药物所遗漏之处的那一个——
          <strong>osimertinib</strong>（奥希替尼）之所以重要，是因为它覆盖了 EGFR <span class="mono">T790M</span>；
          <strong>pirtobrutinib</strong> 之所以重要，是因为它覆盖了 BTK <span class="mono">C481S</span>；
          <strong>ponatinib/asciminib</strong> 之所以重要，是因为它们覆盖了 ABL1 <span class="mono">T315I</span>。
          这就把“又一个强效结合物”变成了一个<strong>具体的、锚定于未满足需求的假设</strong>。
        </p>
      } @else {
        <div class="badge">The 5th lever · stay ahead of resistance · curated &amp; cited</div>
        <h1>A potent binder isn't enough —<br><span class="accent">cover the resistance the approved drugs don't.</span></h1>
        <p class="lead">
          Targeted therapies rarely fail because they never worked; they fail because the tumour evolves a
          <strong>resistance mutation</strong>. So the highest-value new molecule for an already-drugged
          target is the one that covers what today's drugs miss — <strong>osimertinib</strong> mattered
          because it covered EGFR <span class="mono">T790M</span>; <strong>pirtobrutinib</strong> because it
          covered BTK <span class="mono">C481S</span>; <strong>ponatinib/asciminib</strong> because they
          cover ABL1 <span class="mono">T315I</span>. This turns "another potent binder" into a
          <strong>specific, unmet-need-anchored hypothesis</strong>.
        </p>
      }
    </section>

    @if (landscape(); as l) {
      <section class="grid">
        @for (tg of l.targets; track tg.symbol) {
          <article class="card">
            <header class="chead">
              <h2>{{ tg.symbol }}</h2>
              @if (inPortfolio(tg.symbol)) {
                <a class="bench-chip" routerLink="/portfolio" [title]="t('we have a bench-ready hypothesis for this target', '我们已为该靶点准备好可进入实验台验证的假设')">{{ t('in portfolio →', '已纳入组合 →') }}</a>
              }
              <span class="ctx muted">{{ tg.context }}</span>
            </header>

            <div class="muts">
              @for (m of tg.mutations; track m.mut) {
                <div class="mut" [class.gap]="isGap(m)">
                  <div class="mtop">
                    <span class="mname mono">{{ m.mut }}</span>
                    @if (isGap(m)) { <span class="gap-chip">{{ t('open gap', '未覆盖缺口') }}</span> }
                  </div>
                  <p class="confers"><span class="lbl">{{ t('Confers', '赋予') }}</span> {{ m.confers }}</p>
                  <p class="covered">
                    <span class="lbl">{{ isGap(m) ? t('Not yet covered', '尚未覆盖') : t('Covered by', '覆盖药物') }}</span> {{ m.covered_by }}
                  </p>
                  <p class="ref muted">
                    @if (m.url) {
                      <a [href]="m.url" target="_blank" rel="noopener">{{ m.ref }} ↗</a>
                    } @else { {{ m.ref }} }
                  </p>
                </div>
              }
            </div>

            <p class="unmet"><span class="ulbl">{{ t('Unmet need', '未满足的需求') }}</span> {{ tg.unmet }}</p>
          </article>
        }
      </section>

      <section class="cta">
        @if (i18n.isZh()) {
          <p>
            在 <a routerLink="/targets">靶点 →</a> 上按人类遗传学挑选基因，在 <a routerLink="/portfolio">组合 →</a>
            上查看我们已写入引用假设的靶点，并在 <a routerLink="/bench">走向实验台 →</a> 上了解任一候选物将如何被验证。
          </p>
          <p class="repro muted">
            精选快照{{ l.generated ? '（' + l.generated + '）' : '' }}，来自 {{ l.source }}
            复现或扩展它：<code class="mono">python3 cad/resistance.py --json</code> —— 同一张表也会随每一次
            <code class="mono">cad/validation_package.py</code> 请求一同传递。
          </p>
        } @else {
          <p>
            Pick the gene by human genetics on <a routerLink="/targets">Targets →</a>, see which we've
            already worked into a cited hypothesis on the <a routerLink="/portfolio">Portfolio →</a>, and
            how any candidate would be tested on <a routerLink="/bench">To the Bench →</a>.
          </p>
          <p class="repro muted">
            Curated snapshot{{ l.generated ? ' (' + l.generated + ')' : '' }} from {{ l.source }}
            Reproduce or extend it: <code class="mono">python3 cad/resistance.py --json</code> — the same
            table also rides along in every <code class="mono">cad/validation_package.py</code> request.
          </p>
        }
        <p class="disc muted">{{ l.disclaimer }}</p>
      </section>
    } @else if (failed()) {
      @if (i18n.isZh()) {
        <p class="muted">无法加载耐药全景快照。可在本地复现：
          <code class="mono">python3 cad/resistance.py --json</code>。</p>
      } @else {
        <p class="muted">Couldn't load the resistance landscape snapshot. Reproduce it locally with
          <code class="mono">python3 cad/resistance.py --json</code>.</p>
      }
    } @else {
      <p class="muted">{{ t('Loading the resistance landscape…', '正在加载耐药全景…') }}</p>
    }
  `,
  styles: [`
    .hero { max-width: 900px; margin-bottom: 1.5rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.04rem; max-width:80ch; color:var(--text-dim); line-height:1.55; }
    .lead strong { color:var(--text); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:.9rem; margin-bottom:1.4rem; }
    .card { background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px; padding:.95rem 1.05rem;
      display:flex; flex-direction:column; }
    .chead { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; margin-bottom:.7rem; }
    .chead h2 { margin:0; font-size:1.3rem; color:var(--text); }
    .ctx { font-size:.82rem; flex-basis:100%; }
    .bench-chip { font-size:.62rem; font-weight:600; padding:.08rem .35rem; border-radius:4px;
      background:#281a10; color:#f0a868; border:1px solid #5e431f; text-decoration:none; vertical-align:middle; }

    .muts { display:flex; flex-direction:column; gap:.55rem; }
    .mut { border:1px solid #24344a; border-left:3px solid var(--accent); border-radius:8px;
      padding:.55rem .7rem; background:#0f1722; }
    .mut.gap { border-left-color:#f0a868; }
    .mtop { display:flex; align-items:center; gap:.5rem; margin-bottom:.25rem; }
    .mname { font-weight:700; font-size:.92rem; color:var(--text); }
    .gap-chip { font-size:.6rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
      padding:.06rem .35rem; border-radius:4px; background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .confers, .covered, .ref { font-size:.86rem; line-height:1.45; margin:.12rem 0; }
    .lbl { display:inline-block; font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
      color:var(--text-dim); margin-right:.4rem; }
    .covered { color:var(--text); } .mut.gap .covered { color:#f3c18a; }
    .ref { font-size:.78rem; } .ref a { color:var(--accent); text-decoration:none; } .ref a:hover { text-decoration:underline; }

    .unmet { margin-top:.7rem; padding:.55rem .7rem; border-radius:8px; background:#11231c;
      border:1px solid #1f5e44; font-size:.88rem; line-height:1.45; color:var(--text); }
    .ulbl { display:inline-block; font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
      color:var(--accent); margin-right:.4rem; }

    .cta { max-width:900px; } .cta p { line-height:1.55; } .cta a { color:var(--accent); }
    .repro, .disc { font-size:.82rem; max-width:82ch; }
  `]
})
export class Resistance {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;
  private http = inject(HttpClient);
  readonly landscape = signal<Landscape | null>(null);
  readonly failed = signal(false);

  // Targets already worked into a bench-ready hypothesis (kept in sync with /portfolio and /targets).
  private readonly portfolio = new Set(['BTK', 'BRAF', 'KRAS', 'PIK3CA', 'EGFR', 'ERBB2']);

  constructor() {
    firstValueFrom(this.http.get<Landscape>('/data/resistance-landscape.json'))
      .then(l => this.landscape.set(l))
      .catch(() => this.failed.set(true));
  }

  inPortfolio(sym: string): boolean { return this.portfolio.has(sym); }

  // A mutation is a live gap when no approved agent covers it — read from the curated `covered_by` text,
  // never invented. Mirrors the language the curation uses ("no approved", "investigational", "frontier").
  isGap(m: Mutation): boolean { return /no approved|investigational|open frontier/i.test(m.covered_by); }
}
