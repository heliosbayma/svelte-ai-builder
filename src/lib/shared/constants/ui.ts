import { LIMITS } from './limits';
import { TIMING } from './timing';

// UI Constants following first principles
export const UI_CONSTANTS = {
	// Component sizes - consistent across app
	SIZES: {
		ICON_SMALL: 'size-4',
		ICON_MEDIUM: 'size-6',
		ICON_LARGE: 'size-8',
		BUTTON_HEIGHT_SM: 'h-8',
		INPUT_HEIGHT_DEFAULT: 'min-h-[60px]',
		INPUT_HEIGHT_MAX: 'max-h-[200px]',
		CODE_PREVIEW_MAX_HEIGHT: `max-h-[${LIMITS.CODE_PREVIEW_MAX_HEIGHT_PX}px]`
	},

	// Animation timings - consistent motion
	ANIMATIONS: {
		FAST: `duration-[${TIMING.LOADING_MESSAGE_DELAY_MS}ms]`,
		MEDIUM: `duration-[${LIMITS.ANIMATION_DURATION_MEDIUM_MS}ms]`,
		SLOW: `duration-[${LIMITS.ANIMATION_DURATION_LONG_MS}ms]`,
		FADE_IN: 'animate-in fade-in',
		ZOOM_IN: 'animate-in zoom-in-95'
	},

	// Common spacing - based on design system
	SPACING: {
		PANEL_PADDING: 'p-4',
		FORM_SPACING: 'space-y-4',
		BUTTON_GAP: 'gap-2',
		ICON_GAP: 'gap-1.5'
	},

	// Z-index layers - prevent conflicts
	Z_INDEX: {
		DROPDOWN: 'z-40',
		MODAL: 'z-50',
		NOTIFICATION: 'z-60'
	}
} as const;

// Legacy constants - use i18n system instead
// @deprecated Use t('errors.xxx') from i18n system
export const ERROR_MESSAGES = {
	API_KEY_REQUIRED: 'Please configure your API keys in Settings before starting a conversation.',
	API_KEY_INVALID: 'Invalid API key format',
	API_KEY_MINIMUM: 'Please, add at least one API key.',
	GENERATION_FAILED: 'Generation failed. Please try again.',
	PLAN_FAILED: 'Plan failed. Please try again or pick another model.',
	BUILD_FAILED: 'Build failed. Please try again or pick another model.',
	NETWORK_ERROR: 'Network error. Please check your connection.',
	UNKNOWN_ERROR: 'Unknown error occurred'
} as const;

// @deprecated Use i18n system instead
export const SUCCESS_MESSAGES = {
	API_KEYS_SAVED: 'API keys saved successfully',
	SESSION_EXPORTED: 'Session exported successfully',
	SESSION_IMPORTED: 'Session imported successfully',
	CODE_COPIED: 'Code copied to clipboard'
} as const;
