/**
 * Reactive i18n utilities for Svelte components
 * Usage: import { t } from '$lib/shared/utils/i18n'
 * Then use: t('chat.placeholder') or t('validation.promptTooShort', { min: 3 })
 */
export { t, setLanguage, getCurrentLanguage, addLanguage } from '$lib/shared/i18n';
export type { I18nKey, SupportedLanguage } from '$lib/shared/i18n';
