import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { encryptData, decryptData } from '$lib/shared/utils/crypto';
import { warning as toastWarning } from '$lib/core/stores/toast';

export interface ApiKeys {
	openai: string | null;
	anthropic: string | null;
	gemini: string | null;
}

export const apiKeysReady = writable(false);

interface EncryptedApiKeys {
	openai: string | null;
	anthropic: string | null;
	gemini: string | null;
	_encrypted: boolean;
}

const defaultKeys: ApiKeys = {
	openai: null,
	anthropic: null,
	gemini: null
};

type StorageMode = 'local' | 'session';
const MODE_KEY = 'ai-builder-api-keys:mode';
const STORAGE_KEY = 'ai-builder-api-keys-encrypted';

let masterPassword: string | null = null;

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

function initMasterPassword() {
	if (!browser || masterPassword) return;

	let sessionPassword = sessionStorage.getItem('ai-builder-master-password');

	if (!sessionPassword) {
		sessionPassword = crypto.randomUUID() + crypto.randomUUID();
		sessionStorage.setItem('ai-builder-master-password', sessionPassword);
	}

	masterPassword = sessionPassword;
}

async function loadKeys(): Promise<ApiKeys> {
	if (!browser) return defaultKeys;

	initMasterPassword();

	try {
		const mode = readMode();
		const stored = getStorage(mode).getItem(STORAGE_KEY);

		// Migration: check for old unencrypted storage
		if (!stored) {
			const oldStored = getStorage(mode).getItem('ai-builder-api-keys');
			if (oldStored) {
				const parsed = JSON.parse(oldStored);
				const migratedKeys = {
					openai: parsed.openai || null,
					anthropic: parsed.anthropic || null,
					gemini: parsed.gemini || null
				};
				// Save encrypted and remove old
				await saveKeys(migratedKeys, mode);
				getStorage(mode).removeItem('ai-builder-api-keys');
				return migratedKeys;
			}
			return defaultKeys;
		}

		const parsed = JSON.parse(stored) as EncryptedApiKeys;

		// If not encrypted, return as-is (fallback)
		if (!parsed._encrypted) {
			return {
				openai: parsed.openai || null,
				anthropic: parsed.anthropic || null,
				gemini: parsed.gemini || null
			};
		}

		// Decrypt the keys
		const decryptedKeys: ApiKeys = { ...defaultKeys };

		for (const [provider, encryptedKey] of Object.entries(parsed)) {
			if (provider.startsWith('_') || !encryptedKey || !masterPassword) continue;

			try {
				decryptedKeys[provider as keyof ApiKeys] = await decryptData(encryptedKey, masterPassword);
			} catch {
				console.warn(`Failed to decrypt ${provider} key`);
				toastWarning(`Failed to decrypt saved ${provider} API key. Please re-enter it.`, {
					title: 'Decryption Failed'
				});
				decryptedKeys[provider as keyof ApiKeys] = null;
			}
		}

		return decryptedKeys;
	} catch (error) {
		console.warn('Failed to load API keys:', error);
		toastWarning('Unable to load saved API keys. Please re-configure them in Settings.', {
			title: 'Storage Error'
		});
		return defaultKeys;
	}
}

async function saveKeys(keys: ApiKeys, mode?: StorageMode): Promise<void> {
	if (!browser || !masterPassword) return;

	const storageMode = mode || readMode();
	const storage = getStorage(storageMode);

	// Encrypt the keys
	const encrypted: EncryptedApiKeys = {
		openai: null,
		anthropic: null,
		gemini: null,
		_encrypted: true
	};

	for (const [provider, key] of Object.entries(keys)) {
		if (!key) continue;

		try {
			encrypted[provider as keyof ApiKeys] = await encryptData(key, masterPassword);
		} catch (error) {
			console.warn(`Failed to encrypt ${provider} key:`, error);
			toastWarning(`Unable to save ${provider} API key. Storage may be unavailable.`, {
				title: 'Save Failed'
			});
		}
	}

	storage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

function createApiKeyStore() {
	const { subscribe, set } = writable<ApiKeys>(defaultKeys);
	let mode: StorageMode = readMode();
	let initialized = false;

	// Initialize store
	const init = async () => {
		if (initialized) return;
		const keys = await loadKeys();
		set(keys);
		initialized = true;
		apiKeysReady.set(true);
	};

	// Auto-initialize on first access
	if (browser) {
		init();
	}

	return {
		subscribe,
		set: async (keys: ApiKeys) => {
			await saveKeys(keys);
			set(keys);
		},
		update: async (updater: (keys: ApiKeys) => ApiKeys) => {
			const currentKeys = await loadKeys();
			const newKeys = updater(currentKeys);
			await saveKeys(newKeys);
			set(newKeys);
		},
		clear: () => {
			if (browser) {
				try {
					localStorage.removeItem(STORAGE_KEY);
					localStorage.removeItem('ai-builder-api-keys'); // Old storage
					sessionStorage.removeItem(STORAGE_KEY);
					sessionStorage.removeItem('ai-builder-api-keys'); // Old storage
					sessionStorage.removeItem('ai-builder-master-password');
				} catch {
					/* ignore */
				}
			}
			masterPassword = null;
			set(defaultKeys);
			apiKeysReady.set(true);
		},
		getStorageMode: (): StorageMode => mode,
		setStorageMode: async (next: StorageMode) => {
			if (!browser) return;
			const current = await loadKeys();
			mode = next;
			writeMode(next);
			try {
				await saveKeys(current, next);
				const other = mode === 'session' ? localStorage : sessionStorage;
				other.removeItem(STORAGE_KEY);
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

// Re-export validation functions from shared utilities
export { validateApiKey, getKeyErrorMessage } from '$lib/shared/utils/validation';
