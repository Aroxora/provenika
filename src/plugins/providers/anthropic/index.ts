import { OpenAIChatCompletionsProvider } from '../../../providers/openaiChatCompletionsProvider.js';
import { registerProvider } from '../../../providers/providerFactory.js';
import { withProviderResilience } from '../../../providers/resilientProvider.js';

let registered = false;

/**
 * Anthropic Provider Plugin
 *
 * Registers the Anthropic provider for Claude models via OpenAI-compatible endpoint.
 * Note: Uses OpenRouter or similar proxy for OpenAI-compatible Anthropic access.
 * For direct Anthropic API, use ANTHROPIC_BASE_URL env var.
 */
export function registerAnthropicProviderPlugin(): void {
  if (registered) {
    return;
  }

  registerProvider('anthropic', (config) => {
    // Support custom base URL for OpenAI-compatible Anthropic proxies
    const baseURL = process.env['ANTHROPIC_BASE_URL'] || 'https://api.anthropic.com/v1';

    const baseProvider = new OpenAIChatCompletionsProvider({
      apiKey: requireEnv('ANTHROPIC_API_KEY'),
      model: config.model,
      baseURL,
      providerId: 'anthropic',
      timeout: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      ...(typeof config.temperature === 'number' ? { temperature: config.temperature } : {}),
      ...(typeof config.maxTokens === 'number' ? { maxTokens: config.maxTokens } : {}),
    });

    return withProviderResilience(baseProvider, 'anthropic', {
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
