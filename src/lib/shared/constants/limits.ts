/**
 * Limits and constraints for various UI components and validation
 */
export const LIMITS = {
	// Textarea and input constraints
	TEXTAREA_MAX_LINES: 8,
	TEXTAREA_DEFAULT_LINE_HEIGHT: 20,
	CODE_PREVIEW_MAX_HEIGHT_PX: 384, // equivalent to max-h-96

	// Prompt validation
	PROMPT_MIN_LENGTH: 3,
	PROMPT_MAX_LENGTH: 10000,

	// API key validation
	API_KEY_MIN_LENGTH_STANDARD: 20, // OpenAI, Anthropic
	API_KEY_MIN_LENGTH_GEMINI: 10,

	// Storage and memory limits
	CHAT_MESSAGES_RESTORE_LIMIT: 200,
	TELEMETRY_MAX_EVENTS: 100,
	HISTORY_MAX_VERSIONS: 50, // Re-export from existing constant
	HISTORY_STORAGE_BUDGET_BYTES: 4_500_000, // Re-export from existing

	// Animation and transition limits
	ANIMATION_DURATION_SHORT_MS: 150,
	ANIMATION_DURATION_MEDIUM_MS: 200,
	ANIMATION_DURATION_LONG_MS: 300
} as const;
