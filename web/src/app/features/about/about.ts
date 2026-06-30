import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  template: `
    <h1>{{ t('About Provenika', '关于 Provenika') }}</h1>
    <p class="lead">
      @if (i18n.isZh()) {
        一张关于<strong>癌症如何被真正治愈——以及 AI 在何处节省实验</strong>的诚实地图。要么计算、要么引用，绝不臆断。
      } @else {
        An honest map of <strong>how cancer is actually being cured — and where AI saves the experiment.</strong> Compute or cite, never assert.
      }
    </p>

    <div class="card">
      <p>
        @if (i18n.isZh()) {
          我们的使命是精确划清 AI／算力能做什么、而只有湿实验室和临床才能做什么之间的边界。癌症由五个杠杆之和被治愈——预防、早期检测、精准治疗、免疫治疗与耐药管理——而 AI（最明确的是 AlphaFold 式的结构预测）压缩了其中每一项廉价的计算前端，从而减少实验次数、减少合成的死胡同分子。它从不运行那个证明一个人被保护、肿瘤缩小或疗法安全的实验。参见<a routerLink="/cure">完整的引用地图</a>。
        } @else {
          The mission is to be exact about the boundary between what AI/compute can do and what only the wet lab and clinic can. Cancer is cured by the sum of five levers — prevention, early detection, precision therapy, immunotherapy, and managing resistance — and AI (most clearly AlphaFold-style structure prediction) compresses the cheap, in-silico front of each, so fewer experiments are run and fewer dead-end molecules get made. It never runs the experiment that proves a person is protected, a tumour shrinks, or a therapy is safe. See <a routerLink="/cure">the full cited map</a>.
        }
      </p>
      <p>
        @if (i18n.isZh()) {
          Provenika 之所以存在，是因为在药物发现中，自信却无法验证的 AI 输出是危险的。我们把免费的公开数据（ChEMBL、UniProt、RCSB PDB）转化为经过排序、完整引用、可独立复核的假设——每个数字都取自来源并标注引用，或经确定性重算，绝非模型生成。
        } @else {
          Provenika exists because confident-but-unverifiable AI output is dangerous in drug discovery. We turn free public data (ChEMBL, UniProt, RCSB PDB) into ranked, fully-cited, independently re-verifiable hypotheses — every figure fetched-and-cited or deterministically recomputed, never model-generated.
        }
      </p>
    </div>

    <h3>{{ t('Verifiability', '可验证性') }}</h3>
    <p>
      @if (i18n.isZh()) {
        在仓库中运行 <code class="mono">python3 cad/verify.py --target EGFR</code>。它会从每个数字的原始公开来源重新拉取，并以确切 URL 报告 PASS/DRIFT/FAIL。
      } @else {
        Run <code class="mono">python3 cad/verify.py --target EGFR</code> from the repo. It re-pulls every figure from its original public source and reports PASS/DRIFT/FAIL with the exact URLs.
      }
    </p>

    <h3>{{ t('Open source', '开源') }}</h3>
    <p>
      <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">github.com/Aroxora/provenika</a>
      @if (i18n.isZh()) {
        —— 完整流水线在 <code>cad/</code>，外联智能体在 <code>outreach/</code>，本网站在 <code>web/</code>。
      } @else {
        — full pipeline in <code>cad/</code>, outreach agent in <code>outreach/</code>, this site in <code>web/</code>.
      }
    </p>

    <h3>{{ t('Who builds it', '谁在构建') }}</h3>
    <p>
      @if (i18n.isZh()) {
        由 <strong>Bo Shang</strong> 在<strong>北京</strong>于 <a href="https://erosolarai.com" target="_blank" rel="noopener">ErosolarAI</a> 构建，并在那里通过命令行运行——因为这项工作不依赖任何单一网络的可达性。实验台路线刻意以中国为先：国内化合物供应商与 CRO，配有简体中文的合作邀约，使一个假设可以从北京的一次筛选直接走到真实的实验，无需跨境。参见<a routerLink="/impact">这一切的总和</a>与<a href="https://github.com/Aroxora/provenika/blob/main/docs/CHINA.md" target="_blank" rel="noopener">在华指南</a>。
      } @else {
        Built in <strong>Beijing</strong> by <strong>Bo Shang</strong> at <a href="https://erosolarai.com" target="_blank" rel="noopener">ErosolarAI</a> — and run from there, on the command line, because the work doesn't depend on any one network being reachable. The bench path is deliberately China-first: domestic compound suppliers and CROs, with a Simplified-Chinese pitch, so a hypothesis can go from a screen in Beijing to a real assay without crossing a border. See <a routerLink="/impact">what it adds up to</a> and the <a href="https://github.com/Aroxora/provenika/blob/main/docs/CHINA.md" target="_blank" rel="noopener">in-China guide</a>.
      }
    </p>

    <h3>{{ t('Contact', '联系方式') }}</h3>
    <p>Bo Shang — <a href="mailto:bo@shang.software">bo@shang.software</a> · <a href="mailto:bo@trenchwork.org">bo@trenchwork.org</a> · +1 508-260-0326</p>

    <h3>{{ t('Statement', '声明') }}</h3>
    <blockquote class="statement">
      <p>
        @if (i18n.isZh()) {
          “旧金山地区检察官在法庭上代表加州人民——那就尽情去代表吧。Bo Shang 并不特别在意，他依靠辩护律师以及法官作出有利于他的裁决。特此声明：Bo Shang 从未威胁过该检察官——也从未威胁过任何人。”
        } @else {
          “The SF DA represents the People of California in court — so go represent your little hearts out. Bo Shang does not particularly care, and relies on defense counsel and the Judge ruling in his favor. For the record: Bo Shang never threatened the DA — or anyone — at all.”
        }
      </p>
      <footer>— Bo Shang</footer>
    </blockquote>
    <p class="related">{{ t('Related sites:', '相关网站：') }}
      <a href="https://defense-osint.org/" target="_blank" rel="noopener">defense-osint.org</a> ·
      <a href="https://erosolar.net/" target="_blank" rel="noopener">erosolar.net</a> ·
      <a href="https://trenchwork.live/" target="_blank" rel="noopener">trenchwork.live</a></p>

    <div class="disclaimer">
      {{ t('Research and decision-support only. Not medical advice. Not a treatment recommendation.', '仅供研究与决策支持。非医疗建议。非治疗推荐。') }}
    </div>
  `,
  styles: [`
    .lead { font-size: 1.1rem; max-width: 70ch; }
    .mono { font-family: var(--mono); }
    a { color: var(--accent-2); }
    .statement { margin: .4rem 0; padding: .7rem 1rem; max-width: 74ch;
      border-left: 3px solid var(--accent); background: var(--bg-elev, #0f1722); border-radius: 8px; }
    .statement p { margin: 0; font-style: italic; line-height: 1.55; }
    .statement footer { margin-top: .4rem; font-size: .85rem; color: var(--text-dim); font-style: normal; }
    .related { font-size: .9rem; }
  `]
})
export class About {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;
}
