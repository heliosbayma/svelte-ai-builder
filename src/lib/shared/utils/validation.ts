import type { ApiKeys } from '$lib/core/stores/apiKeys';
import { LIMITS } from '$lib/shared/constants/limits';
import { t } from '$lib/shared/utils/i18n';

export interface ValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

export function validatePrompt(prompt: string): { isValid: boolean; error?: string } {
	const trimmed = prompt.trim();
	if (!trimmed) {
		return { isValid: false, error: t('validation.promptRequired') };
	}
	if (trimmed.length < LIMITS.PROMPT_MIN_LENGTH) {
		return {
			isValid: false,
			error: t('validation.promptTooShort', { min: LIMITS.PROMPT_MIN_LENGTH })
		};
	}
	if (trimmed.length > LIMITS.PROMPT_MAX_LENGTH) {
		return {
			isValid: false,
			error: t('validation.promptTooLong', { max: LIMITS.PROMPT_MAX_LENGTH })
		};
	}
	return { isValid: true };
}

export function validateApiKeys(keys: ApiKeys): ValidationResult {
	const errors: Record<string, string> = {};
	let hasAnyKey = false;

	// Check if at least one key is provided
	for (const [, key] of Object.entries(keys)) {
		if (key && key.trim()) {
			hasAnyKey = true;
			break;
		}
	}

	if (!hasAnyKey) {
		errors.general = t('validation.apiKeyMinRequired');
		return { isValid: false, errors };
	}

	// Validate individual key formats
	for (const [provider, key] of Object.entries(keys)) {
		if (key && key.trim()) {
			const validation = validateSingleApiKey(provider as keyof ApiKeys, key);
			if (!validation.isValid) {
				errors[provider] = validation.error || t('validation.invalidApiKeyFormat');
			}
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

export function validateSingleApiKey(
	provider: keyof ApiKeys,
	key: string
): { isValid: boolean; error?: string } {
	if (!key || !key.trim()) {
		return { isValid: false, error: t('settings.apiKeyRequired') };
	}

	const trimmed = key.trim();

	switch (provider) {
		case 'openai':
			if (!trimmed.startsWith('sk-') || trimmed.length < LIMITS.API_KEY_MIN_LENGTH_STANDARD) {
				return {
					isValid: false,
					error: t('validation.apiKeyInvalidOpenai', { min: LIMITS.API_KEY_MIN_LENGTH_STANDARD })
				};
			}
			break;
		case 'anthropic':
			if (!trimmed.startsWith('sk-ant-') || trimmed.length < LIMITS.API_KEY_MIN_LENGTH_STANDARD) {
				return {
					isValid: false,
					error: t('validation.apiKeyInvalidAnthropic', { min: LIMITS.API_KEY_MIN_LENGTH_STANDARD })
				};
			}
			break;
		case 'gemini':
			if (trimmed.length < LIMITS.API_KEY_MIN_LENGTH_GEMINI) {
				return {
					isValid: false,
					error: t('validation.apiKeyInvalidGemini', { min: LIMITS.API_KEY_MIN_LENGTH_GEMINI })
				};
			}
			break;
	}

	return { isValid: true };
}

export function sanitizeInput(input: string): string {
	return input.trim().replace(/\s+/g, ' ');
}

export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Simple API key validation (for backwards compatibility)
 */
export function validateApiKey(provider: keyof ApiKeys, key: string): boolean {
	if (!key?.trim()) return false;

	const prefixes = {
		openai: 'sk-',
		anthropic: 'sk-ant-',
		gemini: 'AIza'
	};

	return key.startsWith(prefixes[provider]) && key.length > 20;
}

/**
 * Gets the expected format error message for API keys
 */
export function getKeyErrorMessage(provider: keyof ApiKeys): string {
	const formats = {
		openai: 'sk-...',
		anthropic: 'sk-ant-...',
		gemini: 'AIza...'
	};

	return `Expected format: ${formats[provider]}`;
}
