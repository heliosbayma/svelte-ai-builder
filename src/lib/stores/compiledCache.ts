export interface CompiledOutput {
	js: string;
	css?: string;
	html?: string;
}

const CAPACITY = 20;
const cache = new Map<string, CompiledOutput>();

function set(id: string, output: CompiledOutput) {
	// Refresh order for LRU behavior
	if (cache.has(id)) cache.delete(id);
	cache.set(id, output);
	while (cache.size > CAPACITY) {
		const oldest = cache.keys().next().value as string | undefined;
		if (!oldest) break;
		cache.delete(oldest);
	}
}

function get(id: string): CompiledOutput | undefined {
	return cache.get(id);
}

function has(id: string): boolean {
	return cache.has(id);
}

function remove(id: string) {
	cache.delete(id);
}

function clear() {
	cache.clear();
}

export const compiledCache = { set, get, has, remove, clear };
