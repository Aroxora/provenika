import { registerDeepSeekProviderPlugin } from './deepseek/index.js';
import { registerOpenAIProviderPlugin } from './openai/index.js';
import { registerAnthropicProviderPlugin } from './anthropic/index.js';
import { registerXAIProviderPlugin } from './xai/index.js';

let defaultsRegistered = false;

export function registerDefaultProviderPlugins(): void {
  if (defaultsRegistered) {
    return;
  }

  // Register all supported providers
  registerDeepSeekProviderPlugin();
  registerOpenAIProviderPlugin();
  registerAnthropicProviderPlugin();
  registerXAIProviderPlugin();

  defaultsRegistered = true;
}
