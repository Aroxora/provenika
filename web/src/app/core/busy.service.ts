import { Injectable, computed, signal } from '@angular/core';

/** Tracks in-flight HTTP requests so the UI (e.g. the favicon) can reflect activity. */
@Injectable({ providedIn: 'root' })
export class BusyService {
  private readonly count = signal(0);
  readonly busy = computed(() => this.count() > 0);
  inc() { this.count.update((n) => n + 1); }
  dec() { this.count.update((n) => Math.max(0, n - 1)); }
}
