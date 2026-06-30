import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TargetStore } from '../../core/target-store';
import { LangService } from '../../core/lang.service';

interface Pillar {
  n: string;
  title: string;
  proven: string;
  ai: string;
  irreducible: string;
  link?: { to: string; label: string };
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <section class="lead">
      <div class="badge">{{ t('Literature-verified · cross-checked (Tavily + DeepSeek) · public data', '文献验证 · 交叉核对（Tavily + DeepSeek）· 公开数据') }}</div>
      @if (i18n.isZh()) {
        <h1>癌症如何被真正治愈 —<br><span class="accent">以及 AI 在何处节省实验。</span></h1>
        <p class="sub">
          没有单一的治愈方法。癌症是数百种疾病，进展是五个杠杆之和：<strong>预防它 · 更早发现它 · 精准打击它 ·
          让免疫系统对付它 · 领先于耐药。</strong>AI——最明确的是 <strong>AlphaFold 式结构预测</strong>——压缩了其中每一项廉价的计算<em>前端</em>，
          从而减少实验次数、减少合成的死胡同分子。它从不运行那个证明一个人被保护、肿瘤缩小或疗法安全的实验。
        </p>
      } @else {
        <h1>How cancer is actually being cured —<br><span class="accent">and where AI saves the experiment.</span></h1>
        <p class="sub">
          There is no single cure. Cancer is hundreds of diseases, and progress is the sum of five levers:
          <strong>prevent it · find it earlier · hit it precisely · turn the immune system on it · stay
          ahead of resistance.</strong> AI — most clearly <strong>AlphaFold-style structure prediction</strong>
          — compresses the cheap, in-silico <em>front</em> of each, so fewer experiments are run and fewer
          dead-end molecules get made. It never runs the experiment that proves a person is protected, a
          tumour shrinks, or a therapy is safe.
        </p>
      }
      <div class="cta-row">
        <a routerLink="/cure" class="btn primary large">{{ t('How cancer is cured →', '癌症如何被治愈 →') }}</a>
        <a routerLink="/explore" class="btn ghost large">{{ t('Explore a target', '探索一个靶点') }}</a>
      </div>
    </section>

    <section class="pillars">
      @for (p of pillars(); track p.title) {
        <div class="pillar" [class.terminal]="p.n === '6'">
          <div class="phead"><span class="pn">{{ p.n }}</span><h3>{{ p.title }}</h3></div>
          <div class="prow"><span class="tag proven">{{ t('Proven', '已证实') }}</span><span>{{ p.proven }}</span></div>
          <div class="prow"><span class="tag good">{{ t('AI saves the experiment', 'AI 节省实验') }}</span><span>{{ p.ai }}</span></div>
          <div class="prow"><span class="tag warn">{{ t('Irreducibly experimental', '不可省的实验') }}</span><span>{{ p.irreducible }}</span></div>
          @if (p.link) {
            <a class="pillar-link" [routerLink]="p.link.to">{{ p.link.label }}</a>
          }
        </div>
      }
    </section>

    @if (i18n.isZh()) {
      <p class="payoff">
        诚实的回报：<strong>AI 以更少的实验抵达治愈——但没有实验它到不了那里。</strong>AlphaFold 式预测是最明确的胜利：
        它替代了<em>部分</em>结构生物学并把设计前置。但治愈仍由被免疫的人、被切除的癌前病变、被合成并测定的分子、动物、以及临床试验共同建成——
        在肿瘤学中，进入 I 期的项目只有约 <strong>3.4%</strong> 获批
        <span class="muted">（Wong, Siah &amp; Lo，<em>Biostatistics</em> 2019）</span>。
      </p>
    } @else {
      <p class="payoff">
        The honest payoff: <strong>AI gets to the cure with fewer experiments — it does not get there
        without them.</strong> AlphaFold-style prediction is the clearest win: it replaces <em>some</em>
        structural biology and front-loads design. But the cure is still built by the immunised person,
        the removed precancer, the synthesised-and-assayed molecule, the animal, and the trial — in
        oncology only <strong>~3.4%</strong> of programs entering Phase&nbsp;I are approved
        <span class="muted">(Wong, Siah &amp; Lo, <em>Biostatistics</em> 2019)</span>.
      </p>
    }

