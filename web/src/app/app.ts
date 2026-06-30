import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TargetStore } from './core/target-store';
import { LangService } from './core/lang.service';
import { FaviconService } from './core/favicon.service';
import { BusyService } from './core/busy.service';
import { SeoService } from './core/seo.service';
import { track } from './core/firebase';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private store = inject(TargetStore);
  protected readonly i18n = inject(LangService);
  protected readonly t = this.i18n.t;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private favicon = inject(FaviconService);
  private busy = inject(BusyService);
  private seo = inject(SeoService);

  readonly target = this.store.target;
  readonly draft = signal(this.store.target());
  readonly copied = signal(false);
  readonly examples = ['EGFR', 'BTK', 'KRAS G12C', 'BRAF', 'PARP1'];

  // Show the persistent target bar only on the real tool page
  readonly showTargetBar = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/explore');
  });

  private currentUrl = signal('');

  constructor() {
    // Per-route SEO (unique title/description/canonical) + GA4-correct page_view on every navigation.
    this.seo.init();

    // Seed from ?t= (works on any route, but explorer consumes it best)
    const fromUrl = this.route.snapshot.queryParamMap.get('t');
    if (fromUrl) {
      this.store.set(fromUrl);
      this.draft.set(fromUrl);
    }

    // Keep URL in sync for shareable links when target changes (primarily for /explore)
    effect(() => {
      const t = this.store.target();
      const currentT = this.route.snapshot.queryParamMap.get('t');
      if (currentT !== t) {
        this.router.navigate([], {
          queryParams: { t },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
      this.favicon.setTarget(t);
      track('select_target', { target: t });
    });

    effect(() => this.favicon.setBusy(this.busy.busy()));

    // Track route for nav + favicon. The GA4 page_view (enriched with title/location) and per-route
    // metadata are handled by SeoService.init() above, so it is not duplicated here.
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const path = e.urlAfterRedirects.split('?')[0];
      this.currentUrl.set(path);
      const seg = path.split('/').filter(Boolean)[0] || '';
      this.favicon.setRoute(seg);
    });

    // Keep draft in sync with store when navigating
    effect(() => {
      this.draft.set(this.store.target());
    });
  }

  submitTarget(value: string) {
    const v = value.trim();
    if (v) {
      this.store.set(v);
      // Ensure we are on explore when changing target via top bar
      if (!this.router.url.startsWith('/explore')) {
        this.router.navigate(['/explore'], { queryParams: { t: v } });
      }
    }
  }

  pickExample(name: string) {
    this.draft.set(name);
    this.store.set(name);
    if (!this.router.url.startsWith('/explore')) {
      this.router.navigate(['/explore'], { queryParams: { t: name } });
    }
  }

  async copyLink() {
    try {
      const url = location.href;
      await navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1400);
    } catch {}
  }
}
