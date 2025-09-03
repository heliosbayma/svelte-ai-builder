/**
 * Timing constants for UI interactions and retry logic
 */
export const TIMING = {
	// Preview panel iframe management
	MOUNT_RETRY_DELAY_MS: 50,
	MOUNT_MAX_ATTEMPTS: 120,
	URL_CLEANUP_DELAY_MS: 1000,

	// Persistence and debouncing
	PERSISTENCE_DEBOUNCE_MS: 200,
	PERSISTENCE_THROTTLE_MS: 400,

	// Chat and UI responsiveness
	CHAT_AUTO_SCROLL_DELAY_MS: 0, // requestAnimationFrame

	// Loading message display
	LOADING_MESSAGE_DELAY_MS: 100
} as const;
