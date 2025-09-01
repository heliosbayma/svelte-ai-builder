<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';

	interface Props {
		class?: string;
		previewHtml?: string;
		compiledJs?: string;
		compiledCss?: string;
	}

	let {
		class: className = '',
		previewHtml = '',
		compiledJs = '',
		compiledCss = ''
	}: Props = $props();
	let iframeRef: HTMLIFrameElement | undefined;

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

	function handleFrameMessage(event: MessageEvent) {
		if (event.data?.type === 'preview-ready') {
			console.log('[preview-panel] iframe reported ready');
			postCodeToIframe();
		}
		if (event.data?.type === 'mounted') {
			console.log('[preview-panel] iframe mounted component');
		}
	}

	function postCodeToIframe() {
		if (!iframeRef || !iframeRef.contentWindow) return;
		if (!compiledJs) return;
		console.log('[preview-panel] posting mount message', {
			jsLen: compiledJs.length,
			hasCss: !!compiledCss
		});
		iframeRef.contentWindow.postMessage({ type: 'mount', js: compiledJs, css: compiledCss }, '*');
	}

	// Re-post code whenever it changes and iframe is ready
	$effect(() => {
		if (compiledJs && iframeRef?.contentWindow) {
			postCodeToIframe();
		}
	});

	function refreshPreview() {
		if (iframeRef) {
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
	<header class="p-4 flex items-center justify-between">
		<h2 class="font-semibold">Live Preview</h2>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={refreshPreview}>Refresh</Button>
			<Button variant="outline" size="sm" onclick={openInNewTab}>Open in New Tab</Button>
		</div>
	</header>
	<section class="flex-1 px-4 pb-4">
		<Card class="h-full">
			<iframe
				bind:this={iframeRef}
				class="w-full h-full rounded-md bg-white"
				title="Component Preview"
				src="/preview"
				sandbox="allow-scripts allow-same-origin"
				onload={() => {
					window.addEventListener('message', handleFrameMessage);
					postCodeToIframe();
				}}
			></iframe>
		</Card>
	</section>
</section>
