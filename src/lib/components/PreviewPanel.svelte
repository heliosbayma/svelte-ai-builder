<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();
	let iframeRef: HTMLIFrameElement | undefined;

	function refreshPreview() {
		if (iframeRef) {
			iframeRef.src = iframeRef.src; // Force reload
		}
	}

	function openInNewTab() {
		if (iframeRef?.src && iframeRef.src !== 'about:blank') {
			window.open(iframeRef.src, '_blank', 'noopener,noreferrer');
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
				src="about:blank"
				sandbox="allow-scripts allow-same-origin"
			></iframe>
		</Card>
	</section>
</section>