import type { LLMResponse, LLMProviderType } from './types';
import type {
	OpenAIResponse,
	AnthropicResponse,
	GeminiResponse,
	ProviderResponse
} from '$lib/types/llm';

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
							totalTokens:
								(response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
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
		// Try to parse structured error information (handles nested JSON-as-string cases)
		let parsed: any = null;
		try {
			const outer = JSON.parse(error);
			if (outer && typeof outer.error === 'string') {
				try {
					parsed = JSON.parse(outer.error);
				} catch {
					parsed = outer;
				}
			} else {
				parsed = outer;
			}
		} catch {
			// ignore parse errors; fall back to generic mapping
		}

		// Provider-aware special cases
		const providerSpecificParsed = (() => {
			try {
				const code = parsed?.error?.code || parsed?.code || '';
				const message: string = parsed?.error?.message || parsed?.message || '';
				if (provider === 'openai') {
					if (code === 'model_not_found' || /model(.+)?not found/i.test(message)) {
						return 'Model not found or unavailable. Try a different OpenAI model.';
					}
				}
				if (provider === 'anthropic') {
					if (/Overloaded|Please try again/.test(message)) {
						return 'Anthropic is overloaded. Please try again in a moment.';
					}
				}
				if (provider === 'gemini') {
					if (/quota|exceeded/i.test(message)) {
						return 'Gemini quota exceeded. Check your Google AI Studio limits.';
					}
				}
				return '';
			} catch {
				return '';
			}
		})();
		if (providerSpecificParsed) return providerSpecificParsed;

		const baseMessages = {
			400: 'Invalid request format',
			401: 'API key is invalid or missing',
			403: 'Access forbidden - check your API key permissions',
			404: 'Not found',
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
			providerSpecific[provider]?.[status as keyof (typeof providerSpecific)[typeof provider]] ||
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
