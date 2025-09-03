<script lang="ts">
	import { error as toastError } from '$lib/core/stores/toast';
	import { t } from '$lib/shared/i18n';

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
	let hasFatalMountError = $state(false);

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
		if (hasFatalMountError) return; // Stop retrying until new code

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
			iframeReady = true;
			// If we don't have code yet, show a friendly loading message inside the iframe
			if (!compiledJs && !previewHtml) {
				postLoadingMessage(t('loading.default'));
			}
			// If a custom loading message is provided by parent, prefer it
			if (loadingMessage && !isMounted) {
				if (loadingMessage.includes(t('loading.welcome'))) {
					postWelcomeMessage(loadingMessage);
				} else {
					postLoadingMessage(loadingMessage);
				}
			}
			postCodeToIframe();
		}
		if (event.data?.type === 'mounted') {
			isMounted = true;
			lastCompiledJs = compiledJs; // Remember what we just mounted
			hasFatalMountError = false;
			// Stop retry loop
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
		}
		if (event.data?.type === 'mount-error') {
			console.error('[preview-panel] mount error from iframe:', event.data.error);
			// Stop retrying until code changes
			hasFatalMountError = true;
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;

			// Show user-friendly error toast
			toastError('Component failed to render', {
				title: 'Preview Error',
				action: {
					label: 'View Details',
					handler: () => console.log('Mount error:', event.data.error)
				}
			});
		}
	}

	// Always listen for messages as soon as component mounts
	$effect(() => {
		window.addEventListener('message', handleFrameMessage);
		return () => window.removeEventListener('message', handleFrameMessage);
	});

	// Helper to safely post messages to iframe
	function postToIframe(message: object): boolean {
		if (!iframeRef?.contentWindow) return false;
		iframeRef.contentWindow.postMessage(message, '*');
		return true;
	}

	function postCodeToIframe() {
		if (!compiledJs || !iframeReady) return;
		postToIframe({ type: 'mount', js: compiledJs, css: compiledCss });
	}

	function postLoadingMessage(message: string) {
		if (isMounted) return;
		postToIframe({ type: 'loading', message });
	}

	function postWelcomeMessage(message: string) {
		if (isMounted) return;
		postToIframe({ type: 'welcome', message });
	}

	// If parent updates the loading message, forward it immediately
	$effect(() => {
		const canShowMessage = loadingMessage && iframeRef?.contentWindow && iframeReady && !isMounted;
		if (!canShowMessage) return;

		if (loadingMessage.includes(t('loading.welcome'))) {
			postWelcomeMessage(loadingMessage);
		} else {
			postLoadingMessage(loadingMessage);
		}
	});

	// Re-post code whenever it changes and iframe is ready
	$effect(() => {
		const canPostCode = compiledJs && iframeRef?.contentWindow && iframeReady;
		if (!canPostCode) return;

		// Only remount if the code actually changed
		if (compiledJs !== lastCompiledJs) {
			// Reset mount state for new code
			isMounted = false;
			hasFatalMountError = false;
			// Cancel any existing mount attempts
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
			// Show loading immediately if provided
			if (loadingMessage) {
				if (loadingMessage.includes(t('loading.welcome'))) {
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
			scheduleMountAttempt();
		}
	});
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
				hasFatalMountError = false;
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
			onerror={() => {
				toastError('Preview failed to load. Please refresh the page.', {
					title: 'Preview Error',
					duration: 0, // Don't auto-dismiss critical errors
					action: {
						label: 'Refresh',
						handler: () => location.reload()
					}
				});
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
