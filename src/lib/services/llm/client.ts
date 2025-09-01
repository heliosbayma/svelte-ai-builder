import type { LLMMessage, LLMResponse, LLMOptions, LLMProviderType } from './types';
import {
	SYSTEM_PROMPT,
	createComponentPrompt,
	createRepairPrompt,
	PLAN_PROMPT,
	createBuildFromPlanPrompt
} from './prompts';

// Use internal API route to avoid CORS issues
const API_ENDPOINT = '/api/llm';

const DEFAULT_MODELS = {
	openai: 'gpt-4o-mini',
	anthropic: 'claude-3-5-sonnet-20241022',
	gemini: 'gemini-1.5-pro-latest'
} as const;

export class LLMClient {
	async generateComponent(
		prompt: string,
		options: LLMOptions,
		previousCode?: string
	): Promise<LLMResponse> {
		// Apply research finding: model-specific system prompts
		const modelSpecificPrompt = this.getModelSpecificPrompt();
		const userPrompt = createComponentPrompt(prompt, previousCode);

		const messages: LLMMessage[] = [
			{ role: 'system', content: modelSpecificPrompt },
			{ role: 'user', content: userPrompt }
		];

		if (options.onStream) {
			return this.streamChat(messages, options);
		}
		return this.chat(messages, options);
	}

	// Plan step: get minimal JSON plan
	async planPage(prompt: string, options: LLMOptions): Promise<LLMResponse> {
		const messages: LLMMessage[] = [
			{ role: 'system', content: PLAN_PROMPT },
			{ role: 'user', content: prompt }
		];
		return this.chat(messages, options);
	}

	// Build step: produce full page from plan JSON
	async buildPageFromPlan(planJson: string, options: LLMOptions): Promise<LLMResponse> {
		const messages: LLMMessage[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: createBuildFromPlanPrompt(planJson) }
		];
		return this.chat(messages, options);
	}

	private async chat(messages: LLMMessage[], options: LLMOptions): Promise<LLMResponse> {
		const { provider, apiKey, signal } = options;
		const model = options.model || DEFAULT_MODELS[provider];

		try {
			const t0 = performance.now();
			const response = await this.makeRequest(
				provider,
				apiKey,
				model,
				messages,
				false,
				signal,
				options
			);
			const data = await response.json();
			const parsed = this.parseResponse(provider, data);
			const t1 = performance.now();
			console.info('LLM telemetry', {
				provider,
				model,
				ms: Math.round(t1 - t0),
				usage: parsed.usage
			});
			return parsed;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request cancelled');
			}
			throw this.formatError(error);
		}
	}

	// One-shot repair helper consumers can call: given a prompt, broken code and compiler error, ask the model to fix
	async repairComponent(
		provider: LLMProviderType,
		apiKey: string,
		originalRequest: string,
		brokenCode: string,
		compilerError: string,
		options?: { model?: string; signal?: AbortSignal }
	): Promise<LLMResponse> {
		const model = options?.model || DEFAULT_MODELS[provider];
		const messages: LLMMessage[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: createRepairPrompt(originalRequest, brokenCode, compilerError) }
		];
		const response = await this.makeRequest(
			provider,
			apiKey,
			model,
			messages,
			false,
			options?.signal
		);
		const data = await response.json();
		return this.parseResponse(provider, data);
	}

	private async streamChat(messages: LLMMessage[], options: LLMOptions): Promise<LLMResponse> {
		const { provider, apiKey, signal, onStream } = options;
		const model = options.model || DEFAULT_MODELS[provider];

		try {
			const response = await this.makeRequest(
				provider,
				apiKey,
				model,
				messages,
				true,
				signal,
				options
			);

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
		const body = {
			provider,
			apiKey,
			model,
			messages,
			stream,
			options
		};

		const response = await fetch(API_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const error = await response.text();
			const errorMessage = this.getErrorMessage(provider, response.status, error);
			console.error(`LLM API Error (${provider}):`, {
				status: response.status,
				statusText: response.statusText,
				url: response.url,
				headers: Object.fromEntries(response.headers.entries()),
				body: error,
				errorMessage
			});
			throw new Error(errorMessage);
		}

		return response;
	}

	// TODO: Add model-specific system prompts or remove this altogether
	private getModelSpecificPrompt(): string {
		return SYSTEM_PROMPT;
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
					usage: response.usage
						? {
								promptTokens: response.usage.prompt_tokens,
								completionTokens: response.usage.completion_tokens,
								totalTokens: response.usage.total_tokens
							}
						: undefined
				};

			case 'anthropic':
				return {
					content: response.content?.[0]?.text || '',
					usage: response.usage
						? {
								promptTokens: response.usage.input_tokens,
								completionTokens: response.usage.output_tokens,
								totalTokens: response.usage.input_tokens + response.usage.output_tokens
							}
						: undefined
				};

			case 'gemini':
				return {
					content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
					usage: response.usageMetadata
						? {
								promptTokens: response.usageMetadata.promptTokenCount,
								completionTokens: response.usageMetadata.candidatesTokenCount,
								totalTokens: response.usageMetadata.totalTokenCount
							}
						: undefined
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
