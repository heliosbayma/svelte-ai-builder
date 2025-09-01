import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ApiKeys {
	openai: string | null;
	anthropic: string | null;
	gemini: string | null;
}

const defaultKeys: ApiKeys = {
	openai: null,
	anthropic: null,
	gemini: null
};

function loadKeys(): ApiKeys {
	if (!browser) return defaultKeys;

	try {
		const stored = localStorage.getItem('ai-builder-api-keys');
		if (!stored) return defaultKeys;

		const parsed = JSON.parse(stored);
		return {
			openai: parsed.openai || null,
			anthropic: parsed.anthropic || null,
			gemini: parsed.gemini || null
		};
	} catch {
		return defaultKeys;
	}
}

function createApiKeyStore() {
	const { subscribe, set, update } = writable<ApiKeys>(loadKeys());

	return {
		subscribe,
		set: (keys: ApiKeys) => {
			if (browser) {
				localStorage.setItem('ai-builder-api-keys', JSON.stringify(keys));
			}
			set(keys);
		},
		update: (updater: (keys: ApiKeys) => ApiKeys) => {
			update((keys) => {
				const newKeys = updater(keys);
				if (browser) {
					localStorage.setItem('ai-builder-api-keys', JSON.stringify(newKeys));
				}
				return newKeys;
			});
		},
		clear: () => {
			if (browser) {
				localStorage.removeItem('ai-builder-api-keys');
			}
			set(defaultKeys);
		}
	};
}

export const apiKeyStore = createApiKeyStore();

export function hasAnyApiKey(keys: ApiKeys): boolean {
	return !!(keys.openai || keys.anthropic || keys.gemini);
}

export function validateApiKey(provider: keyof ApiKeys, key: string): boolean {
	if (!key?.trim()) return false;

	const prefixes = {
		openai: 'sk-',
		anthropic: 'sk-ant-',
		gemini: 'AIza'
	};

	return key.startsWith(prefixes[provider]) && key.length > 20;
}

export function getKeyErrorMessage(provider: keyof ApiKeys): string {
	const formats = {
		openai: 'sk-...',
		anthropic: 'sk-ant-...',
		gemini: 'AIza...'
	};

	return `Invalid format (expected: ${formats[provider]})`;
}
