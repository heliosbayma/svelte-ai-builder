/**
 * Check if the meta key (Cmd on Mac, Ctrl on Windows/Linux) is pressed
 */
export function isMetaKey(e: KeyboardEvent): boolean {
	return e.metaKey || e.ctrlKey;
}

/**
 * Standard keyboard shortcuts for modals
 */
export function handleModalKeyboard(
	e: KeyboardEvent,
	callbacks: {
		onEscape?: () => void;
		onEnter?: () => void;
		onMetaEnter?: () => void;
	}
) {
	if (e.key === 'Escape' && callbacks.onEscape) {
		e.preventDefault();
		callbacks.onEscape();
	}

	if (e.key === 'Enter') {
		if (isMetaKey(e) && callbacks.onMetaEnter) {
			e.preventDefault();
			callbacks.onMetaEnter();
		} else if (!isMetaKey(e) && callbacks.onEnter) {
			e.preventDefault();
			callbacks.onEnter();
		}
	}
}
