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

type StorageMode = 'local' | 'session';
const MODE_KEY = 'ai-builder-api-keys:mode';

function readMode(): StorageMode {
	if (!browser) return 'local';
	const m = localStorage.getItem(MODE_KEY);
	return m === 'session' ? 'session' : 'local';
}

function writeMode(mode: StorageMode) {
	if (!browser) return;
	localStorage.setItem(MODE_KEY, mode);
}

function getStorage(mode: StorageMode) {
	return mode === 'session' ? sessionStorage : localStorage;
}

function loadKeys(): ApiKeys {
	if (!browser) return defaultKeys;

	try {
		const mode = readMode();
		const stored = getStorage(mode).getItem('ai-builder-api-keys');
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
	let mode: StorageMode = readMode();

	return {
		subscribe,
		set: (keys: ApiKeys) => {
			if (browser) {
				getStorage(mode).setItem('ai-builder-api-keys', JSON.stringify(keys));
			}
			set(keys);
		},
		update: (updater: (keys: ApiKeys) => ApiKeys) => {
			update((keys) => {
				const newKeys = updater(keys);
				if (browser) {
					getStorage(mode).setItem('ai-builder-api-keys', JSON.stringify(newKeys));
				}
				return newKeys;
			});
		},
		clear: () => {
			if (browser) {
				try {
					localStorage.removeItem('ai-builder-api-keys');
				} catch {
					/* ignore */
				}
				try {
					sessionStorage.removeItem('ai-builder-api-keys');
				} catch {
					/* ignore */
				}
			}
			set(defaultKeys);
		},
		getStorageMode: (): StorageMode => mode,
		setStorageMode: (next: StorageMode) => {
			if (!browser) return;
			const current = loadKeys();
			mode = next;
			writeMode(next);
			try {
				getStorage(mode).setItem('ai-builder-api-keys', JSON.stringify(current));
				const other = mode === 'session' ? localStorage : sessionStorage;
				other.removeItem('ai-builder-api-keys');
			} catch {
				/* ignore */
			}
			set(current);
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
