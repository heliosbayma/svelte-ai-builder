import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { encryptData, decryptData, hashData } from '$lib/shared/utils/crypto';

export interface ApiKeys {
	openai: string | null;
	anthropic: string | null;
	gemini: string | null;
}

export interface EncryptedApiKeys {
	openai: string | null;
	anthropic: string | null;
	gemini: string | null;
	_encrypted: boolean;
	_keyHash?: string; // Hash of master password for verification
}

const defaultKeys: ApiKeys = {
	openai: null,
	anthropic: null,
	gemini: null
};

type StorageMode = 'local' | 'session';
const MODE_KEY = 'ai-builder-api-keys:mode';
const STORAGE_KEY = 'ai-builder-api-keys-encrypted';

// Master password - could be user-provided or auto-generated per session
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

async function loadKeys(): Promise<ApiKeys> {
	if (!browser) return defaultKeys;

	try {
		const mode = readMode();
		const stored = getStorage(mode).getItem(STORAGE_KEY);
		if (!stored) return defaultKeys;

		const parsed = JSON.parse(stored) as EncryptedApiKeys;

		// If not encrypted, migrate old format
		if (!parsed._encrypted) {
			return {
				openai: parsed.openai || null,
				anthropic: parsed.anthropic || null,
				gemini: parsed.gemini || null
			};
		}

		// If encrypted but no master password, return empty keys
		if (!masterPassword) {
			return defaultKeys;
		}

		// Decrypt the keys
		const decryptedKeys: ApiKeys = { ...defaultKeys };

		for (const [provider, encryptedKey] of Object.entries(parsed)) {
			if (provider.startsWith('_') || !encryptedKey) continue;

			try {
				decryptedKeys[provider as keyof ApiKeys] = await decryptData(encryptedKey, masterPassword);
			} catch (error) {
				console.warn(`Failed to decrypt ${provider} key:`, error);
				decryptedKeys[provider as keyof ApiKeys] = null;
			}
		}

		return decryptedKeys;
	} catch (error) {
		console.warn('Failed to load encrypted API keys:', error);
		return defaultKeys;
	}
}

async function saveKeys(keys: ApiKeys): Promise<void> {
	if (!browser) return;

	const mode = readMode();
	const storage = getStorage(mode);

	// If no master password, save unencrypted (fallback)
	if (!masterPassword) {
		const unencrypted: EncryptedApiKeys = {
			...keys,
			_encrypted: false
		};
		storage.setItem(STORAGE_KEY, JSON.stringify(unencrypted));
		return;
	}

	// Encrypt the keys
	const encrypted: EncryptedApiKeys = {
		openai: null,
		anthropic: null,
		gemini: null,
		_encrypted: true,
		_keyHash: await hashData(masterPassword)
	};

	for (const [provider, key] of Object.entries(keys)) {
		if (!key) continue;

		try {
			encrypted[provider as keyof ApiKeys] = await encryptData(key, masterPassword);
		} catch (error) {
			console.warn(`Failed to encrypt ${provider} key:`, error);
		}
	}

	storage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

function createEncryptedApiKeyStore() {
	const { subscribe, set } = writable<ApiKeys>(defaultKeys);
	let mode: StorageMode = readMode();
	let initialized = false;

	// Initialize store
	const init = async () => {
		if (initialized) return;
		const keys = await loadKeys();
		set(keys);
		initialized = true;
	};

	return {
		subscribe,

		// Initialize with master password
		async setMasterPassword(password: string) {
			masterPassword = password;
			await init();
		},

		// Generate and use a session-based master password
		async useSessionPassword() {
			if (!browser) return;

			// Try to get existing session password
			let sessionPassword = sessionStorage.getItem('ai-builder-master-password');

			if (!sessionPassword) {
				// Generate new session password
				sessionPassword = crypto.randomUUID() + crypto.randomUUID();
				sessionStorage.setItem('ai-builder-master-password', sessionPassword);
			}

			masterPassword = sessionPassword;
			await init();
		},

		async set(keys: ApiKeys) {
			await saveKeys(keys);
			set(keys);
		},

		async update(updater: (keys: ApiKeys) => ApiKeys) {
			const current = await loadKeys();
			const newKeys = updater(current);
			await saveKeys(newKeys);
			set(newKeys);
		},

		clear: () => {
			if (browser) {
				try {
					localStorage.removeItem(STORAGE_KEY);
					sessionStorage.removeItem(STORAGE_KEY);
					sessionStorage.removeItem('ai-builder-master-password');
				} catch {
					/* ignore */
				}
			}
			masterPassword = null;
			set(defaultKeys);
		},

		getStorageMode: (): StorageMode => mode,

		async setStorageMode(next: StorageMode) {
			if (!browser) return;
			const current = await loadKeys();
			mode = next;
			writeMode(next);
			try {
				await saveKeys(current);
				const other = mode === 'session' ? localStorage : sessionStorage;
				other.removeItem(STORAGE_KEY);
			} catch {
				/* ignore */
			}
			set(current);
		},

		// Check if encryption is active
		hasEncryption: () => !!masterPassword,

		// Get key hash for verification (without exposing master password)
		getMasterPasswordHash: async () => {
			if (!masterPassword) return null;
			return hashData(masterPassword);
		}
	};
}

export const encryptedApiKeyStore = createEncryptedApiKeyStore();

export function hasAnyApiKey(keys: ApiKeys): boolean {
	return !!(keys.openai || keys.anthropic || keys.gemini);
}

// Re-export validation functions from shared utilities
export { validateApiKey, getKeyErrorMessage } from '$lib/shared/utils/validation';
