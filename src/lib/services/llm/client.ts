import type { LLMMessage, LLMResponse, LLMOptions, LLMProviderType } from './types';
import { SYSTEM_PROMPT } from './prompts';

const ENDPOINTS = {
	openai: 'https://api.openai.com/v1/chat/completions',
	anthropic: 'https://api.anthropic.com/v1/messages',
	gemini: (key: string, model: string) =>
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}`
} as const;

const DEFAULT_MODELS = {
	openai: 'gpt-4-turbo-preview',
	anthropic: 'claude-3-5-sonnet-20241022',
	gemini: 'gemini-1.5-pro-latest'
} as const;

export class LLMClient {
	async generateComponent(
		prompt: string,
		options: LLMOptions,
		previousCode?: string
	): Promise<LLMResponse> {
		const messages: LLMMessage[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{
				role: 'user',
				content: previousCode
					? `Modify this component: ${previousCode}\n\nUser request: ${prompt}`
					: prompt
			}
		];

		if (options.onStream) {
			return this.streamChat(messages, options);
		}
		return this.chat(messages, options);
	}

	private async chat(messages: LLMMessage[], options: LLMOptions): Promise<LLMResponse> {
		const { provider, apiKey, signal } = options;
		const model = options.model || DEFAULT_MODELS[provider];

		try {
			const response = await this.makeRequest(provider, apiKey, model, messages, false, signal, options);
			const data = await response.json();
			return this.parseResponse(provider, data);
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request cancelled');
			}
			throw this.formatError(error);
		}
	}

	private async streamChat(
		messages: LLMMessage[],
		options: LLMOptions
	): Promise<LLMResponse> {
		const { provider, apiKey, signal, onStream } = options;
		const model = options.model || DEFAULT_MODELS[provider];

		try {
			const response = await this.makeRequest(provider, apiKey, model, messages, true, signal, options);

			if (!response.body) throw new Error('No response body');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let accumulated = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const delta = this.parseStreamChunk(provider, chunk);

				if (delta) {
					accumulated += delta;
					onStream?.({
						delta,
						accumulated,
						done: false
					});
				}
			}

			onStream?.({
				delta: '',
				accumulated,
				done: true
			});

			return { content: accumulated };
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request cancelled');
			}
			throw this.formatError(error);
		}
	}

	private async makeRequest(
		provider: LLMProviderType,
		apiKey: string,
		model: string,
		messages: LLMMessage[],
		stream: boolean,
		signal?: AbortSignal,
		options?: { temperature?: number; maxTokens?: number }
	): Promise<Response> {
		const headers = this.getHeaders(provider, apiKey);
		const body = this.buildRequestBody(provider, model, messages, stream, options);
		const url = this.getEndpoint(provider, apiKey, model);

		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(this.getErrorMessage(provider, response.status, error));
		}

		return response;
	}

	private getHeaders(provider: LLMProviderType, apiKey: string): HeadersInit {
		const common = { 'Content-Type': 'application/json' };

		switch (provider) {
			case 'openai':
				return { ...common, 'Authorization': `Bearer ${apiKey}` };
			case 'anthropic':
				return { ...common, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
			case 'gemini':
				return common;
			default: {
				const _exhaustive: never = provider;
				throw new Error(`Unknown provider: ${_exhaustive}`);
			}
		}
	}

	private getEndpoint(provider: LLMProviderType, apiKey: string, model: string): string {
		if (provider === 'gemini') {
			return ENDPOINTS.gemini(apiKey, model);
		}
		return ENDPOINTS[provider];
	}

	private buildRequestBody(
		provider: LLMProviderType,
		model: string,
		messages: LLMMessage[],
		stream: boolean,
		options?: { temperature?: number; maxTokens?: number }
	): Record<string, unknown> {
		const temperature = options?.temperature ?? 0.1;
		const maxTokens = options?.maxTokens ?? 4000;

		switch (provider) {
			case 'openai':
				return {
					model,
					messages,
					temperature,
					max_tokens: maxTokens,
					stream
				};

			case 'anthropic': {
				const system = messages.find(m => m.role === 'system')?.content;
				const userMessages = messages.filter(m => m.role !== 'system');
				return {
					model,
					system,
					messages: userMessages,
					temperature,
					max_tokens: maxTokens,
					stream
				};
			}

			case 'gemini': {
				const system = messages.find(m => m.role === 'system')?.content;
				const contents = messages
					.filter(m => m.role !== 'system')
					.map(m => ({
						role: m.role === 'assistant' ? 'model' : 'user',
						parts: [{ text: m.content }]
					}));

				return {
					contents,
					systemInstruction: system ? { parts: [{ text: system }] } : undefined,
					generationConfig: { temperature, maxOutputTokens: maxTokens }
				};
			}
			default: {
				const _exhaustive: never = provider;
				throw new Error(`Unknown provider: ${_exhaustive}`);
			}
		}
	}

	private parseResponse(provider: LLMProviderType, data: unknown): LLMResponse {
		// Type assertion is safe here as we control the API response parsing
		const response = data as {
			[key: string]: unknown;
			choices?: Array<{ message?: { content?: string } }>;
			content?: Array<{ text?: string }>;
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
			usage?: Record<string, number>;
			usageMetadata?: Record<string, number>;
		};
		
		switch (provider) {
			case 'openai':
				return {
					content: response.choices?.[0]?.message?.content || '',
					usage: response.usage ? {
						promptTokens: response.usage.prompt_tokens,
						completionTokens: response.usage.completion_tokens,
						totalTokens: response.usage.total_tokens
					} : undefined
				};

			case 'anthropic':
				return {
					content: response.content?.[0]?.text || '',
					usage: response.usage ? {
						promptTokens: response.usage.input_tokens,
						completionTokens: response.usage.output_tokens,
						totalTokens: response.usage.input_tokens + response.usage.output_tokens
					} : undefined
				};

			case 'gemini':
				return {
					content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
					usage: response.usageMetadata ? {
						promptTokens: response.usageMetadata.promptTokenCount,
						completionTokens: response.usageMetadata.candidatesTokenCount,
						totalTokens: response.usageMetadata.totalTokenCount
					} : undefined
				};
			default: {
				const _exhaustive: never = provider;
				throw new Error(`Unknown provider: ${_exhaustive}`);
			}
		}
	}

	private parseStreamChunk(provider: LLMProviderType, chunk: string): string | null {
		// Simple SSE parsing - this is MVP, not handling all edge cases
		const lines = chunk.split('\n');

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const data = line.slice(6);
				if (data === '[DONE]') return null;

				try {
					const json = JSON.parse(data);

					switch (provider) {
						case 'openai':
							return json.choices?.[0]?.delta?.content || '';
						case 'anthropic':
							return json.delta?.text || '';
						case 'gemini':
							return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
					}
				} catch {
					// Invalid JSON, skip
				}
			}
		}

		return null;
	}

	private getErrorMessage(provider: LLMProviderType, status: number, error: string): string {
		if (status === 401) return `Invalid ${provider} API key`;
		if (status === 429) return 'Rate limited - please wait a moment and try again';
		if (status === 403) return `Access denied - check your ${provider} API key permissions`;
		if (status >= 500) return `${provider} service is temporarily unavailable`;

		try {
			const parsed = JSON.parse(error);
			return parsed.error?.message || parsed.message || 'Request failed';
		} catch {
			return 'Request failed';
		}
	}

	private formatError(error: unknown): Error {
		if (error instanceof Error) return error;
		return new Error(String(error));
	}
}

export const llmClient = new LLMClient();