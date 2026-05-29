import { Injectable, signal } from '@angular/core';

export interface FocusLigand { id: string; pchembl: number; name: string; }

/** Shared current-target state so all views operate on one target the user picks. */
@Injectable({ providedIn: 'root' })
export class TargetStore {
  readonly target = signal<string>('EGFR');
  /** A ligand the user drilled into (e.g. from triage) — used to prefill the models. */
  readonly focusLigand = signal<FocusLigand | null>(null);

  set(name: string) {
    const v = name.trim();
    if (v) {
      this.target.set(v);
      this.focusLigand.set(null); // new target → clear stale ligand focus
    }
  }

  setFocusLigand(l: FocusLigand) {
    this.focusLigand.set(l);
  }
}
