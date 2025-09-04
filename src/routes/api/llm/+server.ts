import { json } from '@sveltejs/kit';
import { getErrorMessage } from '$lib/shared/utils/storage';
import type { RequestHandler } from './$types';

interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface LLMRequestBody {
	provider: 'openai' | 'anthropic' | 'gemini';
	apiKey: string;
	model: string;
	messages: LLMMessage[];
	stream: boolean;
	options?: {
		temperature?: number;
		maxTokens?: number;
	};
}

const ENDPOINTS = {
	openai: 'https://api.openai.com/v1/chat/completions',
	anthropic: 'https://api.anthropic.com/v1/messages',
	gemini: (key: string, model: string, stream: boolean) =>
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:${
			stream ? 'streamGenerateContent' : 'generateContent'
		}?key=${key}`
} as const;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const requestBody: LLMRequestBody = await request.json();
		const { provider, apiKey, model, messages, stream, options } = requestBody;

		// Build headers based on provider
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };

		switch (provider) {
			case 'openai':
				headers['Authorization'] = `Bearer ${apiKey}`;
				break;
			case 'anthropic':
				headers['x-api-key'] = apiKey;
				headers['anthropic-version'] = '2023-06-01';
				headers['anthropic-beta'] = 'max-tokens-extended-2024-07-31';
				break;
			case 'gemini':
				// Gemini uses API key in URL
				break;
		}

		// Build request body based on provider
		let body: Record<string, unknown>;
		const temperature = options?.temperature ?? 0.1;
		const maxTokens = options?.maxTokens ?? 4000;

		switch (provider) {
			case 'openai':
				body = {
					model,
					messages,
					temperature,
					max_tokens: maxTokens,
					stream
				};
				break;

			case 'anthropic': {
				const system = messages.find((m: LLMMessage) => m.role === 'system')?.content;
				const converted = messages
					.filter((m: LLMMessage) => m.role !== 'system')
					.map((m: LLMMessage) => ({
						role: m.role === 'assistant' ? 'assistant' : 'user',
						content: [{ type: 'text', text: m.content }]
					}));
				const baseBody: Record<string, unknown> = {
					model,
					system,
					messages: converted,
					temperature,
					max_tokens: Math.min(maxTokens, 4096)
				};
				if (stream) (baseBody as any).stream = true;
				body = baseBody;
				break;
			}

			case 'gemini': {
				const system = messages.find((m: LLMMessage) => m.role === 'system')?.content;
				const contents = messages
					.filter((m: LLMMessage) => m.role !== 'system')
					.map((m: LLMMessage) => ({
						role: m.role === 'assistant' ? 'model' : 'user',
						parts: [{ text: m.content }]
					}));

				body = {
					contents,
					systemInstruction: system ? { parts: [{ text: system }] } : undefined,
					generationConfig: { temperature, maxOutputTokens: maxTokens }
				};
				break;
			}

			default:
				throw new Error(`Unknown provider: ${provider}`);
		}

		// Get endpoint URL
		const url =
			provider === 'gemini'
				? ENDPOINTS.gemini(apiKey, model, stream)
				: ENDPOINTS[provider as keyof typeof ENDPOINTS];

		// Make request to LLM API
		const response = await fetch(url as string, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		// Forward response
		if (!response.ok) {
			const errorText = await response.text();
			return json({ error: errorText }, { status: response.status });
		}

		// Handle streaming responses
		if (stream && response.body) {
			return new Response(response.body, {
				headers: {
					'Content-Type': 'text/plain',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		}

		// Handle regular responses
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('LLM API Error:', error);
		return json({ error: getErrorMessage(error) }, { status: 500 });
	}
};
