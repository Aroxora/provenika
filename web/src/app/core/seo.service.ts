import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { track } from './firebase';

/**
 * Per-route SEO + GA4 page tracking for the single-page app.
 *
 * An Angular SPA never reloads, so without this every route would share index.html's single
 * <title>/<meta description> (bad for search) and GA4's auto page_view would fire only once on
 * load (bad for analytics). On each NavigationEnd this service:
 *   - sets a unique, descriptive <title> + meta description + Open Graph/Twitter tags,
 *   - keeps <link rel="canonical"> pointing at the current clean URL,
 *   - marks utility routes (admin) noindex,
 *   - emits a GA4 `page_view` enriched with page_title + page_location (SPA-correct).
 *
 * All copy stays within the project's honest framing ("research only; not medical advice").
 */

const ORIGIN = 'https://provenika.com';

interface RouteMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const DEFAULT_DESC =
  'Provenika turns free public oncology data into ranked, fully-cited, independently re-verifiable ' +
  'drug-discovery hypotheses — compute or cite, never assert. Research only; not medical advice.';

// Keyed by the first path segment. '' is the landing page.
const ROUTE_META: Record<string, RouteMeta> = {
  '': {
    title: 'How cancer is actually being cured — and where AI saves the experiment | Provenika',
    description:
      'The five levers actually curing cancer — prevention, early detection, precision therapy, ' +
      'immunotherapy, resistance — and exactly where AI (AlphaFold-style) saves experimentation vs ' +
      'what only the wet lab and clinic can do. Literature-verified. Research only; not medical advice.',
  },
  explore: {
    title: 'Explore a target — Provenika',
    description:
      'Explore any oncology target: druggability dossier, a ranked ligand shortlist, structures, ' +
      'and feasibility — every figure traced to a public source (ChEMBL, UniProt, RCSB). Research only.',
  },
  log: {
    title: 'Agent log — Provenika',
    description:
      "Radical transparency: Provenika's automated research and outreach actions, in the open and " +
      'time-stamped. Leads to verify, never asserted facts. Research only; not medical advice.',
  },
  investors: {
    title: 'Investors — Provenika',
    description:
      'Provenika is an auditable oncology evidence engine accelerating the cheap, in-silico front of ' +
      'drug discovery — target triage to docking setup, every number re-provable. The thesis and roadmap.',
  },
  about: {
    title: 'About — Provenika',
    description:
      'What Provenika is and is not: an evidence engine that computes or cites every number and never ' +
      'asserts. Anti-hallucination by design. Research only; not medical advice, not a diagnosis.',
  },
  admin: {
    title: 'Admin — Provenika',
    description: DEFAULT_DESC,
    noindex: true,
  },
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  /** Subscribe to navigation and apply metadata. Call once from the root component. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.apply(e.urlAfterRedirects));
  }

  private apply(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const seg = path.split('/').filter(Boolean)[0] ?? '';
    const m = ROUTE_META[seg] ?? ROUTE_META[''];
    const canonical = ORIGIN + (path === '/' ? '/' : path);

    this.title.setTitle(m.title);
    this.meta.updateTag({ name: 'description', content: m.description });
    this.meta.updateTag({ property: 'og:title', content: m.title });
    this.meta.updateTag({ property: 'og:description', content: m.description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:title', content: m.title });
    this.meta.updateTag({ name: 'twitter:description', content: m.description });
    this.meta.updateTag({
      name: 'robots',
      content: m.noindex ? 'noindex, nofollow' : 'index, follow',
    });
    this.setCanonical(canonical);

    // GA4-correct page_view: include the resolved title + full location, not just the path.
    track('page_view', {
      page_path: path,
      page_title: m.title,
      page_location: this.doc.location?.href ?? canonical,
    });
  }

  private setCanonical(href: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
