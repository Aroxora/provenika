import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface Entry {
  target: string;
  context: string;
  note: string;
  genetic: string;
  geneticStrong: boolean;
}

interface SoCDrug { name: string; phase: number | null; phase_label: string; chembl_id: string; action?: string; }
interface SoCTarget { symbol: string; n_drugs: number; drugs: SoCDrug[]; }
interface SoC { generated?: string; source: string; n_targets: number; targets: SoCTarget[]; disclaimer: string; }

const REPO = 'https://github.com/Aroxora/provenika/blob/main/examples/portfolio';

@Component({
  selector: 'app-portfolio',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">{{ t('Cited · re-verifiable · bench-ready hypotheses', '有出处 · 可复核 · 可上实验台的假设') }}</div>
      @if (i18n.isZh()) {
        <h1>可上实验台的假设 —<br><span class="accent">有出处，且可立即测试。</span></h1>
        <p class="lead">
          一个持续扩充的肿瘤学假设组合：公开的 ChEMBL 生物活性数据按靶点分诊并排序，每个靶点都附带一份
          <strong>实验验证申请</strong>——列明可验证它的确切实验，以及真实的实验室（还有像 NCI-60 这样的免费途径）。
          这些是<strong>面向实验台的假设，而非已验证的命中物。</strong>每个数字都取自来源或经确定性计算，
          并可用 <code class="mono">cad/verify.py</code> 复核。
        </p>
      } @else {
        <h1>Bench-ready hypotheses —<br><span class="accent">cited, and ready to test.</span></h1>
        <p class="lead">
          A growing portfolio of oncology hypotheses: public ChEMBL bioactivity triaged and prioritized
          per target, each shipped with an <strong>experimental-validation request</strong> — the exact
          experiments and the real labs (and free routes like NCI-60) that would test it. These are
          <strong>hypotheses for the bench, not validated hits.</strong> Every figure is fetched-from-source
          or deterministically computed and re-checkable with <code class="mono">cad/verify.py</code>.
        </p>
      }
    </section>

    <section class="grid">
      @for (e of entries(); track e.target) {
        <div class="entry">
          <h3>{{ e.target }}</h3>
          <div class="ctx muted">{{ e.context }}</div>
          <div class="genetic" [class.strong]="e.geneticStrong">
            <span class="gtag" [class.strong]="e.geneticStrong">{{ t('Target validation', '靶点验证') }}</span>{{ e.genetic }}
          </div>
          <p class="note">{{ e.note }}</p>
          @if (socTop(e.target).length) {
            <div class="soc" [title]="t('Approved/clinical drugs that already hit this target (real ChEMBL mechanism data)', '已作用于该靶点的已获批／临床在研药物（真实 ChEMBL 机制数据）')">
              <span class="soc-lbl">{{ t('Must beat', '必须超越') }}</span>
              @for (d of socTop(e.target); track d.chembl_id) {
                <a class="drug" [class.appr]="d.phase_label === 'approved'"
                   [href]="'https://www.ebi.ac.uk/chembl/compound_report_card/' + d.chembl_id + '/'"
                   target="_blank" rel="noopener" [title]="titleCase(d.name) + ' · ' + d.phase_label">
                  {{ titleCase(d.name) }}<span class="ph">{{ d.phase_label }}</span>
                </a>
              }
              @if (socMore(e.target) > 0) { <span class="more">{{ t('+' + socMore(e.target) + ' more', '另 ' + socMore(e.target) + ' 个') }}</span> }
            </div>
          }
          <div class="links">
            <a [href]="repo + '/' + slug(e.target) + '/VALIDATION-REQUEST.md'" target="_blank" rel="noopener" class="link primary">{{ t('Validation request →', '验证申请 →') }}</a>
            <a [href]="repo + '/' + slug(e.target) + '/dossier.json'" target="_blank" rel="noopener" class="link">{{ t('Dossier', '档案') }}</a>
            <a [href]="repo + '/' + slug(e.target) + '/hits.csv'" target="_blank" rel="noopener" class="link">{{ t('Shortlist', '候选清单') }}</a>
            @if (hasResistance(e.target)) {
              <a routerLink="/resistance" class="link resist" [title]="t('the specific clinical resistance a next-gen molecule must cover', '下一代分子必须覆盖的具体临床耐药')">{{ t('Resistance gap →', '耐药缺口 →') }}</a>
            }
          </div>
        </div>
      }
    </section>

    <section class="cta">
      @if (i18n.isZh()) {
        <p>
          为什么是这些靶点？每一个都取自按人类遗传学对癌症支持度排序的致癌基因组——这一先验可将获批几率
          提高约 2 倍。<a routerLink="/targets">查看完整排序面板 →</a>
        </p>
        <p>
          想测试其中之一？诚实的第一步要求很小——先用一个生化 IC50 确认结合，再做一组选择性测定。
          <a routerLink="/bench">查看实验链条以及运行它的实验室 →</a>
        </p>
      } @else {
        <p>
          Why these targets? Each is drawn from the oncogenome ranked by human genetic support for cancer —
          the prior that ~2×-es approval odds. <a routerLink="/targets">See the full ranked panel →</a>
        </p>
        <p>
          Want to test one? The honest first ask is small — a biochemical IC50 to confirm binding, then a
          selectivity panel. <a routerLink="/bench">See the experiment chain and the labs that run it →</a>
        </p>
      }
      <p class="disc muted">
        {{ t('Research only — not medical advice, not a treatment recommendation. A computational hit is a hypothesis for the wet lab, never evidence a therapy works.', '仅供研究——非医疗建议，非治疗推荐。计算命中只是给湿实验室的假设，绝非疗法有效的证据。') }}
      </p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.04rem; max-width:74ch; color:var(--text-dim); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:.8rem; margin-bottom:1.4rem; }
    .entry { background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px; padding:.9rem 1rem; }
    .entry h3 { margin:0 0 .15rem; font-size:1.2rem; }
    .ctx { font-size:.82rem; margin-bottom:.45rem; }
    .genetic { font-size:.82rem; line-height:1.4; margin:0 0 .5rem; color:var(--text-dim); display:flex; gap:.4rem; flex-wrap:wrap; align-items:baseline; }
    .gtag { font-size:.6rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; padding:.1rem .35rem;
      border-radius:4px; background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .gtag.strong { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .note { font-size:.9rem; line-height:1.45; margin:0 0 .6rem; color:var(--text); }
    .soc { display:flex; flex-wrap:wrap; gap:.3rem; align-items:center; margin:0 0 .6rem; }
    .soc-lbl { font-size:.6rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--text-dim); margin-right:.1rem; }
    .drug { display:inline-flex; align-items:center; gap:.3rem; font-size:.78rem; text-decoration:none;
      color:var(--text-dim); background:#0f1722; border:1px solid #24344a; border-radius:6px; padding:.12rem .4rem; }
    .drug:hover { border-color:var(--accent); }
    .drug.appr { color:var(--text); border-color:#1f5e44; }
    .drug .ph { font-size:.56rem; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--accent); }
    .drug:not(.appr) .ph { color:#f0a868; }
    .more { font-size:.72rem; color:var(--text-dim); }
    .links { display:flex; gap:.5rem; flex-wrap:wrap; }
    .link { font-size:.85rem; padding:.3rem .6rem; border-radius:7px; border:1px solid #24344a;
      text-decoration:none; color:var(--text-dim); background:#0f1722; }
    .link.primary { color:var(--accent); border-color:#1f5e44; }
    .link.resist { color:#f0a868; border-color:#5e431f; background:#281a10; }
    .link:hover { border-color:var(--accent); }
    .link.resist:hover { border-color:#f0a868; }

    .cta { max-width:880px; } .cta p { line-height:1.5; } .cta a { color:var(--accent); }
    .disc { font-size:.82rem; max-width:74ch; }
  `]
})
export class Portfolio {
  readonly repo = REPO;
  private http = inject(HttpClient);
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  // Portfolio targets that have a curated, cited resistance landscape (kept in sync with cad/resistance.py).
  private readonly withResistance = new Set(['EGFR', 'BTK', 'ABL1', 'ALK', 'KRAS']);
  hasResistance(target: string): boolean { return this.withResistance.has(target); }

  // Standard of care — the drugs that already hit each target (the bar a new molecule must beat).
  // Real ChEMBL mechanism data, snapshot generated by `cad/validation_package.py --soc-snapshot`.
  readonly soc = signal<SoC | null>(null);
  private readonly socMap = computed(() => {
    const m = new Map<string, SoCDrug[]>();
    for (const t of this.soc()?.targets ?? []) m.set(t.symbol, t.drugs);
    return m;
  });
  constructor() {
    firstValueFrom(this.http.get<SoC>('/data/standard-of-care.json'))
      .then(s => this.soc.set(s)).catch(() => {});
  }
  socTop(target: string): SoCDrug[] { return (this.socMap().get(target) ?? []).slice(0, 4); }
  socMore(target: string): number { return Math.max(0, (this.socMap().get(target) ?? []).length - 4); }
  titleCase(s: string): string { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }

  // computed() so the t() calls re-evaluate when the language toggles (see lang.service.ts).
  readonly entries = computed<Entry[]>(() => [
    {
      target: 'BTK',
      context: this.t('CLL / lymphoma — the ibrutinib / acalabrutinib target', 'CLL／淋巴瘤 —— ibrutinib／acalabrutinib 的靶点'),
      note: this.t('A prioritized shortlist of potent BTK ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 BTK 配体优先清单，附可成药性标记与一份完整的实验验证申请。'),
      genetic: this.t('Cancer link is somatic-driven — no germline genetic signal (Open Targets)', '与癌症的关联由体细胞突变驱动——无种系遗传信号（Open Targets）'),
      geneticStrong: false,
    },
    {
      target: 'BRAF',
      context: this.t('Melanoma / colorectal — the V600E driver (vemurafenib / dabrafenib class)', '黑色素瘤／结直肠癌 —— V600E 驱动突变（vemurafenib／dabrafenib 类）'),
      note: this.t('A prioritized shortlist of potent BRAF ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 BRAF 配体优先清单，附可成药性标记与一份完整的实验验证申请。'),
      genetic: this.t('Strong human genetic support for melanoma (0.70, Open Targets)', '对黑色素瘤具有强人类遗传学支持（0.70，Open Targets）'),
      geneticStrong: true,
    },
    {
      target: 'KRAS',
      context: this.t('Pancreatic / colorectal / NSCLC — the historically "undruggable" oncogene (sotorasib / adagrasib G12C class)', '胰腺癌／结直肠癌／NSCLC —— 历来被视为"无成药性"的致癌基因（sotorasib／adagrasib G12C 类）'),
      note: this.t('A prioritized shortlist of potent KRAS ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 KRAS 配体优先清单，附可成药性标记与一份完整的实验验证申请。'),
      genetic: this.t('Strong human genetic support for gastric cancer (0.90, Open Targets)', '对胃癌具有强人类遗传学支持（0.90，Open Targets）'),
      geneticStrong: true,
    },
    {
      target: 'PIK3CA',
      context: this.t('Breast & many solid tumours — the most frequently mutated oncogene; PI3Kα (alpelisib class)', '乳腺癌及多种实体瘤 —— 突变频率最高的致癌基因；PI3Kα（alpelisib 类）'),
      note: this.t('A prioritized shortlist of potent PI3Kα ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 PI3Kα 配体优先清单，附可成药性标记与一份完整的实验验证申请。'),
      genetic: this.t('Strongest genetic support in our panel — breast cancer (0.92, Open Targets)', '在我们的靶点组中遗传学支持最强 —— 乳腺癌（0.92，Open Targets）'),
      geneticStrong: true,
    },
    {
      target: 'EGFR',
      context: this.t('Lung cancer — China\'s #1 cancer killer; EGFR mutations are far more common in East-Asian/Chinese NSCLC (~38–53% vs ~10–15% Western)', '肺癌 —— 中国头号癌症杀手；EGFR 突变在东亚／中国 NSCLC 患者中远为常见（约 38–53% 对比西方约 10–15%）'),
      note: this.t('A prioritized shortlist of potent EGFR ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request. The single highest-impact target for Chinese patients.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 EGFR 配体优先清单，附可成药性标记与一份完整的实验验证申请。对中国患者而言影响最大的单一靶点。'),
      genetic: this.t('Strong human genetic support for EGFR-related lung cancer (0.93, Open Targets)', '对 EGFR 相关肺癌具有强人类遗传学支持（0.93，Open Targets）'),
      geneticStrong: true,
    },
    {
      target: 'ERBB2',
      context: this.t('HER2+ gastric & breast cancer — the trastuzumab / T-DXd target; gastric is China\'s #3 cancer killer', 'HER2 阳性胃癌与乳腺癌 —— trastuzumab／T-DXd 的靶点；胃癌是中国第三大癌症杀手'),
      note: this.t('A prioritized shortlist of potent HER2 (ERBB2) ligands from public ChEMBL bioactivity, with developability flags and a full experimental-validation request. The shortlist surfaces an already-approved drug — flagged as repurposing context, not novel matter.', '从公开的 ChEMBL 生物活性数据中筛选出的强效 HER2（ERBB2）配体优先清单，附可成药性标记与一份完整的实验验证申请。该清单中浮现出一款已获批药物——已标注为药物重定位背景，而非新颖物质。'),
      genetic: this.t('Human genetic support for colorectal cancer (0.74, Open Targets); HER2 is the validated gastric/breast target', '对结直肠癌具有人类遗传学支持（0.74，Open Targets）；HER2 是已验证的胃癌／乳腺癌靶点'),
      geneticStrong: true,
    },
  ]);

  slug(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
}
