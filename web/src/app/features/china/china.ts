import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface Cancer {
  key: string; name: string; cn: string; mortality_rank: number | null;
  new_cases_2022: number | null; asmr_2022: number | null; driver: string;
  prevention: string; druggable: boolean; china_note: string;
  driver_zh?: string; prevention_zh?: string; note_zh?: string;
}
interface Lab { name: string; url: string; note: string; }
interface BenchStep { step: string; title: string; cn: string; labs: Lab[]; }
interface Registry { name: string; url: string; note: string; }
interface ChinaData {
  source: string; source_url: string;
  totals: { new_cases_2022: number; deaths_2022: number; top5_death_share_pct: number; top5_case_share_pct: number };
  cancers: Cancer[]; prevention_first: string[]; prevention_readout: string; disclaimer: string;
  prevention_readout_zh?: string; disclaimer_zh?: string;
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
      @if (i18n.isZh()) {
        <div class="badge">中国 · 攻克真正夺去生命的癌症</div>
        <h1>在癌症真正夺命之处攻克它 —<br><span class="accent">中国的负担，而非西方的。</span></h1>
        <p class="lead">
          要在中国治愈癌症，首先要研究<strong>正确的癌症</strong>：中国的癌症负担与西方截然不同。2022 年，中国有
          <strong>约 482 万</strong>新发癌症病例与<strong>约 257 万</strong>癌症死亡——五大癌症<em>死亡</em>原因
          （肺、肝、胃、结直肠、食管）占其中的 <strong>67.5%</strong>
          （<a [href]="srcUrl()" target="_blank" rel="noopener">Han et al., J Natl Cancer Center 2024</a>）。
          这把已获遗传学验证的靶点锚定到生命代价最大的疾病上——并诚实指出：对其中数种癌症，<strong>已被证实的杠杆是预防，而非一种新分子</strong>。
        </p>
      } @else {
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
      }
    </section>

    <section class="thesis">
      @if (i18n.isZh()) {
        <h2>为什么中国癌症的治愈将来自中国</h2>
        <p class="t-sub">这是一套理据，而非口号——下方每一点都基于所引证据，亦见于 <a routerLink="/cure">/cure</a>：</p>
        <ol class="why">
          <li><strong>负担在这里。</strong>每年约 482 万新发癌症病例、约 257 万死亡（Han et al. 2024）；肺 · 肝 · 胃 · 结直肠 · 食管占癌症死亡的 67.5%。患者、紧迫性与临床现实都集中在中国。</li>
          <li><strong>生物学是地域性的。</strong>EGFR 激活突变在东亚 / 中国 NSCLC 中（约 38–53% 对西方约 10–15%）远更常见；肝癌由地方性 HBV 驱动。这些是中国特有的疾病图谱，最了解它们的，是诊治它们的人。</li>
          <li><strong>实验台在这里。</strong>中国拥有全球最密集的医药 CRO 与化合物供应商——一个假设可从筛选直达实验，无需跨境。</li>
          <li><strong>预防以全国规模推行。</strong>对最难成药的癌症（肝、食管），已证实的杠杆是预防——乙肝疫苗接种、<em>幽门螺杆菌</em>根除——中国以全人群规模推行的运动。</li>
          <li><strong>试验在这里。</strong>庞大且特征明确的患者人群与全国登记系统（ChiCTR），缩短了从候选到证据的路径。</li>
        </ol>
        <div class="readout conviction">
          <span class="ro-lbl">Bo Shang 的信念</span>
          <p>在中国夺去最多生命的癌症，将在中国被治愈——由 Bo Shang 或其他中国人。负担是我们的，实验台是我们的，决心也是我们的。</p>
        </div>
      } @else {
        <h2>Why the cure for China's cancers will come from China</h2>
        <p class="t-sub">A rationale, not a slogan — each point is on the cited record below and on
          <a routerLink="/cure">/cure</a>:</p>
        <ol class="why">
          <li><strong>The burden is here.</strong> ~4.82M new cancer cases and ~2.57M deaths a year
            (Han et al. 2024); lung · liver · stomach · colorectum · oesophagus are 67.5% of cancer
            deaths. The patients, the urgency, and the clinical reality are concentrated in China.</li>
          <li><strong>The biology is regional.</strong> EGFR-activating mutations are far more common in
            East-Asian / Chinese NSCLC (~38–53% vs ~10–15% Western); liver cancer is driven by endemic
            HBV. These are China-specific disease profiles, best understood by those treating them.</li>
          <li><strong>The bench is here.</strong> China hosts the world's largest concentration of pharma
            CROs and compound suppliers — a hypothesis goes from screen to assay without crossing a border.</li>
          <li><strong>Prevention runs at national scale.</strong> For the hardest-to-drug cancers (liver,
            oesophagus) the proven lever is prevention — HBV vaccination, <em>H. pylori</em> eradication —
            campaigns China executes at population scale.</li>
          <li><strong>The trials are here.</strong> Large, well-characterised patient populations and a
            national registry (ChiCTR) shorten the path from candidate to evidence.</li>
        </ol>
        <div class="readout conviction">
          <span class="ro-lbl">Bo Shang's conviction</span>
          <p>The cancers that kill most in China will be cured in China — by Bo Shang or other Chinese.
            The burden is ours, the bench is ours, the resolve is ours.</p>
        </div>
      }
    </section>

