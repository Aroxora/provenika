import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LangService } from '../../core/lang.service';

interface Partner { name: string; url: string; what: string; free?: boolean; }
interface Step { n: string; title: string; question: string; assay: string; partners: Partner[]; }

@Component({
  selector: 'app-bench',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="badge">{{ t('The bridge from hypothesis to bench · real labs, verified', '从假设到实验台的桥梁 · 真实实验室，经过核实') }}</div>
      @if (i18n.isZh()) {
        <h1>你已经有了一个有引用支撑的假设。<br><span class="accent">这里告诉你如何验证它——以及谁能做到。</span></h1>
      } @else {
        <h1>You have a cited hypothesis.<br><span class="accent">Here's how to test it — and who can.</span></h1>
      }
      <p class="lead">
        @if (i18n.isZh()) {
          Provenika 止步于一个经过排序、可复核的<em>假设</em>——以结构感知的对接对公开的 ChEMBL
          生物活性数据重新排序。这并非已验证的命中；唯有湿实验室才能证实它。下面是验证一个候选物所需的、
          确切而有序的实验链条，以及承担每一步的真实实验室、CRO 和<strong>免费项目</strong>。
          流水线可为每个靶点生成一份可直接发送的材料包（候选物、对接构象、出处溯源）。
        } @else {
          Provenika ends at a ranked, re-verifiable <em>hypothesis</em> — public ChEMBL bioactivity
          re-ranked by structure-aware docking. That is not a validated hit; only the wet lab proves it.
          Below is the exact, ordered chain of experiments that would test a candidate, and the real
          labs, CROs, and <strong>free programs</strong> that run each step. The pipeline can emit a
          ready-to-send package (candidates, poses, provenance) per target.
        }
      </p>
      <p class="how muted">
        @if (i18n.isZh()) {
          为任意一次运行生成一份：<code class="mono">python3 cad/validation_package.py --run runs/egfr</code>
          ——它会写出一份带引用的验证请求和一封邀约草稿（它不会发送任何内容；由你决定联系谁）。
        } @else {
          Generate one for any run: <code class="mono">python3 cad/validation_package.py --run runs/egfr</code>
          — it writes a cited validation request + a draft pitch (it sends nothing; you decide who to contact).
        }
      </p>
    </section>

    @for (s of steps(); track s.title) {
      <section class="step">
        <div class="shead"><span class="sn">{{ s.n }}</span><h2>{{ s.title }}</h2></div>
        <p class="q"><strong>{{ t('Question:', '问题：') }}</strong> {{ s.question }}</p>
        <p class="a"><strong>{{ t('Assay:', '测定方法：') }}</strong> {{ s.assay }}</p>
        <div class="partners">
          @for (p of s.partners; track p.name) {
            <a class="partner" [href]="p.url" target="_blank" rel="noopener">
              <span class="pname">{{ p.name }} @if (p.free) { <span class="free">{{ t('FREE', '免费') }}</span> }</span>
              <span class="pwhat muted">{{ p.what }}</span>
            </a>
          }
        </div>
      </section>
    }

    <section class="cta">
      <h2>{{ t('Request validation', '申请验证') }}</h2>
      <p>
        {{ t('Have a target or a candidate set you want tested? The honest ask is small and concrete: a biochemical IC50 to confirm binding, then a selectivity panel. Every figure is traceable and re-checkable — the SMILES, docking poses, and provenance manifest travel with the request.', '有想要验证的靶点或候选物集合吗？诚实的请求既小又具体：先用一个生化 IC50 确认结合，再做一组选择性谱。每一个数字都可溯源、可复核——SMILES、对接构象与出处清单都随请求一并提供。') }}
      </p>
      <div class="cta-row">
        <a [href]="mailto" class="btn primary large">{{ t('Email to start a validation →', '发邮件开始一次验证 →') }}</a>
        <a routerLink="/explore" class="btn ghost large">{{ t('Build a shortlist first', '先生成一份候选清单') }}</a>
      </div>
      <p class="disc muted">
        {{ t('Provenika hands off a hypothesis; the lab decides what to test. Research only — not medical advice, not a treatment recommendation. ΔG is a predicted ranking aid, never a measured affinity.', 'Provenika 只交付一个假设；测试什么由实验室决定。仅供研究——非医疗建议，非治疗推荐。ΔG 是预测性的排序辅助，绝非实测的亲和力。') }}
      </p>
    </section>
  `,
  styles: [`
    .hero { max-width: 880px; margin-bottom: 1.6rem; }
    .badge { display:inline-block; font-size:.76rem; padding:.2rem .7rem; border-radius:999px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; margin-bottom:.7rem; }
    h1 { font-size:2.15rem; line-height:1.1; margin-bottom:.5rem; } .accent { color:var(--accent); }
    .lead { font-size:1.05rem; max-width:74ch; color:var(--text-dim); margin-bottom:.7rem; }
    .how { font-size:.9rem; max-width:74ch; }
    .mono { font-family: var(--mono); background:#0f1722; padding:.1rem .35rem; border-radius:5px; }

    .step { max-width:880px; background:var(--bg-elev); border:1px solid #1c2738; border-radius:12px;
      padding:.9rem 1.05rem; margin-bottom:.8rem; }
    .shead { display:flex; align-items:center; gap:.6rem; margin-bottom:.5rem; }
    .sn { display:grid; place-items:center; width:1.8rem; height:1.8rem; border-radius:8px;
      background:#0f1722; border:1px solid #24344a; font-weight:700; color:var(--accent); }
    .shead h2 { margin:0; font-size:1.2rem; }
    .q, .a { font-size:.92rem; line-height:1.45; margin:.15rem 0; }
    .partners { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:.5rem; margin-top:.55rem; }
    .partner { display:flex; flex-direction:column; gap:.1rem; padding:.5rem .65rem; border:1px solid #24344a;
      border-radius:8px; text-decoration:none; background:#0f1722; }
    .partner:hover { border-color:var(--accent); }
    .pname { font-weight:600; font-size:.9rem; color:var(--text); }
    .pwhat { font-size:.8rem; }
    .free { font-size:.6rem; font-weight:700; letter-spacing:.04em; padding:.06rem .3rem; border-radius:4px;
      background:#11231c; color:var(--accent); border:1px solid #1f5e44; vertical-align:middle; }

    .cta { max-width:880px; margin-top:1.3rem; }
    .cta h2 { font-size:1.3rem; } .cta > p { max-width:78ch; line-height:1.5; }
    .cta-row { display:flex; gap:.6rem; flex-wrap:wrap; margin:.9rem 0 .5rem; }
    .btn.large { padding:.65rem 1.15rem; font-size:1rem; }
    .disc { font-size:.82rem; max-width:74ch; }
  `]
})
export class Bench {
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;

  readonly mailto = 'mailto:bo@shang.software?subject=Provenika%20%E2%80%94%20experimental%20validation%20collaboration&body=Target%20or%20candidate%20set%3A%20%0AAssay%20of%20interest%20(binding%20IC50%2C%20selectivity%2C%20cell)%3A%20';

  // computed() so the t() calls re-evaluate when the language toggles (see lang.service.ts).
  readonly steps = computed<Step[]>(() => [
    {
      n: '1', title: this.t('Confirm it binds', '确认其结合'),
      question: this.t('Does the prioritized compound actually bind the target, and how tightly?', '被优先排序的化合物是否真的能与靶点结合？结合有多紧密？'),
      assay: this.t('Biochemical potency (enzyme IC50/Ki) + a biophysical binding readout (SPR/ITC) vs the purified target.', '生化效力（酶 IC50/Ki）+ 针对纯化靶点的生物物理结合读出（SPR/ITC）。'),
      partners: [
        { name: 'Reaction Biology', url: 'https://www.reactionbiology.com', what: this.t('biochemical enzyme IC50/Ki + binding profiling', '生化酶 IC50/Ki + 结合谱分析') },
        { name: 'Eurofins Discovery', url: 'https://www.eurofinsdiscovery.com', what: this.t('enzyme & biophysical binding assays, custom IC50', '酶与生物物理结合测定，定制 IC50') },
      ],
    },
    {
      n: '2', title: this.t('Prove selectivity', '验证选择性'),
      question: this.t('Is it selective, or a promiscuous binder — a primary oncology liability?', '它具有选择性，还是一个滥结合的化合物——肿瘤学中的首要风险？'),
      assay: this.t('An off-target / kinome selectivity panel on the top candidates.', '对最优候选物进行脱靶／激酶组选择性谱筛。'),
      partners: [
        { name: 'Eurofins DiscoverX KINOMEscan', url: 'https://www.eurofinsdiscovery.com', what: this.t('kinome-wide selectivity (competitive binding)', '全激酶组选择性（竞争结合）') },
        { name: 'Reaction Biology kinase panels', url: 'https://www.reactionbiology.com', what: this.t('large biochemical kinase selectivity panels', '大规模生化激酶选择性谱组') },
      ],
    },
    {
      n: '3', title: this.t('Engage the target in a cell', '在细胞内作用于靶点'),
      question: this.t('Does it cross into cells, hit the target in situ, and kill the cancer cell?', '它能否进入细胞、在原位作用于靶点，并杀死癌细胞？'),
      assay: this.t('Cellular target-engagement (CETSA/NanoBRET) + viability in relevant tumour lines; NCI-60 for breadth.', '细胞内靶点结合（CETSA/NanoBRET）+ 相关肿瘤细胞系的活力测定；以 NCI-60 评估广度。'),
      partners: [
        { name: 'NCI Developmental Therapeutics Program', url: 'https://dtp.cancer.gov', what: this.t('60-human-tumour-cell-line screening for qualifying compounds', '对符合条件的化合物进行 60 株人源肿瘤细胞系筛选'), free: true },
        { name: 'Charles River / WuXi AppTec', url: 'https://www.criver.com', what: this.t('cellular potency, viability, target-engagement assays', '细胞效力、活力与靶点结合测定') },
      ],
    },
    {
      n: '4', title: this.t('Establish ADMET / PK', '确立 ADMET / PK'),
      question: this.t('Is it developable and safe enough to advance?', '它是否具备成药性、是否足够安全以继续推进？'),
      assay: this.t('In-vitro ADME (microsomes, hERG, Caco-2) and, if it advances, animal PK/tox.', '体外 ADME（肝微粒体、hERG、Caco-2），若继续推进，则进行动物 PK／毒性研究。'),
      partners: [
        { name: 'Charles River Laboratories', url: 'https://www.criver.com', what: this.t('in-vitro ADME (microsomes, hERG, Caco-2) and PK', '体外 ADME（肝微粒体、hERG、Caco-2）与 PK') },
        { name: 'Structural Genomics Consortium (SGC)', url: 'https://www.thesgc.org', what: this.t('open chemical-probe & target-validation collaborations', '开放的化学探针与靶点验证合作'), free: true },
      ],
    },
  ]);
}
