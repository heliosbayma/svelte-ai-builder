export interface LLMMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
}

export interface LLMResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

export interface LLMStreamResponse {
	delta: string;
	accumulated: string;
	done: boolean;
}

export type LLMProviderType = 'openai' | 'anthropic' | 'gemini';

export interface LLMOptions {
	provider: LLMProviderType;
	apiKey: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
	signal?: AbortSignal;
	onStream?: (response: LLMStreamResponse) => void;
	purpose?: 'generate' | 'plan' | 'build' | 'repair' | 'other';
}
