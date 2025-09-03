import type { LLMProviderType } from '$lib/core/ai/services/llm/types';

export function isLLMProvider(value: unknown): value is LLMProviderType {
	return value === 'openai' || value === 'anthropic' || value === 'gemini';
}

export function coerceProvider(
	value: unknown,
	fallback: LLMProviderType = 'openai'
): LLMProviderType {
	return isLLMProvider(value) ? value : fallback;
}

export function estimateJsonSize(data: unknown): number {
	try {
		return JSON.stringify(data).length;
	} catch {
		return Infinity;
	}
}
