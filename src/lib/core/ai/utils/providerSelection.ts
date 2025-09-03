import type { ApiKeys } from '$lib/core/stores/apiKeys';
import type { LLMProviderType } from '$lib/core/ai/services/llm/types';

/**
 * Selects the best available LLM provider based on availability and preference.
 * Priority: last used provider (if available) → OpenAI → Anthropic → Gemini → first available
 */
export function selectBestProvider(
	apiKeys: ApiKeys,
	lastProvider?: string
): LLMProviderType | null {
	const availableProviders = (Object.keys(apiKeys) as Array<keyof ApiKeys>).filter(
		(provider) => apiKeys[provider] !== null
	);

	if (availableProviders.length === 0) {
		return null;
	}

	// Prefer last used provider if it's available
	if (lastProvider && (availableProviders as string[]).includes(lastProvider)) {
		return lastProvider as LLMProviderType;
	}

	// Priority order: openai → anthropic → gemini → first available
	for (const provider of ['openai', 'anthropic', 'gemini'] as const) {
		if (availableProviders.includes(provider)) {
			return provider;
		}
	}

	return availableProviders[0] as LLMProviderType;
}