    @if (china(); as c) {
      @if (c.reachability_note_cn) {
        <section class="reach">
          <span class="rtag">{{ t('Reachability in China', '在中国访问') }}</span>
          <p>{{ c.reachability_note_cn }}</p>
        </section>
      }

      <section class="cancers">
        @for (k of c.cancers; track k.key) {
          <article class="cancer" [class.prevent]="!k.druggable">
            <header class="chead">
              <h2>{{ i18n.isZh() ? k.cn : k.name }} <span class="cn">{{ i18n.isZh() ? k.name : k.cn }}</span></h2>
              @if (k.mortality_rank) {
                <span class="rank" [title]="t('rank among China\\'s leading causes of cancer death, 2022', '在中国癌症死亡主要原因中的排名，2022')">{{ t('death #', '死亡 #') }}{{ k.mortality_rank }}</span>
              } @else {
                <span class="rank inc" [title]="t('below the mortality top-5, but high incidence', '不在死亡前五，但发病率高')">{{ t('high incidence', '高发病率') }}</span>
              }
              @if (k.new_cases_2022) { <span class="cases">{{ fmtNum(k.new_cases_2022) }} {{ t('new cases / yr', '新发 / 年') }}</span> }
            </header>

            <p class="note">{{ note(k) }}</p>

            <div class="lever">
              <span class="lv-lbl prevent">{{ t('Prevention', '预防') }}</span>{{ prev(k) }}
            </div>

            @if (k.druggable) {
              @if (targetsFor(k.name).length) {
                <div class="targets">
                  <span class="t-lbl">{{ t('Genetically-validated targets', '已获遗传学验证的靶点') }}</span>
                  @for (tt of targetsFor(k.name); track tt.symbol) {
                    <span class="tgt">
                      <a [href]="tt.url" target="_blank" rel="noopener" class="tsym">{{ tt.symbol }}</a>
                      @if (tt.genetic_score !== null) {
                        <span class="gs" [class]="band(tt.genetic_score)">{{ tt.genetic_score.toFixed(2) }}</span>
                      }
                      @if (inPortfolio(tt.symbol)) { <a routerLink="/portfolio" class="mini bench" [title]="t('bench-ready hypothesis', '可上实验台的假设')">{{ t('portfolio', '组合') }}</a> }
                      @if (hasResistance(tt.symbol)) { <a routerLink="/resistance" class="mini resist" [title]="t('resistance gap to cover', '待覆盖的耐药缺口')">{{ t('resist', '耐药') }}</a> }
                    </span>
                  }
                </div>
              } @else {
                <p class="t-none muted">{{ t('Targetable biology exists; no panel-ranked target mapped here yet.', '存在可靶向的生物学；尚无面板排序的靶点映射到此。') }}</p>
              }
            } @else {
              <p class="t-none prevent-note">{{ t('Hard to drug — a targeted-therapy hypothesis is the complement here, not the headline.', '难以成药——靶向治疗假设在此是补充，而非主角。') }}</p>
            }
          </article>
        }
      </section>

      <section class="readout">
        <span class="ro-lbl">{{ t('Honest read-out', '诚实的结论') }}</span>
        <p>{{ i18n.isZh() && c.prevention_readout_zh ? c.prevention_readout_zh : c.prevention_readout }}</p>
      </section>

      @if (c.bench_path_cn?.length) {
        <section class="bench">
          <h2>{{ t('Test it inside China — the domestic bench path', '在中国境内验证它——国内实验台路线') }}</h2>
          <p class="muted bench-note">{{ c.region_note_cn }}</p>
          <div class="steps">
            @for (s of c.bench_path_cn; track s.step; let i = $index) {
              <div class="step">
                <div class="shead"><span class="sn">{{ i + 1 }}</span><h3>{{ i18n.isZh() ? s.cn : s.title }} <span class="cn">{{ i18n.isZh() ? s.title : s.cn }}</span></h3></div>
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
              <h3>{{ t('Source the compounds domestically', '国内采购化合物') }} <span class="cn">{{ t('国内采购', 'domestic sourcing') }}</span></h3>
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
            <p class="registry">{{ t('Clinical-stage registry:', '临床阶段登记：') }}
              <a [href]="c.registry_cn.url" target="_blank" rel="noopener">{{ c.registry_cn.name }}</a> — {{ c.registry_cn.note }}.</p>
          }
        </section>
      }

      <section class="foot">
        <p class="repro muted">
          {{ t('Reproduce:', '复现：') }} <code class="mono">python3 cad/china_burden.py --json</code> ·
          {{ t('targets from', '靶点来自') }} <a routerLink="/targets">{{ t('the genetics-ranked panel →', '遗传学排序面板 →') }}</a> ·
          {{ t('in-China request:', '在华请求：') }} <code class="mono">cad/validation_package.py --run &lt;dir&gt; --region cn</code>.
          {{ t('Source:', '来源：') }} <a [href]="srcUrl()" target="_blank" rel="noopener">{{ c.source }}</a>
        </p>
        <p class="disc muted">{{ i18n.isZh() && c.disclaimer_zh ? c.disclaimer_zh : c.disclaimer }}</p>
      </section>
    } @else if (failed()) {
      <p class="muted">{{ t('Couldn\\'t load the China snapshot. Reproduce locally with', '无法加载中国快照。可在本地复现：') }} <code class="mono">python3 cad/china_burden.py --json</code>.</p>
    } @else {
      <p class="muted">{{ t('Loading China\\'s cancer-burden lens…', '正在加载中国癌症负担视角…') }}</p>
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

    .thesis { max-width:900px; margin-bottom:1.4rem; }
    .thesis h2 { font-size:1.5rem; margin-bottom:.3rem; }
    .t-sub { font-size:.9rem; color:var(--text-dim); margin-bottom:.6rem; }
    .why { margin:0 0 .9rem; padding-left:1.2rem; display:flex; flex-direction:column; gap:.4rem; }
    .why li { font-size:.92rem; line-height:1.5; color:var(--text-dim); } .why strong { color:var(--text); }
    .conviction { background:#2a1116; border-color:#5e1f2b; border-left-color:#ff6b81; }
    .conviction .ro-lbl { color:#ff8a9b; }
    .conviction p { display:block; margin-top:.3rem; font-style:italic; color:var(--text); }

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
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;
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
  // Pick the language-appropriate narrative field, falling back to English if a zh value is absent.
  note(k: Cancer): string { return this.i18n.isZh() && k.note_zh ? k.note_zh : k.china_note; }
  prev(k: Cancer): string { return this.i18n.isZh() && k.prevention_zh ? k.prevention_zh : k.prevention; }
}
