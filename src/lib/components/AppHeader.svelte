<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ApiKeySettings from './ApiKeySettings.svelte';
	import { historyStore } from '$lib/stores/history';
	import { createEventDispatcher } from 'svelte';
	const history = historyStore;

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
	}

	// Declare component events for TS consumers
	interface $$Events {
		selectVersion: CustomEvent<number>;
	}

	const dispatch = createEventDispatcher<{ selectVersion: number }>();

	let {
		showCode,
		onToggleCode,
		canUndo = false,
		canRedo = false,
		onUndo,
		onRedo
	}: Props = $props();
	let showApiKeySettings = $state(false);
	let showHistory = $state(false);

	function openApiKeySettings() {
		showApiKeySettings = true;
	}

	function closeApiKeySettings() {
		showApiKeySettings = false;
	}

	function toggleHistory() {
		showHistory = !showHistory;
	}

	function selectVersion(index: number) {
		dispatch('selectVersion', index);
		showHistory = false;
	}
</script>

<header class="border-b bg-card px-6 py-4 flex items-center justify-between">
	<section class="flex items-center gap-4">
		<h1 class="text-2xl font-bold">AI Svelte Builder</h1>
		<span class="text-sm text-muted-foreground">v1.0.0</span>
	</section>
	<nav class="flex items-center gap-2">
		<!-- History controls -->
		<div class="flex items-center gap-1 border-r pr-2 mr-2">
			<Button
				variant="ghost"
				size="sm"
				disabled={!canUndo}
				onclick={onUndo}
				aria-label="Undo last change"
				title="Undo (⌘Z)"
			>
				↶
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={!canRedo}
				onclick={onRedo}
				aria-label="Redo last undone change"
				title="Redo (⌘⇧Z)"
			>
				↷
			</Button>
			<Button variant="outline" size="sm" onclick={toggleHistory} aria-label="Open history"
				>History</Button
			>
		</div>

		<Button variant={showCode ? 'default' : 'outline'} size="sm" onclick={onToggleCode}>
			{showCode ? 'Hide' : 'Show'} Code
		</Button>
		<Button variant="ghost" size="sm" onclick={openApiKeySettings}>API Keys</Button>
		<Button variant="ghost" size="sm">Export</Button>
	</nav>
</header>

{#if showHistory}
	<!-- simple side drawer -->
	<div class="fixed inset-0 z-50">
		<button class="absolute inset-0 bg-black/30" onclick={toggleHistory} aria-label="Close history"
		></button>
		<aside
			class="absolute right-0 top-0 h-full w-[360px] bg-card border-l shadow-xl p-4 overflow-auto"
		>
			<h3 class="font-semibold mb-3">History</h3>
			{#if $history.versions.length === 0}
				<p class="text-sm text-muted-foreground">No versions yet.</p>
			{:else}
				<ul class="space-y-2">
					{#each $history.versions as v, idx (v.id)}
						<li>
							<button
								class="w-full text-left border rounded p-2 hover:bg-muted"
								onclick={() => selectVersion(idx)}
								aria-label="Revert to version"
							>
								<div class="text-xs text-muted-foreground">
									{new Date(v.timestamp).toLocaleTimeString()}
								</div>
								<div class="text-sm line-clamp-2">{v.prompt}</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
{/if}

<ApiKeySettings isOpen={showApiKeySettings} onClose={closeApiKeySettings} />
