import { Component, computed, input, output } from '@angular/core';
import { TriageHit } from '../core/models';

type Shape = 'filled' | 'ring' | 'square';
interface Pt { hit: TriageHit; cx: number; cy: number; color: string; shape: Shape; label: string; }

const W = 640, H = 380, PAD = 48;
const PX_MIN = 5, PX_MAX = 11; // pChEMBL x-range

@Component({
  selector: 'app-scatter',
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="plot" role="group"
         aria-label="Potency (pChEMBL) versus drug-likeness scatter plot of ranked ligands">
      <!-- gridlines -->
      @for (gx of xTicks; track gx) {
        <line [attr.x1]="sx(gx)" [attr.x2]="sx(gx)" [attr.y1]="PAD" [attr.y2]="H - PAD" class="grid" />
        <text [attr.x]="sx(gx)" [attr.y]="H - PAD + 18" class="axt" text-anchor="middle">{{ gx }}</text>
      }
      @for (gy of yTicks; track gy) {
        <line [attr.x1]="PAD" [attr.x2]="W - PAD" [attr.y1]="sy(gy)" [attr.y2]="sy(gy)" class="grid" />
        <text [attr.x]="PAD - 8" [attr.y]="sy(gy) + 4" class="axt" text-anchor="end">{{ gy }}</text>
      }
      <!-- "sweet spot": potent + drug-like -->
      <rect [attr.x]="sx(7)" [attr.y]="sy(1)" [attr.width]="sx(PX_MAX) - sx(7)" [attr.height]="sy(0.6) - sy(1)" class="sweet" />
      <text [attr.x]="sx(PX_MAX) - 6" [attr.y]="sy(1) + 14" class="sweet-lbl" text-anchor="end">potent &amp; drug-like</text>

      <!-- axis labels -->
      <text [attr.x]="W / 2" [attr.y]="H - 8" class="axl" text-anchor="middle">potency  (pChEMBL →)</text>
      <text [attr.x]="14" [attr.y]="H / 2" class="axl" text-anchor="middle" [attr.transform]="'rotate(-90 14 ' + (H / 2) + ')'">drug-likeness →</text>

      <!-- points: redundant shape + color encoding of dev phase -->
      @for (p of points(); track p.hit.chembl_id) {
        @let r = p.hit.chembl_id === selectedId() ? 7 : 5;
        <g class="pt" [class.sel]="p.hit.chembl_id === selectedId()" role="button" tabindex="0"
           [attr.aria-label]="p.label" (click)="select.emit(p.hit)"
           (keydown.enter)="select.emit(p.hit)" (keydown.space)="select.emit(p.hit); $event.preventDefault()">
          @switch (p.shape) {
            @case ('square') {
              <rect [attr.x]="p.cx - r" [attr.y]="p.cy - r" [attr.width]="r * 2" [attr.height]="r * 2" [attr.fill]="p.color" />
            }
            @case ('ring') {
              <circle [attr.cx]="p.cx" [attr.cy]="p.cy" [attr.r]="r" fill="none" [attr.stroke]="p.color" stroke-width="2.5" />
            }
            @default {
              <circle [attr.cx]="p.cx" [attr.cy]="p.cy" [attr.r]="r" [attr.fill]="p.color" />
            }
          }
          <title>{{ p.label }}</title>
        </g>
      }
    </svg>
    <div class="legend">
      <span><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="#3ddc97"/></svg> approved</span>
      <span><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="#4aa8ff" stroke-width="2"/></svg> clinical</span>
      <span><svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" fill="#8b9bb0"/></svg> research</span>
      <span class="muted">click or press Enter on a point for details</span>
    </div>
  `,
  styles: [`
    .plot { width: 100%; height: auto; display: block; background: var(--bg); border-radius: 8px; }
    .grid { stroke: #ffffff10; }
    .axt { fill: var(--text-dim); font-size: 11px; font-family: var(--mono); }
    .axl { fill: var(--text-dim); font-size: 12px; }
    .sweet { fill: #3ddc9712; stroke: #3ddc9740; stroke-dasharray: 4 3; }
    .sweet-lbl { fill: #3ddc97aa; font-size: 11px; }
    .pt { cursor: pointer; }
    .pt:hover { filter: brightness(1.2); }
    .pt:focus { outline: none; }
    .pt:focus rect, .pt:focus circle { stroke: #fff; stroke-width: 2; }
    .pt.sel rect, .pt.sel circle { stroke: #fff; stroke-width: 2; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--text-dim); margin-top: 0.4rem; align-items: center; }
    .legend svg { vertical-align: middle; margin-right: 0.2rem; }
  `],
})
export class Scatter {
  readonly hits = input<TriageHit[]>([]);
  readonly selectedId = input<string>('');
  readonly select = output<TriageHit>();

  readonly W = W; readonly H = H; readonly PAD = PAD; readonly PX_MAX = PX_MAX;
  readonly xTicks = [5, 6, 7, 8, 9, 10, 11];
  readonly yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1];

  readonly points = computed<Pt[]>(() =>
    this.hits().map((h) => {
      const phase = h.dev_phase === 'approved drug' ? 'approved' : h.dev_phase.startsWith('clinical') ? 'clinical' : 'research';
      const color = phase === 'approved' ? '#3ddc97' : phase === 'clinical' ? '#4aa8ff' : '#8b9bb0';
      const shape: Shape = phase === 'approved' ? 'filled' : phase === 'clinical' ? 'ring' : 'square';
      return {
        hit: h,
        cx: this.sx(Math.max(PX_MIN, Math.min(PX_MAX, h.pchembl_median))),
        cy: this.sy(Math.max(0, Math.min(1, h.drug_likeness))),
        color, shape,
        label: `${h.name === h.chembl_id ? h.chembl_id : h.name}: pChEMBL ${h.pchembl_median.toFixed(1)}, drug-likeness ${h.drug_likeness.toFixed(2)}, ${phase}`,
      };
    }),
  );

  sx(v: number): number {
    return PAD + ((v - PX_MIN) / (PX_MAX - PX_MIN)) * (W - 2 * PAD);
  }
  sy(v: number): number {
    return H - PAD - v * (H - 2 * PAD);
  }
}
