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
	let lastCompiledJs = '';
	let hasFatalMountError = $state(false);
	let targetOrigin: string | null = null;

	function postTheme() {
		const isDark = document.documentElement.classList.contains('dark');
		try {
			iframeRef?.contentWindow?.postMessage(
				{ type: 'apply-theme', dark: isDark },
				targetOrigin || '*'
			);
		} catch {}
	}

	// Sync theme to iframe on parent theme changes
	$effect(() => {
		postTheme();
		const observer = new MutationObserver(() => postTheme());
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	$effect(() => {
		if (iframeRef && previewHtml) {
			const blob = new Blob([previewHtml], { type: 'text/html' });
			const url = URL.createObjectURL(blob);
			iframeRef.src = url;
			return () => URL.revokeObjectURL(url);
		}
	});

	function scheduleMountAttempt() {
		if (!compiledJs) return;
		if (isMounted) return;
		if (mountAttemptId !== null) return;
		if (hasFatalMountError) return;

		if (!iframeReady || !iframeRef?.contentWindow) {
			try {
				iframeRef?.contentWindow?.postMessage({ type: 'ping' }, targetOrigin || '*');
			} catch {}
		}

		postCodeToIframe();

		if (mountAttempts < 120 && !isMounted) {
			mountAttemptId = setTimeout(() => {
				mountAttempts += 1;
				mountAttemptId = null;
				scheduleMountAttempt();
			}, 50);
		} else if (!isMounted) {
			try {
				iframeReady = false;
				isMounted = false;
				iframeRef!.src = iframeRef!.src;
				mountAttempts = 0;
				mountAttemptId = null;
			} catch {}
		}
	}

	function handleFrameMessage(event: MessageEvent) {
		if (targetOrigin === null && event.origin) targetOrigin = event.origin;
		if (event.data?.type === 'preview-ready') {
			iframeReady = true;
			postTheme();
			if (!compiledJs && !previewHtml) {
				postLoadingMessage(t('loading.default'));
			}
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
			lastCompiledJs = compiledJs;
			hasFatalMountError = false;
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
		}
		if (event.data?.type === 'mount-error') {
			console.error('[preview-panel] mount error from iframe:', event.data.error);
			hasFatalMountError = true;
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
			toastError('Component failed to render', {
				title: 'Preview Error',
				action: {
					label: 'View Details',
					handler: () => console.log('Mount error:', event.data.error)
				}
			});
		}
	}

	$effect(() => {
		window.addEventListener('message', handleFrameMessage);
		return () => window.removeEventListener('message', handleFrameMessage);
	});

	function postToIframe(message: object): boolean {
		if (!iframeRef?.contentWindow) return false;
		iframeRef.contentWindow.postMessage(message, targetOrigin || '*');
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

	$effect(() => {
		const canShowMessage = loadingMessage && iframeRef?.contentWindow && iframeReady && !isMounted;
		if (!canShowMessage) return;

		if (loadingMessage.includes(t('loading.welcome'))) {
			postWelcomeMessage(loadingMessage);
		} else {
			postLoadingMessage(loadingMessage);
		}
	});

	$effect(() => {
		const canPostCode = compiledJs && iframeRef?.contentWindow && iframeReady;
		if (!canPostCode) return;

		if (compiledJs !== lastCompiledJs) {
			isMounted = false;
			hasFatalMountError = false;
			if (mountAttemptId) clearTimeout(mountAttemptId);
			mountAttemptId = null;
			if (loadingMessage) {
				if (loadingMessage.includes(t('loading.welcome'))) {
					postWelcomeMessage(loadingMessage);
				} else {
					postLoadingMessage(loadingMessage);
				}
			}
			postCodeToIframe();
			mountAttempts = 0;
			scheduleMountAttempt();
		} else if (!isMounted) {
			scheduleMountAttempt();
		}
	});
</script>

<section class="h-full flex flex-col {className}">
	<section
		class="flex-1 preview-scrollbar"
		aria-busy={!isMounted ? 'true' : 'false'}
		aria-live="polite"
	>
		<iframe
			bind:this={iframeRef}
			class="w-full h-full bg-background"
			title="Component Preview"
			src="/preview"
			sandbox="allow-scripts allow-same-origin"
			onload={() => {
				iframeReady = false;
				isMounted = false;
				lastCompiledJs = '';
				hasFatalMountError = false;
				if (mountAttemptId) clearTimeout(mountAttemptId);
				mountAttemptId = null;
				mountAttempts = 0;
				try {
					iframeRef?.contentWindow?.postMessage({ type: 'ping' }, targetOrigin || '*');
					postTheme();
				} catch {}
			}}
			onerror={() => {
				toastError('Preview failed to load. Please refresh the page.', {
					title: 'Preview Error',
					duration: 0,
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
