export interface IFrameState {
	iframeReady: boolean;
	isMounted: boolean;
	mountAttemptId: number | null;
	mountAttempts: number;
	lastCompiledJs: string;
	hasFatalMountError: boolean;
}

export function createIFrameState(): IFrameState {
	return {
		iframeReady: false,
		isMounted: false,
		mountAttemptId: null,
		mountAttempts: 0,
		lastCompiledJs: '',
		hasFatalMountError: false
	};
}

export interface IFrameMessage {
	type: 'mount' | 'loading' | 'welcome' | 'ping';
	js?: string;
	css?: string;
	message?: string;
}

export function postMessageToIframe(iframe: HTMLIFrameElement, message: IFrameMessage): boolean {
	if (!iframe?.contentWindow) return false;

	try {
		iframe.contentWindow.postMessage(message, '*');
		return true;
	} catch {
		return false;
	}
}

export function postCodeToIframe(
	iframe: HTMLIFrameElement | undefined,
	compiledJs: string,
	compiledCss: string,
	state: IFrameState
): boolean {
	if (!iframe || !iframe.contentWindow) return false;
	if (!compiledJs) return false;
	if (!state.iframeReady) return false;

	return postMessageToIframe(iframe, {
		type: 'mount',
		js: compiledJs,
		css: compiledCss
	});
}

export function postLoadingMessage(
	iframe: HTMLIFrameElement | undefined,
	message: string,
	state: IFrameState
): boolean {
	if (!iframe?.contentWindow) return false;
	if (state.isMounted) return false;

	return postMessageToIframe(iframe, { type: 'loading', message });
}

export function postWelcomeMessage(
	iframe: HTMLIFrameElement | undefined,
	message: string,
	state: IFrameState
): boolean {
	if (!iframe?.contentWindow) return false;
	if (state.isMounted) return false;

	return postMessageToIframe(iframe, { type: 'welcome', message });
}

export function scheduleMountAttempt(
	iframe: HTMLIFrameElement | undefined,
	compiledJs: string,
	compiledCss: string,
	state: IFrameState,
	onStateChange: (newState: Partial<IFrameState>) => void
) {
	if (!compiledJs) return;
	if (state.isMounted) return;
	if (state.mountAttemptId !== null) return; // Prevent concurrent mount attempts
	if (state.hasFatalMountError) return; // Stop retrying until new code

	if (!state.iframeReady || !iframe?.contentWindow) {
		// Ask the iframe to announce readiness again
		postMessageToIframe(iframe!, { type: 'ping' });
	}

	// Try to post code
	postCodeToIframe(iframe, compiledJs, compiledCss, state);

	// Backoff up to ~2s, then hard-reload the iframe once to recover
	if (state.mountAttempts < 120 && !state.isMounted) {
		const timeoutId = setTimeout(() => {
			onStateChange({
				mountAttempts: state.mountAttempts + 1,
				mountAttemptId: null
			});
			scheduleMountAttempt(
				iframe,
				compiledJs,
				compiledCss,
				{ ...state, mountAttempts: state.mountAttempts + 1, mountAttemptId: null },
				onStateChange
			);
		}, 50);
		onStateChange({ mountAttemptId: timeoutId });
	} else if (!state.isMounted && iframe) {
		// One-time recovery: force reload
		try {
			onStateChange({
				iframeReady: false,
				isMounted: false,
				mountAttempts: 0,
				mountAttemptId: null
			});
			iframe.src = iframe.src + '';
		} catch {
			// Ignore errors
		}
	}
}

export function handleFrameMessage(
	event: MessageEvent,
	state: IFrameState,
	compiledJs: string,
	loadingMessage: string,
	onStateChange: (newState: Partial<IFrameState>) => void
) {
	if (event.data?.type === 'preview-ready') {
		onStateChange({ iframeReady: true });

		if (!compiledJs) {
			// Will be handled by caller to post the loading message
		}
		return { type: 'ready' as const, needsLoadingMessage: !compiledJs && !loadingMessage };
	}

	if (event.data?.type === 'mounted') {
		onStateChange({
			isMounted: true,
			lastCompiledJs: compiledJs,
			hasFatalMountError: false
		});

		// Stop retry loop
		if (state.mountAttemptId) {
			clearTimeout(state.mountAttemptId);
			onStateChange({ mountAttemptId: null });
		}
		return { type: 'mounted' as const };
	}

	if (event.data?.type === 'mount-error') {
		console.error('[preview-panel] mount error from iframe:', event.data.error);
		// Stop retrying until code changes
		onStateChange({ hasFatalMountError: true });
		if (state.mountAttemptId) {
			clearTimeout(state.mountAttemptId);
			onStateChange({ mountAttemptId: null });
		}
		return { type: 'error' as const, error: event.data.error };
	}

	return null;
}

export function refreshPreview(
	iframe: HTMLIFrameElement | undefined,
	onStateChange: (newState: Partial<IFrameState>) => void
) {
	if (iframe) {
		onStateChange({
			iframeReady: false,
			isMounted: false,
			lastCompiledJs: '',
			hasFatalMountError: false,
			mountAttemptId: null,
			mountAttempts: 0
		});
		iframe.src = iframe.src + ''; // Force reload
	}
}
