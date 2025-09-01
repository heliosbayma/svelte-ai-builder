<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Pane, Splitpanes } from 'svelte-splitpanes';

	import AppHeader from '$lib/components/AppHeader.svelte';
	import PreviewPanel from '$lib/components/PreviewPanel.svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';
	import { LAYOUT } from '$lib/constants';
	import { svelteCompiler, llmClient } from '$lib/services';
	import { historyStore } from '$lib/stores/history';
	import { apiKeyStore } from '$lib/stores/apiKeys';
	import { get } from 'svelte/store';

	// State
	let showCode = $state(false);
	let savedPreviewSize = $state(LAYOUT.PREVIEW_SIZE_DEFAULT);
	let savedCodeSize = $state(LAYOUT.CODE_SIZE_DEFAULT);
	let currentCode = $state('');
	let previewHtml = $state('');
	let compiledJs = $state('');
	let compiledCss = $state('');

	// Subscribe to history store
	const history = historyStore;

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

	async function handleCodeGenerated(
		code: string,
		prompt: string = '',
		provider: string = 'anthropic'
	): Promise<void> {
		currentCode = code;
		showCode = true;

		try {
			console.log('Compiling code:', code);
			const result = await svelteCompiler.compile(code);

			let generatedPreviewHtml = '';

			if (result.error) {
				console.error('Compilation error details:', {
					message: result.error.message,
					filename: result.error.filename,
					start: result.error.start,
					end: result.error.end,
					pos: result.error.pos,
					toString: result.error.toString()
				});

				// Attempt a single repair round using the LLM with compiler error context
				try {
					const keys = get(apiKeyStore);
					const apiKey = (keys as unknown as Record<string, string | null>)[provider] || null;
					if (apiKey) {
						const repair = await llmClient.repairComponent(
							provider as any,
							apiKey,
							prompt,
							code,
							result.error.toString?.() ?? result.error.message
						);
						if (repair?.content) {
							console.log('Repair attempt received. Recompiling repaired code...');
							const repaired = await svelteCompiler.compile(repair.content);
							if (!repaired.error) {
								compiledJs = repaired.js;
								compiledCss = repaired.css || '';
								previewHtml = '';
								currentCode = repair.content;
								// Add repaired version and stop early
								historyStore.addVersion({
									prompt: `${prompt} (repaired)`,
									code: repair.content,
									provider,
									compiledJs,
									compiledCss,
									previewHtml: ''
								});
								return;
							}
						}
					}
				} catch (e) {
					console.warn('Repair attempt failed:', e);
				}

				generatedPreviewHtml = `
					<div style="padding: 20px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; font-family: system-ui;">
						<h3 style="margin: 0 0 16px 0; font-size: 18px;">Compilation Error</h3>
						<div style="margin-bottom: 12px;">
							<strong>Message:</strong> ${result.error.message}
						</div>
						${result.error.filename ? `<div style="margin-bottom: 8px;"><strong>File:</strong> ${result.error.filename}</div>` : ''}
						${result.error.start ? `<div style="margin-bottom: 8px;"><strong>Line:</strong> ${result.error.start.line}, <strong>Column:</strong> ${result.error.start.column}</div>` : ''}
						<details style="margin-top: 16px;">
							<summary style="cursor: pointer; font-weight: bold;">Generated Code</summary>
							<pre style="margin-top: 8px; background: #f9f9f9; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
						</details>
					</div>
				`;
				compiledJs = '';
				compiledCss = '';
			} else {
				console.log('Compilation successful');
				compiledJs = result.js;
				compiledCss = result.css || '';
				// Use runtime preview route; send code via postMessage from PreviewPanel on load
				generatedPreviewHtml = '';
			}

			previewHtml = generatedPreviewHtml;
			// Update state variables so PreviewPanel receives the compiled code

			// Add to history
			historyStore.addVersion({
				prompt,
				code,
				provider,
				compiledJs,
				compiledCss,
				previewHtml: generatedPreviewHtml
			});
		} catch (error) {
			console.error('Failed to compile:', error);
			const errorHtml = `
				<div style="padding: 20px; color: #dc2626; font-family: system-ui;">
					<h3>Compilation Failed</h3>
					<p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
					<details style="margin-top: 16px;">
						<summary style="cursor: pointer; font-weight: bold;">Generated Code</summary>
						<pre style="margin-top: 8px; background: #f9f9f9; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
					</details>
				</div>
			`;
			previewHtml = errorHtml;
			compiledJs = '';
			compiledCss = '';

			// Still add failed versions to history for debugging
			historyStore.addVersion({
				prompt,
				code,
				provider,
				previewHtml: errorHtml
			});
		}
	}

	function copyCode(): void {
		if (currentCode) {
			navigator.clipboard.writeText(currentCode);
		}
	}

	// History navigation functions
	function handleUndo(): void {
		historyStore.undo();
		loadCurrentVersion();
	}

	function handleRedo(): void {
		historyStore.redo();
		loadCurrentVersion();
	}

	function loadCurrentVersion(): void {
		const current = historyStore.getCurrentVersion();
		if (current) {
			currentCode = current.code;
			previewHtml = current.previewHtml || '';
			compiledJs = current.compiledJs || '';
			compiledCss = current.compiledCss || '';
			showCode = true;
		}
	}

	// Watch for history changes to update UI
	$effect(() => {
		// This will reactively update when history changes
		const current = $history.versions[$history.currentIndex];
		if (current && current.code !== currentCode) {
			loadCurrentVersion();
		}
	});

	// Keyboard shortcuts for undo/redo
	$effect(() => {
		function handleKeydown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === 'z') {
				event.preventDefault();
				handleUndo();
			} else if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'z') {
				event.preventDefault();
				handleRedo();
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});
</script>

