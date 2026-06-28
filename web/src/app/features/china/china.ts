import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';

interface Cancer {
  key: string; name: string; cn: string; mortality_rank: number | null;
  new_cases_2022: number | null; asmr_2022: number | null; driver: string;
  prevention: string; druggable: boolean; china_note: string;
}
interface Lab { name: string; url: string; note: string; }
interface BenchStep { step: string; title: string; cn: string; labs: Lab[]; }
interface Registry { name: string; url: string; note: string; }
interface ChinaData {
  source: string; source_url: string;
  totals: { new_cases_2022: number; deaths_2022: number; top5_death_share_pct: number; top5_case_share_pct: number };
  cancers: Cancer[]; prevention_first: string[]; prevention_readout: string; disclaimer: string;
  bench_path_cn?: BenchStep[]; suppliers_cn?: Lab[]; suppliers_note_cn?: string;
  registry_cn?: Registry; region_note_cn?: string; reachability_note_cn?: string;
}
interface PanelRow {
  symbol: string; genetic_score: number | null; china_cancer: string | null;
  china_cancer_cn: string | null; china_death_rank: number | null; url?: string; error?: string;
}

@Component({
  selector: 'app-china',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">中国 · cure the cancers that actually kill here</div>
      <h1>Cure cancer where it actually kills —<br><span class="accent">China's burden, not the West's.</span></h1>
      <p class="lead">
        To cure cancer in China you first work on the <strong>right cancers</strong>: China's burden differs
        sharply from the West. In 2022 China had <strong>~4.82M</strong> new cancer cases and
        <strong>~2.57M</strong> cancer deaths — the five leading causes of cancer <em>death</em> (lung,
        liver, stomach, colorectum, oesophagus) are <strong>67.5%</strong> of them
        (<a [href]="srcUrl()" target="_blank" rel="noopener">Han et al., J Natl Cancer Center 2024</a>).
        This grounds the genetically-validated targets in the diseases with the most lives at stake — and
        is honest that for several of them <strong>prevention, not a new molecule, is the proven lever</strong>.
      </p>
    </section>

    @if (china(); as c) {
      @if (c.reachability_note_cn) {
        <section class="reach">
          <span class="rtag">在中国访问 · reachability</span>
          <p>{{ c.reachability_note_cn }}</p>
        </section>
      }

      <section class="cancers">
        @for (k of c.cancers; track k.key) {
          <article class="cancer" [class.prevent]="!k.druggable">
            <header class="chead">
              <h2>{{ k.name }} <span class="cn">{{ k.cn }}</span></h2>
              @if (k.mortality_rank) {
                <span class="rank" title="rank among China's leading causes of cancer death, 2022">death #{{ k.mortality_rank }}</span>
              } @else {
                <span class="rank inc" title="below the mortality top-5, but high incidence">high incidence</span>
              }
              @if (k.new_cases_2022) { <span class="cases">{{ fmtNum(k.new_cases_2022) }} new cases / yr</span> }
            </header>

            <p class="note">{{ k.china_note }}</p>

            <div class="lever">
              <span class="lv-lbl prevent">Prevention</span>{{ k.prevention }}
            </div>

            @if (k.druggable) {
              @if (targetsFor(k.name).length) {
                <div class="targets">
                  <span class="t-lbl">Genetically-validated targets</span>
                  @for (t of targetsFor(k.name); track t.symbol) {
                    <span class="tgt">
                      <a [href]="t.url" target="_blank" rel="noopener" class="tsym">{{ t.symbol }}</a>
                      @if (t.genetic_score !== null) {
                        <span class="gs" [class]="band(t.genetic_score)">{{ t.genetic_score.toFixed(2) }}</span>
                      }
                      @if (inPortfolio(t.symbol)) { <a routerLink="/portfolio" class="mini bench" title="bench-ready hypothesis">portfolio</a> }
                      @if (hasResistance(t.symbol)) { <a routerLink="/resistance" class="mini resist" title="resistance gap to cover">resist</a> }
                    </span>
                  }
                </div>
              } @else {
                <p class="t-none muted">Targetable biology exists; no panel-ranked target mapped here yet.</p>
              }
            } @else {
              <p class="t-none prevent-note">Hard to drug — a targeted-therapy hypothesis is the complement here, not the headline.</p>
            }
          </article>
        }
      </section>

      <section class="readout">
        <span class="ro-lbl">Honest read-out</span>
        <p>{{ c.prevention_readout }}</p>
      </section>

      @if (c.bench_path_cn?.length) {
        <section class="bench">
          <h2>Test it inside China — the domestic bench path</h2>
          <p class="muted bench-note">{{ c.region_note_cn }}</p>
          <div class="steps">
            @for (s of c.bench_path_cn; track s.step; let i = $index) {
              <div class="step">
                <div class="shead"><span class="sn">{{ i + 1 }}</span><h3>{{ s.title }} <span class="cn">{{ s.cn }}</span></h3></div>
                @for (l of s.labs; track l.name) {
                  <a class="lab" [href]="l.url" target="_blank" rel="noopener">
                    <span class="lname">{{ l.name }}</span><span class="lnote muted">{{ l.note }}</span>
                  </a>
                }
              </div>
            }
          </div>

          @if (c.suppliers_cn?.length) {
            <div class="suppliers">
              <h3>Source the compounds domestically <span class="cn">国内采购</span></h3>
              <p class="muted">{{ c.suppliers_note_cn }}</p>
              <div class="sup-grid">
                @for (s of c.suppliers_cn; track s.name) {
                  <a class="lab" [href]="s.url" target="_blank" rel="noopener">
                    <span class="lname">{{ s.name }}</span><span class="lnote muted">{{ s.note }}</span>
                  </a>
                }
              </div>
            </div>
          }
          @if (c.registry_cn) {
            <p class="registry">Clinical-stage registry:
              <a [href]="c.registry_cn.url" target="_blank" rel="noopener">{{ c.registry_cn.name }}</a> — {{ c.registry_cn.note }}.</p>
          }
        </section>
      }

      <section class="foot">
        <p class="repro muted">
          Reproduce: <code class="mono">python3 cad/china_burden.py --json</code> ·
          targets from <a routerLink="/targets">the genetics-ranked panel →</a> ·
          in-China request: <code class="mono">cad/validation_package.py --run &lt;dir&gt; --region cn</code>.
          Source: <a [href]="srcUrl()" target="_blank" rel="noopener">{{ c.source }}</a>
        </p>
        <p class="disc muted">{{ c.disclaimer }}</p>
      </section>
    } @else if (failed()) {
      <p class="muted">Couldn't load the China snapshot. Reproduce locally with <code class="mono">python3 cad/china_burden.py --json</code>.</p>
    } @else {
      <p class="muted">Loading China's cancer-burden lens…</p>
    }
  `,
  styles: [`
    .hero { max-width:900px; margin-bottom:1.3rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#2a1116; color:#ff6b81; border:1px solid #5e1f2b; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.04rem; max-width:82ch; color:var(--text-dim); line-height:1.55; }
    .lead strong, .lname, .tsym, .chead h2, .note, .readout p { color:var(--text); }
    a { color:var(--accent); }
    .mono { font-family:var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }
    .cn { font-size:.85em; color:var(--text-dim); }

    .reach { max-width:900px; margin-bottom:1.2rem; background:#2a1116; border:1px solid #5e1f2b;
      border-left:3px solid #ff6b81; border-radius:8px; padding:.6rem .85rem; }
    .reach p { margin:.2rem 0 0; font-size:.88rem; line-height:1.5; color:var(--text); }

    .cancers, .steps, .sup-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:.8rem; }
    .cancers { margin-bottom:1.3rem; }
    .cancer { background:var(--bg-elev); border:1px solid #1c2738; border-top:3px solid var(--accent);
      border-radius:12px; padding:.95rem 1.05rem; }
    .cancer.prevent { border-top-color:#6fb6ff; }
    .chead { display:flex; align-items:center; flex-wrap:wrap; gap:.5rem; margin-bottom:.5rem; }
    .chead h2 { margin:0; font-size:1.2rem; }
    .rank { font-size:.62rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase; padding:.1rem .4rem;
      border-radius:5px; background:#2a1116; color:#ff8a9b; border:1px solid #5e1f2b; }
    .rank.inc { background:#10202c; color:#6fb6ff; border-color:#1f456e; }
    .cases { font-size:.76rem; color:var(--text-dim); font-family:var(--mono); }
    .note { font-size:.9rem; line-height:1.5; margin:.1rem 0 .55rem; }
    .lever { font-size:.86rem; line-height:1.45; color:var(--text-dim); margin-bottom:.55rem; }
    .lv-lbl, .t-lbl, .ro-lbl, .rtag { display:inline-block; font-size:.6rem; font-weight:700;
      letter-spacing:.04em; text-transform:uppercase; }
    .lv-lbl { padding:.06rem .35rem; border-radius:4px; margin-right:.4rem; background:#10202c; color:#6fb6ff; border:1px solid #1f456e; }
    .rtag { color:#ff8a9b; }

    .targets { display:flex; flex-wrap:wrap; gap:.35rem; align-items:center; }
    .t-lbl { color:var(--text-dim); width:100%; margin-bottom:.1rem; }
    .tgt { display:inline-flex; align-items:center; gap:.25rem; background:#0f1722; border:1px solid #24344a;
      border-radius:6px; padding:.1rem .4rem; }
    .tsym { font-weight:700; font-size:.82rem; text-decoration:none; } .tsym:hover { color:var(--accent); }
    .gs { font-family:var(--mono); font-size:.7rem; color:var(--text-dim); }
    .gs.strong { color:var(--accent); } .gs.mod { color:#f0a868; }
    .mini { font-size:.58rem; font-weight:700; text-transform:uppercase; text-decoration:none; padding:.02rem .25rem; border-radius:3px; }
    .mini.bench { color:#f0a868; border:1px solid #5e431f; } .mini.resist { color:#ff8a9b; border:1px solid #5e1f2b; }
    .prevent-note { color:#9cc3e6; }

    .readout { max-width:900px; margin-bottom:1.4rem; background:#0f1a14; border:1px solid #1f5e44;
      border-left:3px solid var(--accent); border-radius:8px; padding:.65rem .9rem; }
    .ro-lbl { color:var(--accent); margin-right:.4rem; }
    .readout p { display:inline; font-size:.9rem; line-height:1.5; }

    .bench { max-width:1000px; margin-bottom:1.3rem; } .bench h2 { font-size:1.4rem; margin-bottom:.3rem; }
    .step { background:var(--bg-elev); border:1px solid #1c2738; border-radius:10px; padding:.7rem .8rem; }
    .shead { display:flex; align-items:center; gap:.5rem; margin-bottom:.45rem; }
    .sn { display:grid; place-items:center; width:1.5rem; height:1.5rem; border-radius:7px; background:#0f1722;
      border:1px solid #24344a; font-weight:700; font-size:.8rem; color:var(--accent); }
    .shead h3 { margin:0; font-size:.98rem; }
    .lab { display:flex; flex-direction:column; gap:.05rem; padding:.4rem .5rem; margin-top:.35rem; border:1px solid #24344a;
      border-radius:7px; background:#0f1722; text-decoration:none; } .lab:hover { border-color:var(--accent); }
    .lname { font-weight:600; font-size:.84rem; } .lnote { font-size:.76rem; line-height:1.35; }
    .suppliers { margin-top:1rem; } .suppliers h3 { font-size:1.1rem; margin:0 0 .2rem; }
    .registry { font-size:.85rem; margin-top:.8rem; color:var(--text-dim); }

    .foot { max-width:900px; } .repro, .disc { font-size:.82rem; max-width:84ch; line-height:1.5; }
  `]
})
export class China {
  private http = inject(HttpClient);
  readonly china = signal<ChinaData | null>(null);
  readonly failed = signal(false);
  private readonly panel = signal<PanelRow[]>([]);

  private readonly portfolio = new Set(['BTK', 'BRAF', 'KRAS', 'PIK3CA', 'EGFR', 'ERBB2']);
  private readonly resistance = new Set(['EGFR', 'BTK', 'ABL1', 'ALK', 'KRAS']);

  // China cancer name -> panel targets mapped to it, strongest genetic support first.
  private readonly byCancer = computed(() => {
    const m = new Map<string, PanelRow[]>();
    for (const r of this.panel()) {
      if (r.error || !r.china_cancer) continue;
      (m.get(r.china_cancer) ?? m.set(r.china_cancer, []).get(r.china_cancer)!).push(r);
    }
    for (const rows of m.values()) rows.sort((a, b) => (b.genetic_score ?? 0) - (a.genetic_score ?? 0));
    return m;
  });

  constructor() {
    firstValueFrom(this.http.get<ChinaData>('/data/china.json'))
      .then(c => this.china.set(c))
      .catch(() => this.failed.set(true));
    firstValueFrom(this.http.get<{ ranked: PanelRow[] }>('/data/target-panel.json'))
      .then(p => this.panel.set(p.ranked ?? []))
      .catch(() => { /* targets are an enhancement; the burden lens stands without them */ });
  }

  srcUrl(): string { return this.china()?.source_url ?? 'https://pubmed.ncbi.nlm.nih.gov/39036382/'; }
  targetsFor(cancerName: string): PanelRow[] { return this.byCancer().get(cancerName) ?? []; }
  inPortfolio(sym: string): boolean { return this.portfolio.has(sym); }
  hasResistance(sym: string): boolean { return this.resistance.has(sym); }
  band(s: number): string { return s >= 0.5 ? 'strong' : s >= 0.2 ? 'mod' : 'weak'; }
  fmtNum(n: number): string { return n.toLocaleString('en-US'); }
}
