import { Injectable, signal } from '@angular/core';

export type Provider = 'deepseek' | 'xai' | 'gemini' | 'openai' | 'anthropic' | 'tavily';

/**
 * Browser-local API-key store. Keys live ONLY in localStorage on this device and are
 * sent ONLY directly to the model/Tavily APIs the user calls — never to our servers
 * (the site is static hosting; there is no backend to receive them). Used by the
 * Settings page and the model-comparison page. The user can clear them at any time.
 */
@Injectable({ providedIn: 'root' })
export class KeysService {
  private readonly KEY = 'provenika.apiKeys.v1';
  readonly keys = signal<Record<Provider, string>>(this.load());

  private load(): Record<Provider, string> {
    try {
      return { deepseek: '', xai: '', gemini: '', openai: '', anthropic: '', tavily: '',
               ...JSON.parse(localStorage.getItem(this.KEY) || '{}') };
    } catch {
      return { deepseek: '', xai: '', gemini: '', openai: '', anthropic: '', tavily: '' };
    }
  }

  get(p: Provider): string { return (this.keys()[p] || '').trim(); }
  has(p: Provider): boolean { return this.get(p).length > 0; }
  /** Tavily is required; at least one model provider key is needed to compare. */
  get ready(): boolean {
    return this.has('tavily') && (['deepseek', 'xai', 'gemini', 'openai', 'anthropic'] as Provider[]).some((p) => this.has(p));
  }

  save(next: Partial<Record<Provider, string>>): void {
    const merged = { ...this.keys(), ...next };
    localStorage.setItem(this.KEY, JSON.stringify(merged));
    this.keys.set(merged);
  }

  clearOne(p: Provider): void { this.save({ [p]: '' }); }
  clearAll(): void {
    localStorage.removeItem(this.KEY);
    this.keys.set(this.load());
  }
}