<main class="h-screen bg-background flex flex-col">
	<AppHeader
		{showCode}
		onToggleCode={toggleCode}
		canUndo={$history.currentIndex > 0}
		canRedo={$history.currentIndex < $history.versions.length - 1}
		onUndo={handleUndo}
		onRedo={handleRedo}
	/>

	<Splitpanes class="flex-1" horizontal={false}>
		<!-- Chat Panel -->
		<Pane
			minSize={LAYOUT.CHAT_SIZE_MIN}
			size={LAYOUT.CHAT_SIZE_DEFAULT}
			maxSize={LAYOUT.CHAT_SIZE_MAX}
			class="bg-card"
		>
			<ChatInterface onCodeGenerated={handleCodeGenerated} />
		</Pane>

		<!-- Content Panel -->
		<Pane minSize={LAYOUT.CONTENT_MIN_SIZE} class="flex">
			{#if showCode}
				<Splitpanes horizontal={false} on:resize={handleCodePanesResize}>
					<Pane minSize={30} size={savedPreviewSize} class="bg-background">
						<PreviewPanel {previewHtml} {compiledJs} {compiledCss} />
					</Pane>
					<Pane minSize={LAYOUT.PANE_MIN_SIZE} size={savedCodeSize} class="bg-background">
						<section class="h-full flex flex-col">
							<header class="p-4 flex items-center justify-between">
								<h2 class="font-semibold">Generated Code</h2>
								<div class="flex items-center gap-2">
									<Button variant="outline" size="sm" onclick={copyCode}>Copy Code</Button>
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
									{#if currentCode}
										<pre class="whitespace-pre-wrap text-xs">{currentCode}</pre>
									{:else}
										<p class="text-muted-foreground">Generated Svelte code will appear here...</p>
									{/if}
								</Card>
							</section>
						</section>
					</Pane>
				</Splitpanes>
			{:else}
				<PreviewPanel class="w-full bg-background" {previewHtml} {compiledJs} {compiledCss} />
			{/if}
		</Pane>
	</Splitpanes>
</main>
