import type { LLMMessage, LLMResponse, LLMOptions, LLMProviderType } from './types';
import {
	SYSTEM_PROMPT,
	DESIGNER_PROMPT,
	createComponentPrompt,
	createRepairPrompt,
	createRepairPromptDiff,
	PLAN_PROMPT,
	createBuildFromPlanPrompt
} from './prompts';
import { telemetryStore } from '$lib/core/stores/telemetry';
import { ResponseParser } from './ResponseParser';
import { StreamHandler } from './StreamHandler';

// Use internal API route to avoid CORS issues
const API_ENDPOINT = '/api/llm';

const DEFAULT_MODELS = {
	openai: 'gpt-4o-mini',
	anthropic: 'claude-3-5-sonnet-20241022',
	gemini: 'gemini-1.5-pro-latest'
} as const;

export class LLMClient {
	private responseParser = new ResponseParser();
	private streamHandler = new StreamHandler();
	async generateComponent(
		prompt: string,
		options: LLMOptions,
		previousCode?: string
	): Promise<LLMResponse> {
		// Apply research finding: model-specific system prompts
		const modelSpecificPrompt = this.getModelSpecificPrompt(prompt);
		const userPrompt = createComponentPrompt(prompt, previousCode);

		const messages: LLMMessage[] = [
			{ role: 'system', content: modelSpecificPrompt },
			{ role: 'user', content: userPrompt }
		];

		if (options.onStream) {
			return this.streamHandler.handleStreamResponse(
				messages,
				options,
				this.makeRequest.bind(this)
			);
		}
		return this.chat(messages, { ...options, purpose: options.purpose || 'generate' });
	}

	// Plan step: get minimal JSON plan
	async planPage(prompt: string, options: LLMOptions): Promise<LLMResponse> {
		const messages: LLMMessage[] = [
			{ role: 'system', content: PLAN_PROMPT },
			{ role: 'user', content: prompt }
		];
		return this.chat(messages, { ...options, purpose: 'plan' });
	}

	// Build step: produce full page from plan JSON
	async buildPageFromPlan(planJson: string, options: LLMOptions): Promise<LLMResponse> {
		const messages: LLMMessage[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: createBuildFromPlanPrompt(planJson) }
		];
		return this.chat(messages, { ...options, purpose: 'build' });
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
			const parsed = this.responseParser.parseResponse(provider, data);
			const t1 = performance.now();
			console.info('LLM telemetry', {
				provider,
				model,
				ms: Math.round(t1 - t0),
				usage: parsed.usage
			});
			telemetryStore.add({
				provider,
				model,
				ms: Math.round(t1 - t0),
				ok: true,
				purpose: options.purpose || 'other',
				usage: parsed.usage
			});
			return parsed;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request cancelled');
			}
			const formatted = this.responseParser.formatError(error);
			telemetryStore.add({
				provider,
				model,
				ms: 0,
				ok: false,
				purpose: options.purpose || 'other',
				errorMessage: formatted.message
			});
			throw formatted;
		}
	}

	private getModelSpecificPrompt(userPromptText?: string): string {
		const t = (userPromptText || '').toLowerCase();
		if (/\b(minimal|agency|neutral|clean|linear|stripe|vercel|apple)\b/.test(t)) {
			return DESIGNER_PROMPT;
		}
		return SYSTEM_PROMPT;
	}

	// One-shot repair helper
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
		const t0 = performance.now();
		const response = await this.makeRequest(
			provider,
			apiKey,
			model,
			messages,
			false,
			options?.signal
		);
		const data = await response.json();
		const parsed = this.responseParser.parseResponse(provider, data);
		const t1 = performance.now();
		telemetryStore.add({
			provider,
			model,
			ms: Math.round(t1 - t0),
			ok: true,
			purpose: 'repair',
			usage: parsed.usage
		});
		return parsed;
	}

	// Second-pass repair with diff-guided minimal edits
	async repairComponentWithDiff(
		provider: LLMProviderType,
		apiKey: string,
		originalRequest: string,
		brokenCode: string,
		previousAttempt: string,
		compilerError: string,
		diffSummary: string,
		options?: { model?: string; signal?: AbortSignal }
	): Promise<LLMResponse> {
		const model = options?.model || DEFAULT_MODELS[provider];
		const messages: LLMMessage[] = [
			{ role: 'system', content: SYSTEM_PROMPT },
			{
				role: 'user',
				content: createRepairPromptDiff(
					originalRequest,
					brokenCode,
					previousAttempt,
					compilerError,
					diffSummary
				)
			}
		];
		const t0 = performance.now();
		const response = await this.makeRequest(
			provider,
			apiKey,
			model,
			messages,
			false,
			options?.signal
		);
		const data = await response.json();
		const parsed = this.responseParser.parseResponse(provider, data);
		const t1 = performance.now();
		telemetryStore.add({
			provider,
			model,
			ms: Math.round(t1 - t0),
			ok: true,
			purpose: 'repair',
			usage: parsed.usage
		});
		return parsed;
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
		const body = { provider, apiKey, model, messages, stream, options };

		const response = await fetch(API_ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const error = await response.text();
			const errorMessage = this.responseParser.getErrorMessage(provider, response.status, error);
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
}

// Export singleton instance
export const llmClient = new LLMClient();
