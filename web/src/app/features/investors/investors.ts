import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

@Component({
  selector: 'app-investors',
  imports: [RouterLink],
  template: `
    <div class="inv-head">
      <h1>{{ t('Provenika — for investors & partners', 'Provenika —— 致投资者与合作伙伴') }}</h1>
      <p class="tag">{{ t('The auditable evidence engine for oncology drug discovery.', '面向肿瘤药物发现的可审计证据引擎。') }}</p>
    </div>

    <div class="one-liner card">
      @if (i18n.isZh()) {
        <strong>一条原则：</strong> <em>要么计算、要么引用，绝不臆断。</em><br>
        每个数字要么取自具名的公开来源，要么由确定性代码生成。
        一条命令的验证器即可从原始 URL 实时重新拉取完全相同的数字。
      } @else {
        <strong>One rule:</strong> <em>compute or cite, never assert.</em><br>
        Every figure is fetched from a named public source or produced by deterministic code.
        A one-command verifier re-pulls the exact same numbers live from the original URLs.
      }
    </div>

    <h2 class="sec">{{ t('The problem', '问题所在') }}</h2>
    <p class="muted">{{ t('AI-for-drug-discovery tools (Schrödinger, Insilico, Causaly, BenchSci, Open Targets headline features) all ship confident outputs that cannot be independently audited. In a domain where a wrong number can waste years or mislead a clinical program, unverifiable synthesis is a liability. Pharma already spends ~$2.2B per approved asset (Deloitte). They will pay for tools that compress timelines, but only if the output is defensible to regulators, tumor boards, and peer reviewers.', '用于药物发现的 AI 工具（Schrödinger、Insilico、Causaly、BenchSci、Open Targets 的招牌功能）无不给出自信满满、却无法被独立审计的输出。在一个错误数字就可能浪费数年、甚至误导临床项目的领域，无法验证的综合结论本身就是一种负债。制药公司每获批一个资产已花费 ~$2.2B（Deloitte）。他们愿意为压缩研发周期的工具付费——但前提是其输出能经得起监管机构、肿瘤专家委员会与同行评审的检验。') }}</p>

    <h2 class="sec">{{ t('Our wedge', '我们的切入点') }}</h2>
    <p class="muted">
      @if (i18n.isZh()) {
        我们并非靠专有数据或又一个黑箱模型来竞争。我们要构建的是缺失的<strong>可复现性与溯源层</strong>——这是现有厂商没有动力去做、又苦又不光鲜的部分：每个数字都标注其确切出处，提供人人可运行的独立验证器，并对幻觉事实划下硬性红线。
      } @else {
        We are not competing on proprietary data or another black-box model. We are building the missing <strong>reproducibility and provenance layer</strong>. The hard, unglamorous part that incumbents have no incentive to build: every number tagged with its exact origin, an independent verifier that anyone can run, and a hard line against hallucinated facts.
      }
    </p>
    <ul class="bullets">
      <li>{{ t('Public data only (ChEMBL, UniProt, PDB, Europe PMC, ClinicalTrials.gov, Reactome).', '仅使用公开数据（ChEMBL、UniProt、PDB、Europe PMC、ClinicalTrials.gov、Reactome）。') }}</li>
      <li>{{ t('Client-side + Python ports of the same deterministic logic.', '同一套确定性逻辑的客户端实现与 Python 移植版。') }}</li>
      <li>{{ t('Live public agentic outreach log (this site) — radical transparency on our own operations.', '公开、实时的智能体外联日志（即本网站）——对我们自身运营的彻底透明。') }}</li>
      <li>{{ t('Full source:', '完整源代码：') }} <a href="https://github.com/Aroxora/provenika" target="_blank">github.com/Aroxora/provenika</a></li>
    </ul>

    <h2 class="sec">{{ t('Proof you can run right now', '你现在就能运行的证明') }}</h2>
    <div class="proof-box card">
      <code>python3 cad/verify.py --target EGFR</code><br>
      <span class="muted">{{ t('Re-fetches every figure from its canonical public source and reports PASS / DRIFT / FAIL with the exact URLs.', '从每个数字的权威公开来源重新拉取，并以确切 URL 报告 PASS / DRIFT / FAIL。') }}</span>
    </div>

    <h2 class="sec">{{ t('Business reality (honest)', '商业现实（坦诚版）') }}</h2>
    <p class="muted">
      @if (i18n.isZh()) {
        基于免费公开数据的免费代码并没有数据护城河。Open Targets 已经免费提供靶点分诊，ChEMBL 与 PDB 也都是公开的。真正可持续的优势在于<strong>品牌 + 信任 + 私有数据整合</strong>。营收路径（按优先级）：
      } @else {
        Free code over free public data has no data moat. Open Targets already gives away target triage for free. ChEMBL and PDB are public. The durable advantage is <strong>brand + trust + private-data integration</strong>. Revenue paths (in priority):
      }
    </p>
    <ol class="paths">
      <li>
        @if (i18n.isZh()) {
          <strong>资助与开放科学可持续性</strong>（Galaxy / Bioconductor 模式）——首选。
        } @else {
          <strong>Grants &amp; open-science sustainability</strong> (Galaxy / Bioconductor model) — primary.
        }
      </li>
      <li>
        @if (i18n.isZh()) {
          <strong>开放内核服务</strong>：面向受监管团队的本地部署／私有数据融合，以及可供审计的溯源快照。
        } @else {
          <strong>Open-core services</strong>: on-prem/private-data fusion + audit-ready provenance snapshots for regulated teams.
        }
      </li>
      <li>{{ t('Strategic tuck-in for an evidence intelligence company.', '作为某家证据智能公司的战略性补强并购。') }}</li>
    </ol>
    <p class="muted small">
      @if (i18n.isZh()) {
        详细分析见仓库中的 <code>/business</code> 目录。我们很早就放弃了“治愈”这一说法，因为过度承诺会摧毁我们真正拥有的唯一资产——可信度。
      } @else {
        Detailed analysis: the <code>/business</code> directory in the repo. We dropped “cure” framing early because overpromise destroys the one asset we actually have — credibility.
      }
    </p>

    <h2 class="sec">{{ t('Why the live agent log matters here', '实时智能体日志为何在此重要') }}</h2>
    <p class="muted">{{ t('The same agent that does outreach for the project also publishes its own activity. You can watch in real time whether we are sending, what the health of the system is, and what (redacted) responses we receive. This is the product principle applied to the company itself.', '为项目做外联的，正是同一个会发布自身活动的智能体。你可以实时看到我们是否在发送、系统健康状况如何、以及我们收到了哪些（经脱敏的）回复。这正是把产品理念应用于公司自身。') }}</p>
    <a routerLink="/log" class="btn">{{ t('View the current agent log & status →', '查看当前智能体日志与状态 →') }}</a>

    <h2 class="sec">{{ t('Contact', '联系方式') }}</h2>
    <p>
      Bo Shang<br>
      <a href="mailto:bo@shang.software">bo@shang.software</a> · <a href="mailto:bo@trenchwork.org">bo@trenchwork.org</a> · <a href="tel:+15082600326">+1 508-260-0326</a><br>
      <a routerLink="/explore">{{ t('Explore the live tool', '试用在线工具') }}</a> · <a href="https://github.com/Aroxora/provenika" target="_blank">GitHub</a>
    </p>

    <div class="disclaimer">
      {{ t('Research / decision-support only. Not medical advice. Market context drawn from public filings and research reports (see repo for citations). This is not a solicitation.', '仅供研究／决策支持。非医疗建议。市场背景取自公开文件与研究报告（引用见仓库）。本内容不构成任何要约或募集。') }}
    </div>
  `,
  styles: [`
    .inv-head { margin-bottom: 1.1rem; }
    .tag { font-size: 1.05rem; color: var(--text-dim); }
    .one-liner { font-size: 1.02rem; max-width: 760px; }
    .sec { margin-top: 1.65rem; margin-bottom: .35rem; }
    .bullets { padding-left: 1.1rem; color: var(--text-dim); }
    .proof-box { font-family: var(--mono); font-size: .95rem; background: #0c121a; }
    .paths { color: var(--text-dim); }
    .paths li { margin: .35rem 0; }
    .small { font-size: .8rem; }
  `]
})
export class Investors {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;
}
