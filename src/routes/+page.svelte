<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Pane, Splitpanes } from 'svelte-splitpanes';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';
	import { LAYOUT } from '$lib/constants';

	// State
	let showCode = false;
	let savedPreviewSize = LAYOUT.PREVIEW_SIZE_DEFAULT;
	let savedCodeSize = LAYOUT.CODE_SIZE_DEFAULT;

	// Event handlers
	function toggleCode(): void {
		showCode = !showCode;
	}

	function handleCodePanesResize(e: CustomEvent): void {
		const detail = e.detail;
		if (detail && detail.length === 2) {
			savedPreviewSize = detail[0].size;
			savedCodeSize = detail[1].size;
		}
	}

	function generateComponent(): void {
		// TODO: Implement component generation
		console.log('Generate component functionality coming soon');
	}

	function copyCode(): void {
		// TODO: Implement code copying
		console.log('Copy code functionality coming soon');
	}
</script>

<main class="h-screen bg-background flex flex-col">
	<AppHeader {showCode} onToggleCode={toggleCode} />

	<Splitpanes class="flex-1" horizontal={false}>
		<!-- Chat Panel -->
		<Pane
			minSize={LAYOUT.CHAT_SIZE_MIN}
			size={LAYOUT.CHAT_SIZE_DEFAULT}
			maxSize={LAYOUT.CHAT_SIZE_MAX}
			class="bg-card"
		>
			<aside class="h-full flex flex-col">
				<header class="p-4 border-b">
					<h2 class="font-semibold mb-3">Chat with AI</h2>
					<Textarea
						placeholder="Describe the component you want to create..."
						class="mb-3"
						rows={3}
					/>
					<Button class="w-full" onclick={generateComponent}>Generate Component</Button>
				</header>
				<div class="flex-1 p-4 overflow-y-auto">
					<p class="text-sm text-muted-foreground">Chat history will appear here...</p>
				</div>
			</aside>
		</Pane>

		<!-- Content Panel -->
		<Pane minSize={LAYOUT.CONTENT_MIN_SIZE} class="flex">
			{#if showCode}
				<Splitpanes horizontal={false} on:resize={handleCodePanesResize}>
					<Pane minSize={30} size={savedPreviewSize} class="bg-background">
						<PreviewPanel />
					</Pane>
					<Pane minSize={LAYOUT.PANE_MIN_SIZE} size={savedCodeSize} class="bg-background">
						<section class="h-full flex flex-col">
							<header class="p-4 flex items-center justify-between">
								<h2 class="font-semibold">Generated Code</h2>
								<div class="flex items-center gap-2">
									<Button variant="outline" size="sm">Copy Code</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={toggleCode}
										aria-label="Close code panel"
									>
										✕
									</Button>
								</div>
							</header>
							<section class="flex-1 px-4 pb-4">
								<Card class="h-full p-4 font-mono text-sm overflow-auto">
									<p class="text-muted-foreground">Generated Svelte code will appear here...</p>
								</Card>
							</section>
						</section>
					</Pane>
				</Splitpanes>
			{:else}
				<PreviewPanel class="w-full bg-background" />
			{/if}
		</Pane>
	</Splitpanes>
</main>