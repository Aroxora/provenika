import { OpenAIChatCompletionsProvider } from '../../../providers/openaiChatCompletionsProvider.js';
import { registerProvider } from '../../../providers/providerFactory.js';
import { withProviderResilience } from '../../../providers/resilientProvider.js';

let registered = false;

/**
 * OpenAI Provider Plugin
 *
 * Registers the OpenAI provider with resilience for:
 * - GPT-5, GPT-4, o1, o3 series models
 * - Rate limiting with exponential backoff
 * - Circuit breaker for cascading failure prevention
 */
export function registerOpenAIProviderPlugin(): void {
  if (registered) {
    return;
  }

  registerProvider('openai', (config) => {
    const baseProvider = new OpenAIChatCompletionsProvider({
      apiKey: requireEnv('OPENAI_API_KEY'),
      model: config.model,
      baseURL: 'https://api.openai.com/v1',
      providerId: 'openai',
      timeout: 24 * 60 * 60 * 1000, // 24 hours
      maxRetries: 3,
      ...(typeof config.temperature === 'number' ? { temperature: config.temperature } : {}),
      ...(typeof config.maxTokens === 'number' ? { maxTokens: config.maxTokens } : {}),
    });

    return withProviderResilience(baseProvider, 'openai', {
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