    <div class="proof-grid">
      <div class="card proof"><div class="icon">🔎</div><h3>{{ t('Live from the source', '实时取自来源') }}</h3>
        <p class="muted">{{ t('Dossiers, ligands, and structures pulled on demand from ChEMBL, UniProt, RCSB PDB. No cached lies.', '档案、配体与结构按需取自 ChEMBL、UniProt、RCSB PDB。绝无缓存谎言。') }}</p>
        <a routerLink="/explore">{{ t('Try the explorer', '试用浏览器') }}</a></div>
      <div class="card proof"><div class="icon">✓</div><h3>{{ t('Verifiable by anyone', '人人可验证') }}</h3>
        <p class="muted">
          @if (i18n.isZh()) {
            运行 <code class="mono">python3 cad/verify.py --target EGFR</code>——每个数字都从其公开 URL 重新拉取，PASS/DRIFT/FAIL。
          } @else {
            Run <code class="mono">python3 cad/verify.py --target EGFR</code> — every figure re-fetched from its public URL, PASS/DRIFT/FAIL.
          }
        </p>
        <a href="https://github.com/Aroxora/provenika" target="_blank" rel="noopener">{{ t('View source ↗', '查看源代码 ↗') }}</a></div>
      <div class="card proof"><div class="icon">🧬</div><h3>{{ t('Docking, actually run', '对接，真实运行') }}</h3>
        <p class="muted">{{ t('Full pipeline incl. AutoDock Vina runs on AWS; redocking benchmark 52.6% / 1.90 Å median, re-derivable offline.', '完整流水线（含 AutoDock Vina）在 AWS 上运行；重对接基准 52.6% / 中位 1.90 Å，可离线复现。') }}</p>
        <a routerLink="/explore">{{ t('See a structure-aware shortlist', '查看结构感知的候选清单') }}</a></div>
    </div>

