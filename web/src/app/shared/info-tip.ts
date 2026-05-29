import { Component, computed, input } from '@angular/core';
import { lookup } from '../core/glossary';

let tipSeq = 0;

/** Inline glossary tooltip: <app-tip term="pChEMBL" /> shows a verified definition. */
@Component({
  selector: 'app-tip',
  template: `
    @if (entry(); as e) {
      <span class="tip" tabindex="0" [attr.aria-describedby]="tipId">
        <span class="mark">{{ label() || e.term }}<sup aria-hidden="true">?</sup></span>
        <span class="pop card" role="tooltip" [id]="tipId">
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
      position: absolute; left: 0; top: 1.5em; z-index: 60; width: 280px;
      display: none; flex-direction: column; gap: 0.35rem; font-size: 0.8rem;
      line-height: 1.4; box-shadow: 0 10px 30px #000a; white-space: normal; text-align: left;
    }
    .tip:hover .pop, .tip:focus .pop, .tip:focus-within .pop { display: flex; }
    .pop strong { color: var(--accent); }
    .pop .rng b { color: var(--text-dim); font-weight: 600; }
    .pop .src { font-size: 0.72rem; }
  `],
})
export class InfoTip {
  readonly term = input.required<string>();
  readonly label = input<string>('');
  readonly entry = computed(() => lookup(this.term()));
  readonly tipId = `tip-${tipSeq++}`;
}
