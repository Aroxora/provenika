import { Injectable, inject } from '@angular/core';
import { KeysService, Provider } from './keys.service';

export interface ModelChoice { id: string; provider: Provider; label: string }

/** The selectable models, one per provider key the user holds. */
export const MODELS: ModelChoice[] = [
  { id: 'deepseek-chat', provider: 'deepseek', label: 'DeepSeek Chat' },
  { id: 'grok-4.3', provider: 'xai', label: 'Grok 4.3 (xAI)' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o mini (OpenAI)' },
  { id: 'claude-opus-4-8', provider: 'anthropic', label: 'Claude Opus 4.8 (Anthropic)' },
];

export interface RunResult { ok: boolean; text: string; ms: number; error?: string }

const OPENAI_BASE: Partial<Record<Provider, string>> = {
  deepseek: 'https://api.deepseek.com/v1',
  xai: 'https://api.x.ai/v1',
  openai: 'https://api.openai.com/v1',
};

/**
 * Calls each model directly from the browser with the user's stored key. Some providers
 * may block cross-origin browser requests (CORS) — those surface as a clear per-model
 * error rather than a fake answer (same keys work in the repo's CLI without CORS limits).
 */
@Injectable({ providedIn: 'root' })
export class CompareService {
  private keys = inject(KeysService);

  async run(choice: ModelChoice, prompt: string): Promise<RunResult> {
    const t0 = performance.now();
    const key = this.keys.get(choice.provider);
    if (!key) return { ok: false, text: '', ms: 0, error: 'no API key saved for this provider' };
    try {
      const text = choice.provider === 'anthropic'
        ? await this.anthropic(key, choice.id, prompt)
        : await this.openaiCompatible(choice.provider, key, choice.id, prompt);
      return { ok: true, text, ms: Math.round(performance.now() - t0) };
    } catch (e: any) {
      return { ok: false, text: '', ms: Math.round(performance.now() - t0),
               error: (e?.message || String(e)) + ' (a provider blocking browser CORS shows here; the CLI is unaffected)' };
    }
  }

  private async openaiCompatible(p: Provider, key: string, model: string, prompt: string): Promise<string> {
    const res = await fetch(`${OPENAI_BASE[p]}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() ?? '(no content)';
  }

  private async anthropic(key: string, model: string, prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return (d.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim() || '(no content)';
  }

  /** Tavily search (required) — grounds the comparison in real, cited sources. */
  async tavily(query: string): Promise<{ answer: string; sources: { title: string; url: string }[]; error?: string }> {
    const key = this.keys.get('tavily');
    if (!key) return { answer: '', sources: [], error: 'no Tavily key saved' };
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key, query, max_results: 5, include_answer: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      return { answer: d.answer || '', sources: (d.results || []).map((r: any) => ({ title: r.title, url: r.url })) };
    } catch (e: any) {
      return { answer: '', sources: [], error: (e?.message || String(e)) };
    }
  }
}
