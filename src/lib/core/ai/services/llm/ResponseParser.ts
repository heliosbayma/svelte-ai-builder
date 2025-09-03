import type { LLMResponse, LLMProviderType } from './types';
import type { OpenAIResponse, AnthropicResponse, GeminiResponse, ProviderResponse } from '$lib/types/llm';

export class ResponseParser {
	parseResponse(provider: LLMProviderType, data: unknown): LLMResponse {
		try {
			switch (provider) {
				case 'openai': {
					const response = data as OpenAIResponse;
					const choice = response?.choices?.[0];
					if (!choice) throw new Error('Invalid OpenAI response structure');
					return {
						content: choice.message?.content || '',
						usage: {
							promptTokens: response.usage?.prompt_tokens || 0,
							completionTokens: response.usage?.completion_tokens || 0,
							totalTokens: response.usage?.total_tokens || 0
						}
					};
				}

				case 'anthropic': {
					const response = data as AnthropicResponse;
					const content = response?.content?.[0];
					if (!content || content.type !== 'text') {
						throw new Error('Invalid Anthropic response structure');
					}
					return {
						content: content.text || '',
						usage: {
							promptTokens: response.usage?.input_tokens || 0,
							completionTokens: response.usage?.output_tokens || 0,
							totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
						}
					};
				}

				case 'gemini': {
					const response = data as GeminiResponse;
					const candidate = response?.candidates?.[0];
					const content = candidate?.content?.parts?.[0];
					if (!content) throw new Error('Invalid Gemini response structure');
					return {
						content: content.text || '',
						usage: {
							promptTokens: response.usageMetadata?.promptTokenCount || 0,
							completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
							totalTokens: response.usageMetadata?.totalTokenCount || 0
						}
					};
				}

				default:
					throw new Error(`Unsupported provider: ${provider}`);
			}
		} catch (error) {
			console.error(`Failed to parse ${provider} response:`, error, { data });
			throw new Error(`Invalid ${provider} response format`);
		}
	}

	parseStreamChunk(provider: LLMProviderType, chunk: string): string | null {
		try {
			if (!chunk.trim() || chunk.includes('[DONE]')) return null;

			const cleanChunk = chunk.replace(/^data: /, '').trim();
			if (!cleanChunk || cleanChunk === '[DONE]') return null;

			const data = JSON.parse(cleanChunk);

			switch (provider) {
				case 'openai':
					return data?.choices?.[0]?.delta?.content || null;
				case 'anthropic':
					return data?.delta?.text || null;
				case 'gemini':
					return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
				default:
					return null;
			}
		} catch {
			return null;
		}
	}

	getErrorMessage(provider: LLMProviderType, status: number, error: string): string {
		const baseMessages = {
			400: 'Invalid request format',
			401: 'API key is invalid or missing',
			403: 'Access forbidden - check your API key permissions',
			404: 'API endpoint not found',
			429: 'Rate limit exceeded - please try again later',
			500: 'Server error - please try again',
			503: 'Service temporarily unavailable'
		};

		const providerSpecific = {
			openai: { 401: 'Invalid OpenAI API key', 429: 'OpenAI rate limit exceeded' },
			anthropic: { 401: 'Invalid Anthropic API key', 429: 'Anthropic rate limit exceeded' },
			gemini: { 401: 'Invalid Gemini API key', 429: 'Gemini quota exceeded' }
		};

		return (
			providerSpecific[provider]?.[status as keyof typeof providerSpecific[typeof provider]] ||
			baseMessages[status as keyof typeof baseMessages] ||
			`API Error (${status}): ${error}`
		);
	}

	formatError(error: unknown): Error {
		if (error instanceof Error) return error;
		if (typeof error === 'string') return new Error(error);
		return new Error('Unknown error occurred');
	}
}