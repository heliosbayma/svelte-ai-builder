/**
 * Safe storage and JSON parsing utilities that handle errors gracefully
 */

/**
 * Safely extracts error message from unknown error value
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export interface StorageResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Safely parse JSON with proper error handling
 */
export function safeJsonParse<T = unknown>(jsonString: string, fallback?: T): StorageResult<T> {
	try {
		const data = JSON.parse(jsonString) as T;
		return { success: true, data };
	} catch (error) {
		return {
			success: false,
			data: fallback,
			error: `Invalid JSON: ${getErrorMessage(error)}`
		};
	}
}

/**
 * Safely stringify JSON with proper error handling
 */
export function safeJsonStringify<T>(value: T): StorageResult<string> {
	try {
		const data = JSON.stringify(value);
		return { success: true, data };
	} catch (error) {
		return {
			success: false,
			error: `JSON stringify failed: ${getErrorMessage(error)}`
		};
	}
}

/**
 * Safely get an item from storage
 */
function safeStorageGet<T = string>(
	storage: Storage | undefined,
	key: string,
	parser?: (value: string) => T
): StorageResult<T> {
	if (!storage) {
		return { success: false, error: 'Storage not available' };
	}

	try {
		const value = storage.getItem(key);
		if (value === null) {
			return { success: true, data: undefined };
		}

		const parsedValue = parser ? parser(value) : (value as T);
		return { success: true, data: parsedValue };
	} catch (error) {
		return {
			success: false,
			error: `Failed to read from storage: ${getErrorMessage(error)}`
		};
	}
}

/**
 * Safely set an item in storage
 */
function safeStorageSet(
	storage: Storage | undefined,
	key: string,
	value: string
): StorageResult<void> {
	if (!storage) {
		return { success: false, error: 'Storage not available' };
	}

	try {
		storage.setItem(key, value);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: `Failed to write to storage: ${getErrorMessage(error)}`
		};
	}
}

/**
 * Safe localStorage operations
 */
export const safeLocalStorage = {
	get: <T = string>(key: string, parser?: (value: string) => T) =>
		safeStorageGet(typeof localStorage !== 'undefined' ? localStorage : undefined, key, parser),

	set: (key: string, value: string) =>
		safeStorageSet(typeof localStorage !== 'undefined' ? localStorage : undefined, key, value),

	getJSON: <T>(key: string): StorageResult<T> =>
		safeStorageGet(typeof localStorage !== 'undefined' ? localStorage : undefined, key, JSON.parse),

	setJSON: <T>(key: string, value: T) =>
		safeStorageSet(
			typeof localStorage !== 'undefined' ? localStorage : undefined,
			key,
			JSON.stringify(value)
		)
};

/**
 * Safe sessionStorage operations
 */
export const safeSessionStorage = {
	get: <T = string>(key: string, parser?: (value: string) => T) =>
		safeStorageGet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, key, parser),

	set: (key: string, value: string) =>
		safeStorageSet(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined, key, value),

	getJSON: <T>(key: string): StorageResult<T> =>
		safeStorageGet(
			typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
			key,
			JSON.parse
		),

	setJSON: <T>(key: string, value: T) =>
		safeStorageSet(
			typeof sessionStorage !== 'undefined' ? sessionStorage : undefined,
			key,
			JSON.stringify(value)
		)
};
