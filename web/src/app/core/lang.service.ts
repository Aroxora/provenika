import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'zh';

/**
 * Runtime English/Chinese (Simplified) toggle. Zoneless-friendly: `t()` and `pick()` read the `lang`
 * signal, so any template binding or `computed()` that calls them re-renders the instant the user
 * toggles. The choice is persisted to localStorage and reflected on <html lang>.
 *
 * TWO PATTERNS components use (both reactive because they read lang() at evaluation time):
 *
 *   1) Prose written directly in a template — call t() in the binding:
 *        <h1>{{ t('Cure cancer', '攻克癌症') }}</h1>
 *        <input [placeholder]="t('Target', '靶点')">
 *
 *   2) Text held in component data (arrays/objects) — wrap the data in computed() so t() re-runs
 *      on toggle, then render array() in the template:
 *        readonly items = computed(() => [{ title: this.t('Burden', '负担'), ... }]);
 *        // template: @for (i of items(); track i.title) { {{ i.title }} }
 *      (A plain `readonly items = [...]` evaluates ONCE at construction and will NOT switch — always
 *       use computed() for data that contains t() calls.)
 *
 * Never call t() in a class-field initializer that isn't wrapped in computed().
 */
@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>(this.initial());

  /** Pick the active-language string. Reactive: reads the lang signal. */
  readonly t = (en: string, zh: string): string => (this.lang() === 'zh' ? zh : en);

  /** Pick from a bilingual object. Reactive. */
  readonly pick = (o: { en: string; zh: string }): string => (this.lang() === 'zh' ? o.zh : o.en);

  readonly isZh = () => this.lang() === 'zh';

  constructor() { this.applyHtmlLang(this.lang()); }

  set(l: Lang): void {
    this.lang.set(l);
    try { localStorage.setItem('lang', l); } catch { /* private mode */ }
    this.applyHtmlLang(l);
  }

  toggle(): void { this.set(this.lang() === 'zh' ? 'en' : 'zh'); }

  private applyHtmlLang(l: Lang): void {
    if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  }

  private initial(): Lang {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'zh' || saved === 'en') return saved;
      if ((navigator?.language || '').toLowerCase().startsWith('zh')) return 'zh';
    } catch { /* ignore */ }
    return 'en';
  }
}
