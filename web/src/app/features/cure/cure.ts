import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface AiSave { method: string; saves: string; cite: string; }
interface Pillar {
  n: string;
  title: string;
  proven: string;
  ai: AiSave[];
  irreducible: string;
  terminal?: boolean;
  link?: { to: string; label: string };
}

@Component({
  selector: 'app-cure',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">{{ t('Literature-verified · cross-checked (Tavily + DeepSeek-v4) · real, no hallucination', '文献验证 · 交叉核对（Tavily + DeepSeek-v4）· 真实、无幻觉') }}</div>
      @if (i18n.isZh()) {
        <h1>癌症如何被真正治愈 —<br><span class="accent">以及 AI 如何节省实验。</span></h1>
        <p class="lead">
          没有单一的治愈方法。“癌症”是数百种疾病，而进展是下列五个杠杆之和。每一节都<strong>先讲它如何真正治愈</strong>（在人群中已被证实的部分），<strong>再讲 AI——尤其是 AlphaFold 式结构预测——如何节省实验</strong>，最后是<strong>不可省去的实验</strong>部分。每一项主张都经独立来源交叉印证；研究性工作均已标注。
        </p>
        <p class="thesis">
          AI 压缩了廉价的计算<em>前端</em>——结构、候选筛选、该筛查谁——从而<strong>减少实验次数、减少合成的死胡同分子。</strong>它从不运行那个证明一个人被保护、肿瘤缩小或疗法安全的实验。
        </p>
      } @else {
        <h1>How cancer is actually being cured —<br><span class="accent">and how AI saves the experiment.</span></h1>
        <p class="lead">
          There is no single cure. "Cancer" is hundreds of diseases, and progress is the sum of five
          levers below. Each section is <strong>first how it actually cures</strong> (what is proven in
          people), <strong>then how AI — especially AlphaFold-style structure prediction — saves
          experimentation</strong>, and finally the part that is <strong>irreducibly experimental</strong>.
          Every claim is corroborated across independent sources; investigational work is labelled.
        </p>
        <p class="thesis">
          AI compresses the cheap, in-silico <em>front</em> — structures, candidate selection,
          who-to-screen — so <strong>fewer experiments are run and fewer dead-end molecules get made.</strong>
          It never runs the experiment that proves a person is protected, a tumour shrinks, or a therapy
          is safe.
        </p>
      }
    </section>

    @for (p of pillars(); track p.title) {
      <section class="pillar" [class.terminal]="p.terminal">
        <div class="phead"><span class="pn">{{ p.n }}</span><h2>{{ p.title }}</h2></div>

        <div class="block proven">
          <h3>{{ t('How it actually cures', '它如何真正治愈') }}</h3>
          <p>{{ p.proven }}</p>
        </div>

        <div class="block ai">
          <h3>{{ t('How AI saves the experiment', 'AI 如何节省实验') }}</h3>
          @if (p.ai.length) {
            <ul>
              @for (m of p.ai; track m.method) {
                <li><strong>{{ m.method }}</strong> — {{ m.saves }} <span class="cite">{{ m.cite }}</span></li>
              }
            </ul>
          } @else {
            <p class="muted">{{ t('Minimal here — the proven wins are biology, behaviour, and policy, not algorithms.', '此处作用甚微——已证实的胜利来自生物学、行为与政策，而非算法。') }}</p>
          }
        </div>

        <div class="block irr">
          <h3>{{ t('Still irreducibly experimental', '仍然不可省去的实验') }}</h3>
          <p>{{ p.irreducible }}</p>
        </div>

        @if (p.link) {
          <a class="pillar-link" [routerLink]="p.link.to">{{ p.link.label }}</a>
        }
      </section>
    }

    <section class="payoff">
      <h2>{{ t('The honest payoff', '诚实的回报') }}</h2>
      @if (i18n.isZh()) {
        <p>
          <strong>AI 以更少的实验抵达治愈——但没有实验它到不了那里。</strong>AlphaFold 式预测是最明确的胜利：它替代了<em>部分</em>结构生物学并把设计前置。但治愈仍由被免疫的人、被切除的癌前病变、被合成并测定的分子、动物、以及临床试验共同建成——在肿瘤学中，进入 I 期的项目只有约 <strong>3.4%</strong> 获批<span class="muted">（Wong, Siah &amp; Lo，<em>Biostatistics</em> 2019）</span>，且每个约耗资 $2.6B、历时 10–15 年<span class="muted">（DiMasi et al. 2016）</span>。
        </p>
      } @else {
        <p>
          <strong>AI gets to the cure with fewer experiments — it does not get there without them.</strong>
          AlphaFold-style prediction is the clearest win: it replaces <em>some</em> structural biology and
          front-loads design. But the cure is still built by the immunised person, the removed precancer,
          the synthesised-and-assayed molecule, the animal, and the trial — in oncology only
          <strong>~3.4%</strong> of programs entering Phase&nbsp;I are approved
          <span class="muted">(Wong, Siah &amp; Lo, <em>Biostatistics</em> 2019)</span>, at ~$2.6B and
          10–15 years each <span class="muted">(DiMasi et al. 2016)</span>.
        </p>
      }
      <div class="cta-row">
        <a routerLink="/explore" class="btn primary large">{{ t('Explore the in-silico front →', '探索计算前端 →') }}</a>
        <a routerLink="/bench" class="btn ghost large">{{ t('Take it to the bench →', '带到实验台 →') }}</a>
      </div>
      <p class="disc muted">{{ t('Research only. Not medical advice, not a treatment recommendation, not a diagnosis.', '仅供研究。非医疗建议、非治疗推荐、非诊断。') }}</p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.8rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.2rem; line-height:1.1; margin-bottom:.55rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:74ch; color:var(--text-dim); margin-bottom:.8rem; }
    .thesis { font-size:1rem; max-width:74ch; border-left:3px solid var(--accent); padding-left:.9rem; }

    .pillar { max-width:880px; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:1rem 1.1rem; margin-bottom:1rem; }
    .pillar.terminal { border-color:#3a1a22; background:linear-gradient(180deg,var(--bg-elev),#190f12); }
    .phead { display:flex; align-items:center; gap:.6rem; margin-bottom:.6rem; }
    .pn { display:grid; place-items:center; width:1.9rem; height:1.9rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--text-dim); }
    .phead h2 { margin:0; font-size:1.3rem; }
    .block { margin-bottom:.6rem; }
    .block h3 { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; margin:0 0 .3rem;
      padding-left:.5rem; border-left:3px solid #24344a; }
    .block.proven h3 { border-color:#1f456e; color:#6fb6ff; }
    .block.ai h3 { border-color:#1f5e44; color:var(--accent); }
    .block.irr h3 { border-color:#5e431f; color:#f0a868; }
    .block p, .block li { font-size:.92rem; line-height:1.5; color:var(--text); }
    .block ul { margin:.2rem 0 0; padding-left:1.1rem; } .block li { margin-bottom:.35rem; }
    .cite { color:var(--text-dim); font-size:.82rem; }
    .pillar-link { display:inline-block; margin-top:.3rem; font-size:.88rem; font-weight:600; color:var(--accent);
      text-decoration:none; border-bottom:1px solid transparent; } .pillar-link:hover { border-bottom-color:var(--accent); }

    .payoff { max-width:880px; margin-top:1.4rem; }
    .payoff h2 { font-size:1.3rem; } .payoff > p { font-size:1.02rem; line-height:1.55; max-width:78ch; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; margin:.9rem 0 .5rem; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }
    .disc { font-size:.82rem; }
  `]
})
export class Cure {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  // computed() so the t() calls re-evaluate when the language toggles (see lang.service.ts).
  readonly pillars = computed<Pillar[]>(() => [
    {
      n: '1', title: this.t('Prevention — the most decisively curative lever', '预防——最具决定性的治愈杠杆'),
      proven: this.t('Stopping a cancer from ever occurring beats any treatment. The HPV vaccine cut cervical-cancer incidence ~87% in England\'s earliest-vaccinated cohort (Falcaro, Lancet 2021) and ~88% in Sweden when given before 17 (Lei, NEJM 2020); the HBV vaccine sharply cut childhood liver cancer in Taiwan (Chang, NEJM 1997); tobacco control is the single largest preventable cause of cancer death; and chemoprevention is guideline-backed — tamoxifen ~50% for high-risk breast cancer, aspirin ~60% in Lynch syndrome (CAPP2, Burn, Lancet 2020).', '让癌症根本不发生胜过任何治疗。HPV 疫苗使英格兰最早接种队列的宫颈癌发病率降低约 87%（Falcaro, Lancet 2021），在瑞典于 17 岁前接种者中降低约 88%（Lei, NEJM 2020）；乙肝（HBV）疫苗大幅降低了台湾地区的儿童肝癌（Chang, NEJM 1997）；控烟是单一最大的可预防癌症死亡原因；化学预防有指南支持——他莫昔芬（tamoxifen）使高危乳腺癌降低约 50%，阿司匹林（aspirin）使 Lynch 综合征降低约 60%（CAPP2, Burn, Lancet 2020）。'),
      ai: [
        { method: this.t('Image-based risk models', '基于影像的风险模型'), saves: this.t('sharpen who to screen and who can be screened less, cutting needless imaging and biopsies', '精确锁定该筛查谁、谁可以少筛，减少不必要的影像检查与活检'), cite: '(Mirai, Sci Transl Med 2021; Sybil, JCO 2023; AVE cervix triage)' },
      ],
      irreducible: this.t('Immunogenicity, durability and safety are measured only in people over years; manufacturing and delivery are wet-lab + logistics; and the biggest lever — tobacco, behaviour, and uptake — is policy, which no model executes. AlphaFold has no proven prevention role yet (the approved vaccines predate it).', '免疫原性、持久性与安全性只能在人群中经年测量；生产与递送属于湿实验室加物流；而最大的杠杆——烟草、行为与接种率——属于政策，没有任何模型能执行。AlphaFold 目前在预防上尚无已证实的作用（已获批的疫苗早于它问世）。'),
    },
    {
      n: '2', title: this.t('Early detection — the biggest survival lever', '早期检测——最大的生存杠杆'),
      proven: this.t('Stage at diagnosis dominates survival, and AI is FDA-authorised here today: Paige Prostate (first FDA AI pathology, 2021), GI Genius (real-time colonoscopy polyp detection, 2021), and AI-supported mammography (the randomised MASAI trial, Lång, Lancet Oncology 2023, found more cancers at roughly half the reading workload). Liquid biopsy / multi-cancer detection (e.g. Galleri) is investigational.', '诊断时的分期主导生存，而 AI 在这里如今已获 FDA 授权：Paige Prostate（首个 FDA 批准的 AI 病理产品，2021）、GI Genius（实时结肠镜息肉检测，2021），以及 AI 辅助乳腺钼靶（随机对照的 MASAI 试验，Lång, Lancet Oncology 2023，在约一半阅片工作量下发现了更多癌症）。液体活检／多癌种检测（如 Galleri）尚属研究性。'),
      ai: [
        { method: this.t('Reads the scan or slide already being taken', '读取已经在拍摄的扫描或切片'), saves: this.t('cuts misses and reader workload and triages where no pathologist is available — no new test required', '减少漏诊与阅片负担，并在没有病理医师的地方进行分诊——无需新增检查'), cite: '(Paige, GI Genius, MASAI)' },
      ],
      irreducible: this.t('You still physically image or sample a living body; a pathologist confirms; a clinician removes the precancer; and only prospective trials prove a mortality benefit.', '你仍需对活体进行实际成像或取样；由病理医师确认；由临床医师切除癌前病变；而只有前瞻性试验才能证明降低死亡率的获益。'),
    },
    {
      n: '3', title: this.t('Precision targeted therapy — where AlphaFold saves the most', '精准靶向治疗——AlphaFold 节省最多之处'),
      proven: this.t('Matching a drug to a tumour\'s driver — EGFR, BTK, BRAF, KRAS G12C — is the daily work of oncology drug discovery, where Provenika operates.', '将药物与肿瘤的驱动突变匹配——EGFR、BTK、BRAF、KRAS G12C——正是肿瘤药物发现的日常工作，也是 Provenika 所处的领域。'),
      ai: [
        { method: this.t('AlphaFold2/3 structure prediction', 'AlphaFold2/3 结构预测'), saves: this.t('gives a usable 3-D model from sequence (CASP14 median GDT-TS 92.4) and a 200M-model database — replacing some of the crystallography needed just to start design', '从序列给出可用的三维模型（CASP14 中位 GDT-TS 92.4）以及一个含 200M 个模型的数据库——替代了仅为启动设计所需的部分晶体学工作'), cite: '(Jumper, Nature 2021; Abramson, Nature 2024)' },
        { method: this.t('Free-energy perturbation (FEP)', '自由能微扰（FEP）'), saves: this.t('ranks which of thousands of analogues are worth synthesising, to ~1 kcal/mol on a congeneric series', '在同系列化合物上以约 1 kcal/mol 的精度，排序数千个类似物中哪些值得合成'), cite: '(Wang, JACS 2015)' },
        { method: this.t('Generative de-novo design', '生成式从头设计'), saves: this.t('proposes novel candidate molecules / binders to test', '提出可供测试的新型候选分子／结合体'), cite: '(RFdiffusion, Nature 2023; REINVENT)' },
      ],
      irreducible: this.t('A predicted structure is not a holo, induced-fit pocket — docking into AlphaFold models is materially worse than into experimental structures (Karelina, eLife 2023); FEP is relative and force-field-capped; and every candidate must still be synthesised and assayed — a Kd is measured, never computed to decision grade.', '预测出的结构并非真实的、诱导契合的结合口袋（holo）——对接进 AlphaFold 模型显著差于对接进实验结构（Karelina, eLife 2023）；FEP 是相对值且受力场上限的制约；而每个候选物仍必须被合成并测定——Kd 是测量得到的，绝不会被计算到可决策的精度。'),
    },
    {
      n: '4', title: this.t('Immunotherapy — turning the immune system on the tumour', '免疫治疗——让免疫系统对付肿瘤'),
      proven: this.t('Checkpoint inhibitors and CAR-T (Kymriah, the first FDA-approved CAR-T, 2017) already cure some blood cancers. Personalised neoantigen mRNA vaccines are investigational but striking: mRNA-4157 (V940) + pembrolizumab cut melanoma recurrence ~49% vs pembrolizumab alone (KEYNOTE-942 Phase 2b; Moderna/Merck).', '免疫检查点抑制剂与 CAR-T（Kymriah，首个 FDA 批准的 CAR-T，2017）已能治愈部分血液肿瘤。个体化新抗原 mRNA 疫苗尚属研究性，但效果惊人：mRNA-4157（V940）+ 帕博利珠单抗（pembrolizumab）相比单用帕博利珠单抗，使黑色素瘤复发降低约 49%（KEYNOTE-942 2b 期；Moderna/Merck）。'),
      ai: [
        { method: this.t('Neoantigen prediction (peptide–MHC binding)', '新抗原预测（肽-MHC 结合）'), saves: this.t('pre-filters which of a patient\'s mutations are worth putting in a personalised vaccine — collapsing a vast experimental search', '预先筛选患者的哪些突变值得放入个体化疫苗——大幅压缩庞大的实验搜索空间'), cite: '(NetMHCpan-4.1, NAR 2020)' },
        { method: this.t('AlphaFold / RFdiffusion for TCR–pMHC & antibody/binder design', '用于 TCR-pMHC 及抗体／结合体设计的 AlphaFold / RFdiffusion'), saves: this.t('models immune-complex structures and designs binders in silico before lab synthesis', '在实验室合成之前，于计算中建模免疫复合物结构并设计结合体'), cite: '(AlphaFold-Multimer; RFdiffusion, Nature 2023)' },
      ],
      irreducible: this.t('The actual immune response, manufacturing each personalised product, and the trial that proves benefit.', '真实的免疫应答、每一份个体化产品的生产，以及证明获益的临床试验。'),
    },
    {
      n: '5', title: this.t('Resistance & combinations — staying ahead of evolution', '耐药与联合用药——领先于演化'),
      proven: this.t('Cancers relapse via resistance mutations — EGFR T790M, answered by the third-generation inhibitor osimertinib (then C797S); KRAS allele switching. Combinations and sequencing extend control.', '癌症通过耐药突变复发——EGFR T790M，由第三代抑制剂奥希替尼（osimertinib）应答（随后是 C797S）；KRAS 等位基因转换。联合用药与序贯治疗延长控制。'),
      ai: [
        { method: this.t('Predict resistance mutations + model the mutant', '预测耐药突变 + 对突变体建模'), saves: this.t('lets chemists design the next-generation inhibitor before the clinic needs it', '让化学家在临床需要之前就设计出下一代抑制剂'), cite: '(AlphaFold / stability-ΔΔG predictors)' },
      ],
      irreducible: this.t('Folding-stability ΔΔG is not the effect on drug binding (many resistance mutations reshape the pocket, not the fold); somatic evolution is read out in patients; and each next-gen drug still runs the entire pipeline.', '折叠稳定性 ΔΔG 并不等于对药物结合的影响（许多耐药突变重塑的是结合口袋，而非折叠）；体细胞演化在患者体内读出；而每一款下一代药物仍要走完整条流水线。'),
      link: { to: '/resistance', label: this.t('The per-target resistance landscape — which specific mutation a next-gen molecule must cover (EGFR C797S · BTK post-pirtobrutinib · KRAS Y96 …) →', '按靶点的耐药全景——下一代分子必须覆盖的具体突变（EGFR C797S · BTK 在 pirtobrutinib 之后 · KRAS Y96 …）→') },
    },
    {
      n: '6', title: this.t('Translation & access — the irreducible clinic', '转化与可及性——不可省去的临床'),
      proven: this.t('Biomarker-guided trials and patient stratification get the right drug to the right patient.', '生物标志物指导的试验与患者分层，让正确的药物送达正确的患者。'),
      ai: [
        { method: this.t('Biomarker discovery & trial-patient matching', '生物标志物发现与试验患者匹配'), saves: this.t('shrinks the search for who benefits and speeds enrolment', '缩小“谁获益”的搜索范围并加快入组'), cite: '' },
      ],
      irreducible: this.t('Efficacy and safety are settled only by Phase 1–3 clinical trials — in oncology only ~3.4% of programs entering Phase I are approved (Wong 2019), at ~$2.6B and 10–15 years each (DiMasi 2016). Approval, manufacturing, and equitable delivery are human, clinical, and economic — no model removes them.', '疗效与安全只能由 1–3 期临床试验来定夺——在肿瘤学中，进入 I 期的项目只有约 3.4% 获批（Wong 2019），且每个约耗资 $2.6B、历时 10–15 年（DiMasi 2016）。审批、生产与公平递送属于人、临床与经济层面——没有任何模型能消除它们。'),
      terminal: true,
    },
  ]);
}
