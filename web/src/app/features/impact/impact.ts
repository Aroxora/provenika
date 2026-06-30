import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface Stat {
  figure: string;
  label: string;
  sub: string;
  href: string;      // every figure links to where it can be re-checked
  internal: boolean; // routerLink vs external repo link
}

const REPO = 'https://github.com/Aroxora/provenika/blob/main';

@Component({
  selector: 'app-impact',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">{{ t('Every figure here links to its source · re-checkable with cad/verify.py', '此处每个数字都链接到其来源 · 可用 cad/verify.py 复核') }}</div>
      @if (i18n.isZh()) {
        <h1>它究竟做了什么 ——<br><span class="accent">真实，且可复证。</span></h1>
      } @else {
        <h1>What this actually does —<br><span class="accent">real, and re-provable.</span></h1>
      }
      <p class="lead">
        @if (i18n.isZh()) {
          Provenika 替代了肿瘤药物发现中廉价的计算<em>前端</em>，从而减少被浪费的实验——从靶点筛选到对接设置，每个数字都取自来源或经确定性计算，<strong>绝不臆断</strong>。它不会去运行那个证明肿瘤缩小的实验；而是在工作被压缩、证据完整的前提下，把假设交接到实验台。以下就是这一切在今天的总和——点击任意数字，你即可亲自核验。
        } @else {
          Provenika replaces the cheap, in-silico <em>front</em> of oncology drug discovery so fewer
          experiments are wasted — target triage to docking setup, every number fetched-from-source or
          deterministically computed, <strong>never asserted</strong>. It does not run the experiment that
          proves a tumour shrinks; it gets to the bench handoff with the work compressed and the evidence
          intact. Here is what that amounts to today — click any number to check it yourself.
        }
      </p>
    </section>

    <section class="grid">
      @for (s of stats(); track s.label) {
        <div class="stat">
          <div class="fig">{{ s.figure }}</div>
          <div class="lab">{{ s.label }}</div>
          <div class="sub muted">{{ s.sub }}</div>
          @if (s.internal) {
            <a [routerLink]="s.href" class="src">{{ t('See it →', '查看 →') }}</a>
          } @else {
            <a [href]="s.href" target="_blank" rel="noopener" class="src">{{ t('Source →', '来源 →') }}</a>
          }
        </div>
      }
    </section>

    <section class="panel">
      <h2>{{ t('The honest boundary', '诚实的边界') }}</h2>
      <p>
        @if (i18n.isZh()) {
          AI 以<strong>更少</strong>的实验抵达治愈——但没有实验它到不了那里。结构预测（AlphaFold 式）与对接为“该合成什么”排序，从而让湿实验室先做对的测定；它们不替代测定、细胞、动物或临床试验。Provenika 在每一件产物上都如实声明；在<strong>预防</strong>胜过任何分子之处——乙肝疫苗之于肝癌、根除<em>幽门螺杆菌</em>之于胃癌——它同样如实声明。
          <a routerLink="/cure">逐个杠杆地看 →</a>
        } @else {
          AI gets to the cure with <strong>fewer</strong> experiments — it does not get there without them.
          Structure prediction (AlphaFold-style) and docking rank what to make so the wet lab runs the right
          assays first; they do not replace the assay, the cell, the animal, or the trial. Provenika says so
          on every artifact, and where <strong>prevention</strong> beats any molecule — HBV vaccination for
          liver cancer, <em>H. pylori</em> eradication for gastric — it says that too.
          <a routerLink="/cure">See lever by lever →</a>
        }
      </p>
    </section>

    <section class="panel anti">
      <h2>{{ t('Why you can trust the numbers', '为什么你可以信任这些数字') }}</h2>
      <p>
        @if (i18n.isZh()) {
          反幻觉契约：<strong>没有任何数字源自语言模型。</strong>计数来自公开数据库（ChEMBL、UniProt、RCSB、Open Targets）；评分、对接盒与风险标记经确定性重算；<code class="mono">cad/verify.py</code> 会独立地从每个数字的实时来源重新拉取，一旦有任何内容无法复现便令 CI 失败。可选的通俗语言层受一道数字守卫约束，会拒绝任何并非读自数据的数值。<a routerLink="/portfolio">从一个可进入实验台的假设开始 →</a>
        } @else {
          The anti-hallucination contract: <strong>no figure originates from a language model.</strong>
          Counts come from public databases (ChEMBL, UniProt, RCSB, Open Targets); scores, docking boxes and
          liability flags are recomputed deterministically; and <code class="mono">cad/verify.py</code>
          independently re-pulls each one from its live source and fails CI if anything can't be reproduced.
          The optional plain-language layer is held to a number-guard that rejects any value it didn't read
          from the data. <a routerLink="/portfolio">Start at a bench-ready hypothesis →</a>
        }
      </p>
    </section>

    <p class="disc muted">
      @if (i18n.isZh()) {
        仅供研究与决策支持——非医疗建议，亦非治疗推荐。计算命中只是给湿实验室的假设，绝非疗法有效的证据。基于公开数据，由 <a href="https://erosolarai.com" target="_blank" rel="noopener">ErosolarAI</a> 构建。
      } @else {
        Research &amp; decision-support only — not medical advice, not a treatment recommendation. A
        computational hit is a hypothesis for the wet lab, never evidence a therapy works. Built from public
        data by <a href="https://erosolarai.com" target="_blank" rel="noopener">ErosolarAI</a>.
      }
    </p>
  `,
  styles: [`
    .hero { max-width: 900px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.2rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:80ch; color:var(--text-dim); }
    .mono { font-family: var(--mono); background:#0f1722; padding:.08rem .3rem; border-radius:5px; }

    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.8rem; margin-bottom:1.6rem; }
    .stat { background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px; padding:1rem; }
    .fig { font-size:1.9rem; font-weight:800; color:var(--accent); line-height:1.05; }
    .lab { font-weight:600; margin:.25rem 0 .2rem; }
    .sub { font-size:.82rem; line-height:1.4; }
    .src { display:inline-block; margin-top:.5rem; font-size:.82rem; color:var(--accent); text-decoration:none; }
    .src:hover { text-decoration:underline; }

    .panel { max-width:80ch; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:1rem 1.2rem; margin-bottom:1rem; }
    .panel.anti { border-left:3px solid var(--accent); }
    .panel h2 { font-size:1.15rem; margin:0 0 .4rem; }
    .panel p { line-height:1.6; margin:0; color:var(--text-dim); } .panel a { color:var(--accent); }
    .disc { font-size:.82rem; max-width:80ch; margin-top:1rem; }
  `]
})
export class Impact {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  // computed() so the t() calls re-evaluate when the language toggles (see lang.service.ts).
  readonly stats = computed<Stat[]>(() => [
    { figure: '6', label: this.t('Bench-ready hypotheses', '可进入实验台的假设'),
      sub: this.t('BTK · BRAF · KRAS · PIK3CA · EGFR · ERBB2 — each a cited shortlist + an experimental-validation request', 'BTK · BRAF · KRAS · PIK3CA · EGFR · ERBB2 —— 每个都是一份带引用的候选清单 + 一份实验验证请求'),
      href: '/portfolio', internal: true },
    { figure: '33', label: this.t('Targets ranked by human genetics', '按人类遗传学排序的靶点'),
      sub: this.t('the oncogenome scored by cancer genetic support (Open Targets) — the prior that ~2×-es approval odds', '以癌症遗传学支持度（Open Targets）对肿瘤基因组打分——这一先验可将获批几率提升约 2 倍'),
      href: '/targets', internal: true },
    { figure: '52.6%', label: this.t('Docking re-finds the crystal pose', '对接重现晶体结合构象'),
      sub: this.t('20/38 oncology co-crystals within 2 Å (median 1.90 Å) — a real redocking benchmark, not a claim', '38 个肿瘤共晶中有 20 个落在 2 Å 以内（中位 1.90 Å）——真实的重对接基准，而非口头声称'),
      href: REPO + '/examples/validation-redock/README.md', internal: false },
    { figure: '0.89', label: this.t('Ligand-ranking ROC AUC', '配体排序 ROC AUC'),
      sub: this.t('EGFR actives vs decoys (60 vs 240) — the triage separates real binders from look-alikes', 'EGFR 活性物 vs 诱饵分子（60 vs 240）——该筛选能将真实结合物与相似物区分开'),
      href: REPO + '/examples/validation-enrichment/EGFR.json', internal: false },
    { figure: '中国', label: this.t('A complete in-China workflow', '完整的在华工作流'),
      sub: this.t('burden → target → compounds → domestic suppliers → domestic CROs → a Simplified-Chinese pitch, no Google needed', '疾病负担 → 靶点 → 化合物 → 国内供应商 → 国内 CRO → 简体中文合作邀约，全程无需 Google'),
      href: REPO + '/docs/CHINA.md', internal: false },
    { figure: '24', label: this.t('Test suites guarding it', '守护它的测试套件'),
      sub: this.t('offline checks in CI — including the verifier that re-pulls every figure and fails on a mismatch', 'CI 中的离线检查——包括那个会重新拉取每个数字、一旦不符即失败的验证器'),
      href: REPO + '/cad', internal: false },
  ]);
}
