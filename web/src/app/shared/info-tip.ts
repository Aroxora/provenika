import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { lookup } from '../core/glossary';

let tipSeq = 0;

/**
 * Inline glossary tooltip: <app-tip term="pChEMBL" /> shows a verified definition.
 * The popover is position:fixed with coordinates computed on open, so it is never
 * clipped by a scrollable container (e.g. a table with overflow:auto).
 */
@Component({
  selector: 'app-tip',
  template: `
    @if (entry(); as e) {
      <span class="tip" tabindex="0" [attr.aria-describedby]="tipId"
            (mouseenter)="place($event)" (focus)="place($event)"
            (mouseleave)="open.set(false)" (blur)="open.set(false)">
        <span class="mark">{{ label() || e.term }}<sup aria-hidden="true">?</sup></span>
        <span class="pop card" role="tooltip" [id]="tipId" [class.show]="open()"
              [style.top.px]="pos().top" [style.left.px]="pos().left">
          <strong>{{ e.term }}</strong>
          <span class="def">{{ e.definition }}</span>
          @if (e.typicalRange && e.typicalRange !== 'n/a') { <span class="rng"><b>Typical:</b> {{ e.typicalRange }}</span> }
          @if (e.whyItMatters) { <span class="why">{{ e.whyItMatters }}</span> }
          <span class="src muted">Source: {{ e.source }}</span>
        </span>
      </span>
    } @else {
      <span>{{ label() }}</span>
    }
  `,
  styles: [`
    .tip { position: relative; cursor: help; outline: none; }
    .mark { border-bottom: 1px dotted var(--text-dim); }
    .mark sup { color: var(--accent-2); font-size: 0.7em; margin-left: 1px; }
    .pop {
      position: fixed; z-index: 1000; width: 280px; max-width: 90vw;
      display: none; flex-direction: column; gap: 0.35rem; font-size: 0.8rem;
      line-height: 1.4; box-shadow: 0 10px 30px #000a; white-space: normal; text-align: left;
    }
    .pop.show { display: flex; }
    .pop strong { color: var(--accent); }
    .pop .rng b { color: var(--text-dim); font-weight: 600; }
    .pop .src { font-size: 0.72rem; }
  `],
})
export class InfoTip {
  private host = inject(ElementRef<HTMLElement>);
  readonly term = input.required<string>();
  readonly label = input<string>('');
  readonly entry = computed(() => lookup(this.term()));
  readonly tipId = `tip-${tipSeq++}`;
  readonly open = signal(false);
  readonly pos = signal({ top: 0, left: 0 });

  place(ev: Event) {
    const mark = (ev.currentTarget as HTMLElement).querySelector('.mark') ?? (ev.currentTarget as HTMLElement);
    const r = (mark as HTMLElement).getBoundingClientRect();
    const width = 280;
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    this.pos.set({ top: Math.round(r.bottom + 6), left: Math.round(left) });
    this.open.set(true);
  }
}
