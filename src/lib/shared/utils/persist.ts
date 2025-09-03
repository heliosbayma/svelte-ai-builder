import { browser } from '$app/environment';

export const PERSIST_VERSION = 1;
export const PERSIST_KEYS = {
	history: (v: number = PERSIST_VERSION) => `ai-builder:history:v${v}`,
	chat: (v: number = PERSIST_VERSION) => `ai-builder:chat:v${v}`,
	ui: (v: number = PERSIST_VERSION) => `ai-builder:ui:v${v}`
} as const;

export function allPersistKeys(version: number = PERSIST_VERSION): string[] {
	return [PERSIST_KEYS.history(version), PERSIST_KEYS.chat(version), PERSIST_KEYS.ui(version)];
}

export interface PersistConfig<T> {
	key: 'history' | 'chat' | 'ui' | string;
	version: number;
	serialize?: (data: T) => unknown;
	deserialize?: (raw: unknown) => T | null;
	throttleMs?: number;
	debounceMs?: number;
}

export function createPersistor<T>(config: PersistConfig<T>) {
	let lastWrite = 0;
	const { key, version, serialize, deserialize, throttleMs = 400, debounceMs = 0 } = config;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingData: T | null = null;

	function namespaced() {
		// Use centralized keys when available
		if (key === 'history') return PERSIST_KEYS.history(version);
		if (key === 'chat') return PERSIST_KEYS.chat(version);
		if (key === 'ui') return PERSIST_KEYS.ui(version);
		return `ai-builder:${key}:v${version}`;
	}

	function doSave(data: T) {
		if (!browser) return;
		const now = Date.now();
		if (now - lastWrite < throttleMs) return;
		lastWrite = now;
		try {
			const payload = serialize ? serialize(data) : data;
			localStorage.setItem(namespaced(), JSON.stringify(payload));
		} catch (err) {
			if (import.meta.env.DEV) console.debug('persist/save failed', err);
		}
	}

	function save(data: T) {
		if (debounceMs > 0) {
			pendingData = data;
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				if (pendingData != null) doSave(pendingData);
				pendingData = null;
				debounceTimer = null;
			}, debounceMs);
			return;
		}
		doSave(data);
	}

	function load(defaultValue: T): T {
		if (!browser) return defaultValue;
		try {
			const raw = localStorage.getItem(namespaced());
			if (!raw) return defaultValue;
			const parsed = JSON.parse(raw);
			if (deserialize) {
				return deserialize(parsed) ?? defaultValue;
			}
			return parsed as T;
		} catch (err) {
			if (import.meta.env.DEV) console.debug('persist/load failed', err);
			return defaultValue;
		}
	}

	function clear() {
		if (!browser) return;
		try {
			localStorage.removeItem(namespaced());
		} catch (err) {
			if (import.meta.env.DEV) console.debug('persist/clear failed', err);
		}
	}

	return { save, load, clear };
}
