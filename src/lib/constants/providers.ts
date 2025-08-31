export const LLM_PROVIDERS = [
	{
		key: 'openai' as const,
		label: 'OpenAI',
		placeholder: 'sk-...',
		hint: 'platform.openai.com/api-keys',
		validatePrefix: 'sk-',
		minLength: 20
	},
	{
		key: 'anthropic' as const,
		label: 'Anthropic Claude',
		placeholder: 'sk-ant-...',
		hint: 'console.anthropic.com',
		validatePrefix: 'sk-ant-',
		minLength: 20
	},
	{
		key: 'gemini' as const,
		label: 'Google Gemini',
		placeholder: 'AIza...',
		hint: 'makersuite.google.com',
		validatePrefix: 'AIza',
		minLength: 20
	}
] as const;

export type ProviderKey = typeof LLM_PROVIDERS[number]['key'];