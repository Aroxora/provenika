import { Component, computed, input } from '@angular/core';
import { Pt } from '../../core/math-models';

export interface Series { color: string; pts: Pt[]; label?: string; }
export interface Marker { x: number; y: number; label: string; }

const W = 600, H = 340, PAD = 50;

@Component({
  selector: 'app-line-plot',
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="lp" role="img" [attr.aria-label]="aria()">
      @for (t of xTicks(); track t.v) {
        <line [attr.x1]="t.px" [attr.x2]="t.px" [attr.y1]="PAD" [attr.y2]="H - PAD" class="g" />
        <text [attr.x]="t.px" [attr.y]="H - PAD + 16" class="t" text-anchor="middle">{{ t.lbl }}</text>
      }
      @for (t of yTicks(); track t.v) {
        <line [attr.x1]="PAD" [attr.x2]="W - PAD" [attr.y1]="t.px" [attr.y2]="t.px" class="g" />
        <text [attr.x]="PAD - 6" [attr.y]="t.px + 4" class="t" text-anchor="end">{{ t.lbl }}</text>
      }
      @for (s of scaled(); track $index) {
        <polyline [attr.points]="s" fill="none" [attr.stroke]="seriesColor($index)" stroke-width="2" />
      }
      @for (m of scaledMarkers(); track m.label) {
        <circle [attr.cx]="m.px" [attr.cy]="m.py" r="4" fill="var(--warn)" />
        <text [attr.x]="m.px + 6" [attr.y]="m.py - 6" class="m">{{ m.label }}</text>
      }
      <text [attr.x]="W / 2" [attr.y]="H - 6" class="al" text-anchor="middle">{{ xLabel() }}</text>
      <text [attr.x]="14" [attr.y]="H / 2" class="al" text-anchor="middle" [attr.transform]="'rotate(-90 14 ' + (H / 2) + ')'">{{ yLabel() }}</text>
    </svg>
  `,
  styles: [`
    .lp { width: 100%; height: auto; background: var(--bg); border-radius: 8px; }
    .g { stroke: #ffffff10; }
    .t { fill: var(--text-dim); font-size: 10px; font-family: var(--mono); }
    .al { fill: var(--text-dim); font-size: 12px; }
    .m { fill: var(--warn); font-size: 10px; font-family: var(--mono); }
  `],
})
export class LinePlot {
  readonly series = input<Series[]>([]);
  readonly xmin = input(0); readonly xmax = input(1);
  readonly ymin = input(0); readonly ymax = input(1);
  readonly xLabel = input(''); readonly yLabel = input('');
  readonly logX = input(false);
  readonly markers = input<Marker[]>([]);

  readonly W = W; readonly H = H; readonly PAD = PAD;
  private palette = ['#3ddc97', '#4aa8ff', '#ffb454', '#ff6b6b'];
  seriesColor(i: number) { return this.series()[i]?.color || this.palette[i % this.palette.length]; }
  aria = computed(() => `${this.yLabel()} versus ${this.xLabel()} line chart`);

  private tx(x: number): number {
    const lo = this.logX() ? Math.log10(this.xmin()) : this.xmin();
    const hi = this.logX() ? Math.log10(this.xmax()) : this.xmax();
    const v = this.logX() ? Math.log10(Math.max(x, 1e-12)) : x;
    return PAD + ((v - lo) / (hi - lo || 1)) * (W - 2 * PAD);
  }
  private ty(y: number): number {
    return H - PAD - ((y - this.ymin()) / (this.ymax() - this.ymin() || 1)) * (H - 2 * PAD);
  }

  readonly scaled = computed(() =>
    this.series().map((s) => s.pts.map((p) => `${this.tx(p.x).toFixed(1)},${this.ty(p.y).toFixed(1)}`).join(' ')),
  );

  readonly scaledMarkers = computed(() =>
    this.markers().map((m) => ({ label: m.label, px: this.tx(m.x), py: this.ty(m.y) })),
  );

  readonly xTicks = computed(() => {
    if (this.logX()) {
      const lo = Math.floor(Math.log10(this.xmin())), hi = Math.ceil(Math.log10(this.xmax()));
      const out = [];
      for (let d = lo; d <= hi; d++) out.push({ v: d, px: this.tx(Math.pow(10, d)), lbl: `1e${d}` });
      return out;
    }
    return this.linTicks(this.xmin(), this.xmax()).map((v) => ({ v, px: this.tx(v), lbl: fmt(v) }));
  });
  readonly yTicks = computed(() =>
    this.linTicks(this.ymin(), this.ymax()).map((v) => ({ v, px: this.ty(v), lbl: fmt(v) })),
  );

  private linTicks(lo: number, hi: number): number[] {
    const n = 5, step = (hi - lo) / n, out = [];
    for (let i = 0; i <= n; i++) out.push(lo + i * step);
    return out;
  }
}

function fmt(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1000 || a < 0.01) return v.toExponential(1);
  return Number(v.toFixed(2)).toString();
}
