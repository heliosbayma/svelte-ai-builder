import { browser } from '$app/environment';

export interface PersistConfig<T> {
	key: string;
	version: number;
	serialize?: (data: T) => unknown;
	deserialize?: (raw: unknown) => T | null;
	throttleMs?: number;
}

export function createPersistor<T>(config: PersistConfig<T>) {
	let lastWrite = 0;
	const { key, version, serialize, deserialize, throttleMs = 400 } = config;

	function namespaced() {
		return `ai-builder:${key}:v${version}`;
	}

	function save(data: T) {
		if (!browser) return;
		const now = Date.now();
		if (now - lastWrite < throttleMs) return;
		lastWrite = now;
		try {
			const payload = serialize ? serialize(data) : data;
			localStorage.setItem(namespaced(), JSON.stringify(payload));
		} catch {}
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
		} catch {
			return defaultValue;
		}
	}

	function clear() {
		if (!browser) return;
		try {
			localStorage.removeItem(namespaced());
		} catch {}
	}

	return { save, load, clear };
}
