<script lang="ts">

	interface Props {
		class?: string;
		previewHtml?: string;
		compiledJs?: string;
		compiledCss?: string;
		loadingMessage?: string;
	}

	let {
		class: className = '',
		previewHtml = '',
		compiledJs = '',
		compiledCss = '',
		loadingMessage = ''
	}: Props = $props();
	let iframeRef: HTMLIFrameElement | undefined;
	let iframeReady = $state(false);
	let isMounted = $state(false);
	let mountAttemptId: number | null = null;
	let mountAttempts = 0;
	let lastCompiledJs = ''; // Track the last compiled JS to prevent redundant mounts

	// Update iframe content when previewHtml changes
	$effect(() => {
		if (iframeRef && previewHtml) {
			// Back-compat: if provided with full HTML preview string, load it
			const blob = new Blob([previewHtml], { type: 'text/html' });
			const url = URL.createObjectURL(blob);
			iframeRef.src = url;
			return () => URL.revokeObjectURL(url);
		}
	});

	function scheduleMountAttempt() {
		if (!compiledJs) return;
		if (isMounted) return;
		if (mountAttemptId !== null) return; // Prevent concurrent mount attempts

		if (!iframeReady || !iframeRef?.contentWindow) {
			// Ask the iframe to announce readiness again
			try {
				iframeRef?.contentWindow?.postMessage({ type: 'ping' }, '*');
			} catch {
			// Ignore errors
		}
		}

		// Try to post code
		postCodeToIframe();

		// Backoff up to ~2s, then hard-reload the iframe once to recover
		if (mountAttempts < 120 && !isMounted) {
			mountAttemptId = setTimeout(() => {
				mountAttempts += 1;
				mountAttemptId = null; // Reset for next attempt
				scheduleMountAttempt();
			}, 50); // Add a 50ms delay to prevent infinite recursion
		} else if (!isMounted) {
			// One-time recovery: force reload
			try {
				iframeReady = false;
				isMounted = false;
				iframeRef!.src = iframeRef!.src;
				mountAttempts = 0;
				mountAttemptId = null;
			} catch {
			// Ignore errors
		}
		}
	}

	function handleFrameMessage(event: MessageEvent) {
		if (event.data?.type === 'preview-ready') {
			console.log('[preview-panel] iframe reported ready');
			iframeReady = true;
			// If we don't have code yet, show a friendly loading message inside the iframe
			if (!compiledJs && !previewHtml) {
				postLoadingMessage(
					'Synthesizing pixels from daydreams… brewing your component in zero‑G ☕️🛰️'
				);
			}
			// If a custom loading message is provided by parent, prefer it
			if (loadingMessage && !isMounted) {
				if (loadingMessage.includes('Awaiting your first creation')) {
					postWelcomeMessage(loadingMessage);
				} else {
					postLoadingMessage(loadingMessage);
				}
			}
			postCodeToIframe();
		}
		if (event.data?.type === 'mounted') {
			console.log('[preview-panel] iframe mounted component');
			isMounted = true;
			lastCompiledJs = compiledJs; // Remember what we just mounted
			// Stop retry loop
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
		}
		if (event.data?.type === 'mount-error') {
			console.error('[preview-panel] mount error from iframe:', event.data.error);
			// Continue trying to mount, but with a longer delay
			if (mountAttempts < 60) { // Reduce attempts but continue trying
				setTimeout(() => {
					if (!isMounted) {
						scheduleMountAttempt();
					}
				}, 100);
			} else {
				// Force a refresh after too many failures
				refreshPreview();
			}
		}
	}

	// Always listen for messages as soon as component mounts
	$effect(() => {
		window.addEventListener('message', handleFrameMessage);
		return () => window.removeEventListener('message', handleFrameMessage);
	});

	function postCodeToIframe() {
		if (!iframeRef || !iframeRef.contentWindow) return;
		if (!compiledJs) return;
		if (!iframeReady) return;
		console.log('[preview-panel] posting mount message', {
			jsLen: compiledJs.length,
			hasCss: !!compiledCss
		});
		iframeRef.contentWindow.postMessage({ type: 'mount', js: compiledJs, css: compiledCss }, '*');
	}

	function postLoadingMessage(message: string) {
		if (!iframeRef || !iframeRef.contentWindow) return;
		if (isMounted) return;
		iframeRef.contentWindow.postMessage({ type: 'loading', message }, '*');
	}

	function postWelcomeMessage(message: string) {
		if (!iframeRef || !iframeRef.contentWindow) return;
		if (isMounted) return;
		iframeRef.contentWindow.postMessage({ type: 'welcome', message }, '*');
	}

	// If parent updates the loading message, forward it immediately
	$effect(() => {
		if (loadingMessage && iframeRef?.contentWindow && iframeReady && !isMounted) {
			if (loadingMessage.includes('Awaiting your first creation')) {
				postWelcomeMessage(loadingMessage);
			} else {
				postLoadingMessage(loadingMessage);
			}
		}
	});

	// Re-post code whenever it changes and iframe is ready
	$effect(() => {
		if (compiledJs && iframeRef?.contentWindow && iframeReady) {
			// Only remount if the code actually changed
			if (compiledJs !== lastCompiledJs) {
				console.log('[preview-panel] new code detected, remounting');
				// Reset mount state for new code
				isMounted = false;
				// Cancel any existing mount attempts
				if (mountAttemptId) clearTimeout(mountAttemptId);
				mountAttemptId = null;
				// Show loading immediately if provided
				if (loadingMessage) {
					if (loadingMessage.includes('Awaiting your first creation')) {
						postWelcomeMessage(loadingMessage);
					} else {
						postLoadingMessage(loadingMessage);
					}
				}
				// Post code and begin mount attempts until success
				postCodeToIframe();
				mountAttempts = 0;
				scheduleMountAttempt();
			} else if (!isMounted) {
				// Same code but not mounted yet - continue trying
				console.log('[preview-panel] continuing mount attempts for same code');
				scheduleMountAttempt();
			}
		}
	});

	function refreshPreview() {
		if (iframeRef) {
			iframeReady = false;
			isMounted = false;
			lastCompiledJs = ''; // Reset to allow remounting same code
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
			mountAttempts = 0;
			iframeRef.src = iframeRef.src; // Force reload
		}
	}

	function openInNewTab() {
		if (previewHtml) {
			const blob = new Blob([previewHtml], { type: 'text/html' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank', 'noopener,noreferrer');
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}
</script>

<section class="h-full flex flex-col {className}">
	<section class="flex-1 preview-scrollbar">
		<iframe
			bind:this={iframeRef}
			class="w-full h-full bg-background"
			title="Component Preview"
			src="/preview"
			sandbox="allow-scripts allow-same-origin allow-forms"
			onload={() => {
				iframeReady = false;
				isMounted = false;
				lastCompiledJs = ''; // Reset to allow remounting same code
				if (mountAttemptId) clearTimeout(mountAttemptId);
				mountAttemptId = null;
				mountAttempts = 0;
				// Handshake: ask the iframe to re-announce readiness
				try {
					iframeRef?.contentWindow?.postMessage({ type: 'ping' }, '*');
				} catch {
			// Ignore errors
		}
			}}
		></iframe>
	</section>
</section>

<style>
	.preview-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.preview-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.preview-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.preview-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Firefox scrollbar */
	.preview-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
</style>
