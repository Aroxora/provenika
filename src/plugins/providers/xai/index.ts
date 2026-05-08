import { OpenAIChatCompletionsProvider } from '../../../providers/openaiChatCompletionsProvider.js';
import { registerProvider } from '../../../providers/providerFactory.js';
import { withProviderResilience } from '../../../providers/resilientProvider.js';

let registered = false;

/**
 * xAI Provider Plugin
 *
 * Registers the xAI provider for Grok models:
 * - Grok 4.1 Fast Reasoning
 * - Grok 4
 * - OpenAI-compatible API
 */
export function registerXAIProviderPlugin(): void {
  if (registered) {
    return;
  }

  registerProvider('xai', (config) => {
    const baseProvider = new OpenAIChatCompletionsProvider({
      apiKey: requireEnv('XAI_API_KEY'),
      model: config.model,
      baseURL: 'https://api.x.ai/v1',
      providerId: 'xai',
      timeout: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      ...(typeof config.temperature === 'number' ? { temperature: config.temperature } : {}),
      ...(typeof config.maxTokens === 'number' ? { maxTokens: config.maxTokens } : {}),
    });

    return withProviderResilience(baseProvider, 'xai', {
      maxRequestsPerMinute: 60,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 60000,
    });
  });

  registered = true;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}
