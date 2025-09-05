import { en, type TranslationKeys } from './en';

type DeepKeyOf<T> = T extends object
	? {
			[K in keyof T]: K extends string
				? T[K] extends object
					? `${K}.${DeepKeyOf<T[K]>}` | K
					: K
				: never;
		}[keyof T]
	: never;

export type I18nKey = DeepKeyOf<TranslationKeys>;

// Available languages
export const SUPPORTED_LANGUAGES = ['en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Translation store
let currentLanguage: SupportedLanguage = 'en';
const translations: Record<SupportedLanguage, TranslationKeys> = { en };

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
	return (
		(path
			.split('.')
			.reduce(
				(current: unknown, key) =>
					current && typeof current === 'object' && key in current
						? (current as Record<string, unknown>)[key]
						: undefined,
				obj
			) as string) || path
	);
}

/**
 * Get translated text by key with optional parameter substitution
 */
export function t(key: I18nKey, params: Record<string, string | number> = {}): string {
	const translation = getNestedValue(translations[currentLanguage], key);

	// Simple parameter substitution
	return Object.entries(params).reduce(
		(text, [param, value]) => text.replace(`{${param}}`, String(value)),
		translation
	);
}

/**
 * Set the current language
 */
export function setLanguage(lang: SupportedLanguage) {
	if (SUPPORTED_LANGUAGES.includes(lang)) {
		currentLanguage = lang;
	}
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLanguage {
	return currentLanguage;
}

/**
 * Add translations for a new language
 */
export function addLanguage(lang: SupportedLanguage, translationData: TranslationKeys) {
	translations[lang] = translationData;
}

// Re-export the English translations for reference
export { en };
