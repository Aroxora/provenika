import { Injectable } from '@angular/core';

interface Route { letter: string; color: string; }

// Each view → a short mark + a group color. Letters/digits render reliably everywhere.
const ROUTES: Record<string, Route> = {
  '': { letter: '⬡', color: '#3ddc97' },
  'home': { letter: '⬡', color: '#3ddc97' },
  'landing': { letter: '⬡', color: '#3ddc97' },
  'explore': { letter: '▣', color: '#4aa8ff' },
  'log': { letter: '◉', color: '#3ddc97' },
  'investors': { letter: '$', color: '#f0b060' },
  'about': { letter: '?', color: '#8b9bb0' },
  'admin': { letter: '⚙', color: '#ff6b6b' },
};
const BG = '#0a0e14';
const SIZE = 64;

/**
 * Dynamic favicon, canvas-rendered, reflecting what the user is reading & doing:
 *   - the active view (section mark + group color),
 *   - the active target (initial badge),
 *   - work in progress (an animated spinner arc while any request is in flight).
 * Animation runs only while busy and pauses when the tab is hidden (low CPU).
 */
@Injectable({ providedIn: 'root' })
export class FaviconService {
  private link: HTMLLinkElement | null = null;
  private canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  private routeId = 'overview';
  private target = '';
  private busy = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase = 0;

  constructor() {
    if (this.canvas) { this.canvas.width = SIZE; this.canvas.height = SIZE; }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pause();
        else if (this.busy) this.play();
      });
    }
  }

  /** Back-compat alias for the route setter. */
  setActivity(id: string) { this.setRoute(id); }
  setRoute(id: string) { this.routeId = id; this.renderIfIdle(); }
  setTarget(t: string) { this.target = (t || '').trim(); this.renderIfIdle(); }
  setBusy(b: boolean) {
    if (b === this.busy) return;
    this.busy = b;
    if (b) this.play();
    else { this.pause(); this.phase = 0; this.draw(); }
  }

  private renderIfIdle() { if (!this.busy) this.draw(); }
  private play() {
    if (this.timer || !this.canvas) return;
    this.timer = setInterval(() => { this.phase = (this.phase + 0.22) % (Math.PI * 2); this.draw(); }, 80);
  }
  private pause() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }

  private draw() {
    const cv = this.canvas;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const r = ROUTES[this.routeId] ?? ROUTES[''];
    ctx.clearRect(0, 0, SIZE, SIZE);

    // rounded dark background
    ctx.fillStyle = BG;
    roundRect(ctx, 0, 0, SIZE, SIZE, 14);
    ctx.fill();

    // section mark
    ctx.fillStyle = r.color;
    ctx.font = '700 34px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.letter, SIZE / 2, SIZE / 2 + 2);

    // busy spinner arc (what the user is doing)
    if (this.busy) {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, 27, this.phase, this.phase + Math.PI * 1.4);
      ctx.stroke();
    }

    // active-target initial badge (what the user is reading about)
    const init = this.target.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
    if (init) {
      ctx.fillStyle = r.color;
      roundRect(ctx, SIZE - 30, SIZE - 24, 30, 24, 7);
      ctx.fill();
      ctx.fillStyle = BG;
      ctx.font = '700 16px ui-monospace, monospace';
      ctx.fillText(init, SIZE - 15, SIZE - 11);
    }

    this.apply(cv.toDataURL('image/png'));
  }

  private apply(href: string) {
    if (typeof document === 'undefined') return;
    if (!this.link) {
      this.link = document.querySelector("link[rel~='icon']");
      if (!this.link) { this.link = document.createElement('link'); this.link.rel = 'icon'; document.head.appendChild(this.link); }
    }
    this.link.type = 'image/png';
    this.link.href = href;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
