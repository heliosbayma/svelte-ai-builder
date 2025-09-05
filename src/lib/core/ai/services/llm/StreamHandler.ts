import type { LLMOptions, LLMMessage, LLMResponse, LLMProviderType } from './types';
import { ResponseParser } from './ResponseParser';

export class StreamHandler {
	private responseParser = new ResponseParser();

	async handleStreamResponse(
		messages: LLMMessage[],
		options: LLMOptions,
		makeRequest: (
			provider: LLMProviderType,
			apiKey: string,
			model: string,
			messages: LLMMessage[],
			stream: boolean,
			signal?: AbortSignal
		) => Promise<Response>
	): Promise<LLMResponse> {
		const response = await makeRequest(
			options.provider,
			options.apiKey,
			options.model || 'default',
			messages,
			true,
			options.signal
		);

		if (!response.ok) {
			const errorText = await response.text();
			const errorMessage = this.responseParser.getErrorMessage(
				options.provider,
				response.status,
				errorText
			);
			throw new Error(errorMessage);
		}

		if (!response.body) {
			throw new Error('No response body for streaming');
		}

		let fullContent = '';
		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n').filter((line) => line.trim());

				for (const line of lines) {
					const content = this.responseParser.parseStreamChunk(options.provider, line);
					if (content) {
						fullContent += content;
						if (options.onStream) {
							options.onStream({
								delta: content,
								accumulated: fullContent,
								done: false
							});
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		// Final done signal
		if (options.onStream) {
			options.onStream({
				delta: '',
				accumulated: fullContent,
				done: true
			});
		}

		return {
			content: fullContent,
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
		};
	}
}