    @if (i18n.isZh()) {
      <p class="final-note muted">
        仅供研究 / 决策支持。<strong>不用于患者诊疗</strong>、诊断或治疗。计算命中只是给湿实验室的假设——绝非疗法有效的证据。
      </p>
    } @else {
      <p class="final-note muted">
        Research / decision-support only. <strong>Not for patient care</strong>, diagnosis, or treatment.
        A computational hit is a hypothesis for the wet lab — never evidence a therapy works.
      </p>
    }
  `,
  styles: [`
    .lead { max-width: 880px; margin-bottom: 1.8rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    .lead h1 { font-size:2.25rem; line-height:1.1; margin-bottom:.5rem; }
    .accent { color:var(--accent); }
    .sub { font-size:1.06rem; max-width:72ch; color:var(--text-dim); margin-bottom:1.1rem; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }

    .pillars { display:grid; grid-template-columns:repeat(auto-fit,minmax(330px,1fr)); gap:.8rem; margin-bottom:1.3rem; }
    .pillar { background:var(--bg-elev); border:1px solid #1c2738; border-radius:11px; padding:.85rem .95rem; }
    .pillar.terminal { border-color:#3a1a22; background:linear-gradient(180deg,var(--bg-elev),#1a0f12); }
    .phead { display:flex; align-items:center; gap:.55rem; margin-bottom:.55rem; }
    .pn { display:grid; place-items:center; width:1.7rem; height:1.7rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--text-dim); }
    .phead h3 { margin:0; font-size:1.05rem; }
    .prow { display:flex; gap:.5rem; align-items:flex-start; font-size:.85rem; line-height:1.4; margin-bottom:.4rem; }
    .prow span:last-child { color:var(--text-dim); }
    .tag { flex:none; font-size:.62rem; font-weight:700; letter-spacing:.03em; text-transform:uppercase;
      padding:.13rem .42rem; border-radius:5px; margin-top:.1rem; white-space:nowrap; }
    .tag.proven { background:#10202c; color:#6fb6ff; border:1px solid #1f456e; }
    .tag.good { background:#11231c; color:var(--accent); border:1px solid #1f5e44; }
    .tag.warn { background:#281a10; color:#f0a868; border:1px solid #5e431f; }
    .pillar-link { display:inline-block; margin-top:.2rem; font-size:.82rem; font-weight:600; color:var(--accent);
      text-decoration:none; border-bottom:1px solid transparent; } .pillar-link:hover { border-bottom-color:var(--accent); }

    .payoff { max-width:78ch; font-size:1rem; line-height:1.55; margin:0 0 1.6rem;
      border-left:3px solid var(--accent); padding-left:.95rem; }

    .proof-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin-bottom:1.4rem; }
    .proof { display:flex; flex-direction:column; } .proof .icon { font-size:1.4rem; }
    .proof h3 { margin:.15rem 0 .25rem; } .proof p { flex:1; margin-bottom:.4rem; } .proof a { font-size:.9rem; }
    .final-note { max-width:74ch; font-size:.82rem; }
  `]
})
export class Landing {
  private router = inject(Router);
  private store = inject(TargetStore);
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  // computed() so the t() calls re-evaluate when the language toggles (see lang.service.ts).
  readonly pillars = computed<Pillar[]>(() => [
    { n: '1', title: this.t('Prevention', '预防'), proven: this.t('HPV vaccine → 87% lower cervical cancer (Falcaro, Lancet 2021); HBV → liver cancer; aspirin → ~60% in Lynch (CAPP2).', 'HPV 疫苗 → 宫颈癌降低 87%（Falcaro, Lancet 2021）；乙肝疫苗 → 肝癌；阿司匹林 → Lynch 综合征降低约 60%（CAPP2）。'), ai: this.t('Risk models (Mirai, Sybil, AVE) sharpen who to screen — fewer needless scans & biopsies.', '风险模型（Mirai、Sybil、AVE）精确锁定该筛查谁——减少不必要的扫描与活检。'), irreducible: this.t('Immunity & safety proven in people over years; behaviour and policy change the rest.', '免疫力与安全性需在人群中经年验证；其余靠行为与政策改变。') },
    { n: '2', title: this.t('Early detection', '早期检测'), proven: this.t('FDA-cleared AI today: Paige Prostate, GI Genius (colonoscopy), AI mammography (MASAI trial).', '当今已获 FDA 批准的 AI：Paige Prostate、GI Genius（结肠镜）、AI 乳腺钼靶（MASAI 试验）。'), ai: this.t('Reads the scan or slide already being taken — cuts misses and reader workload.', '读取已经在拍摄的扫描或切片——减少漏诊与阅片负担。'), irreducible: this.t('You still image or sample a living body; mortality benefit needs prospective trials.', '你仍需对活体成像或取样；降低死亡率需前瞻性试验。') },
    { n: '3', title: this.t('Precision targeted therapy', '精准靶向治疗'), proven: this.t('EGFR / BTK / BRAF / KRAS-G12C inhibitors matched to a tumour driver.', '与肿瘤驱动突变匹配的 EGFR / BTK / BRAF / KRAS-G12C 抑制剂。'), ai: this.t('AlphaFold2/3 structures (CASP14 GDT 92.4) replace some crystallography; FEP ranks which analog to synthesise.', 'AlphaFold2/3 结构（CASP14 GDT 92.4）替代部分晶体学；FEP 排序该合成哪个类似物。'), irreducible: this.t('Predicted ≠ holo pocket; every candidate is still synthesised and assayed — a Kd is measured.', '预测 ≠ 真实结合口袋；每个候选物仍需合成并测定——要测出 Kd。') },
    { n: '4', title: this.t('Immunotherapy', '免疫治疗'), proven: this.t('Checkpoint inhibitors; CAR-T (Kymriah, 2017); mRNA neoantigen vaccine −49% melanoma recurrence (KEYNOTE-942, investigational).', '免疫检查点抑制剂；CAR-T（Kymriah, 2017）；mRNA 新抗原疫苗使黑色素瘤复发降低 49%（KEYNOTE-942，研究性）。'), ai: this.t('Neoantigen prediction (NetMHCpan) pre-filters which mutations go in the vaccine.', '新抗原预测（NetMHCpan）预先筛选哪些突变进入疫苗。'), irreducible: this.t('The immune response, per-patient manufacturing, and the trial.', '免疫应答本身、按患者定制的生产、以及临床试验。') },
    { n: '5', title: this.t('Resistance & combinations', '耐药与联合用药'), proven: this.t('EGFR T790M answered by osimertinib; combinations extend control.', 'EGFR T790M 由奥希替尼应答；联合用药延长控制。'), ai: this.t('Predict resistance mutations and model the mutant to design the next-gen inhibitor early.', '预测耐药突变并对突变体建模，提前设计下一代抑制剂。'), irreducible: this.t('Folding ΔΔG ≠ binding effect; somatic evolution is read out in patients.', '折叠 ΔΔG ≠ 结合效应；体细胞演化在患者体内读出。'), link: { to: '/resistance', label: this.t('See the per-target resistance landscape — the specific gap a next-gen molecule must cover →', '查看按靶点的耐药全景——下一代分子必须覆盖的具体缺口 →') } },
    { n: '6', title: this.t('Translation & access', '转化与可及性'), proven: this.t('Biomarker-guided trials and patient stratification.', '生物标志物指导的试验与患者分层。'), ai: this.t('Biomarker discovery and trial-patient matching shrink the search for who benefits.', '生物标志物发现与试验患者匹配，缩小“谁获益”的搜索范围。'), irreducible: this.t('Efficacy & safety only in Phase 1–3 trials (~3.4% oncology PoS); approval, manufacturing, access.', '疗效与安全仅由 1–3 期试验决定（肿瘤学成功率约 3.4%）；审批、生产、可及性。') },
  ]);

  goExplore(t: string) {
    this.store.set(t);
    this.router.navigate(['/explore'], { queryParams: { t } });
  }
}
