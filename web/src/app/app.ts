import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TargetStore } from './core/target-store';
import { FaviconService } from './core/favicon.service';
import { track } from './core/firebase';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private store = inject(TargetStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private favicon = inject(FaviconService);
  readonly target = this.store.target;
  readonly draft = signal(this.store.target());

  readonly examples = ['EGFR', 'BTK', 'KRAS G12C', 'ALK', 'BRAF', 'PARP1', 'CDK4'];

  constructor() {
    // Read shareable target from ?t= on load.
    const fromUrl = this.route.snapshot.queryParamMap.get('t');
    if (fromUrl) {
      this.store.set(fromUrl);
      this.draft.set(fromUrl);
    }
    // Keep ?t= in sync so links are shareable / reload-safe; track target changes.
    effect(() => {
      const t = this.store.target();
      if (this.route.snapshot.queryParamMap.get('t') !== t) {
        this.router.navigate([], { queryParams: { t }, queryParamsHandling: 'merge', replaceUrl: true });
      }
      track('select_target', { target: t });
    });
    // Dynamic favicon + GA4 page_view on every SPA route change.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      const path = (e as NavigationEnd).urlAfterRedirects;
      const seg = path.split('?')[0].split('/').filter(Boolean)[0] || 'overview';
      this.favicon.setActivity(seg);
      track('page_view', { page_path: path, page_title: seg });
    });
  }

  readonly copied = signal(false);

  submit(value: string) {
    this.store.set(value);
  }

  pick(name: string) {
    this.draft.set(name);
    this.store.set(name);
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      /* clipboard blocked (e.g. insecure context) — no-op */
    }
  }
}
