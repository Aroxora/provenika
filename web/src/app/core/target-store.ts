import { Injectable, signal } from '@angular/core';

/** Shared current-target state so all views operate on one target the user picks. */
@Injectable({ providedIn: 'root' })
export class TargetStore {
  readonly target = signal<string>('EGFR');

  set(name: string) {
    const v = name.trim();
    if (v) this.target.set(v);
  }
}
