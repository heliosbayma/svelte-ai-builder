// Additional LLM types for better type safety
export interface ProviderResponse {
	[key: string]: unknown;
}

export interface OpenAIResponse extends ProviderResponse {
	choices?: Array<{
		message?: { content?: string };
		delta?: { content?: string };
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
}

export interface AnthropicResponse extends ProviderResponse {
	content?: Array<{
		type: string;
		text?: string;
	}>;
	delta?: { text?: string };
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
	};
}

export interface GeminiResponse extends ProviderResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
	usageMetadata?: {
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		totalTokenCount?: number;
	};
}
