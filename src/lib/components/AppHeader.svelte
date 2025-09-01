<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ApiKeySettings from './ApiKeySettings.svelte';
	import { historyStore } from '$lib/stores/history';
	import { createEventDispatcher } from 'svelte';
	import { allPersistKeys, PERSIST_VERSION } from '$lib/utils';
	const history = historyStore;

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
		showMetrics?: boolean;
		onToggleMetrics?: () => void;
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
		onRedo,
		showMetrics = false,
		onToggleMetrics
	}: Props = $props();
	let showApiKeySettings = $state(false);
	let showHistory = $state(false);
	let showSessionMenu = $state(false);
	let fileInput: HTMLInputElement | null = null;

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

	function exportSession() {
		try {
			const keys = allPersistKeys(PERSIST_VERSION);
			const data: Record<string, unknown> = { __version: PERSIST_VERSION };
			for (const k of keys) {
				const v = localStorage.getItem(k);
				if (v) data[k] = JSON.parse(v);
			}
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ai-svelte-session-${new Date().toISOString().slice(0, 19)}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {}
	}

	function triggerImport() {
		fileInput?.click();
	}

	function handleImportFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const json = JSON.parse(String(reader.result || '{}')) as Record<string, unknown>;
				const version = json.__version;
				if (typeof version !== 'number' || version !== PERSIST_VERSION) {
					return; // ignore invalid/mismatched dumps
				}
				// summarize counts if available
				const keys = allPersistKeys(PERSIST_VERSION);
				const historyKey = keys.find((k) => k.includes(':history:')) || '';
				const chatKey = keys.find((k) => k.includes(':chat:')) || '';
				const histRaw = (json as any)[historyKey];
				const chatRaw = (json as any)[chatKey];
				const versionsCount = Array.isArray(histRaw?.versions) ? histRaw.versions.length : 0;
				const messagesCount = Array.isArray(chatRaw?.messages) ? chatRaw.messages.length : 0;

				for (const key of keys) {
					if (Object.prototype.hasOwnProperty.call(json, key)) {
						const value = json[key];
						if (typeof value !== 'undefined') {
							localStorage.setItem(key, JSON.stringify(value));
						}
					} else {
						localStorage.removeItem(key);
					}
				}
				try {
					alert(
						`Imported session: ${versionsCount} versions, ${messagesCount} messages. Reloading…`
					);
				} catch {}
				location.reload();
			} catch {
				// ignore parse errors
			} finally {
				input.value = '';
			}
		};
		reader.readAsText(file);
	}

	function clearSession() {
		if (!confirm('Clear session? This will remove chat, history and UI state.')) return;
		try {
			for (const k of allPersistKeys(PERSIST_VERSION)) localStorage.removeItem(k);
			location.reload();
		} catch {}
	}

	function toggleSessionMenu() {
		showSessionMenu = !showSessionMenu;
	}
</script>

<header class="border-b bg-card px-6 py-4 flex items-center justify-between">
	<section class="flex items-center gap-4">
		<h1 class="text-2xl font-bold">AI Svelte Builder</h1>
		<span class="text-sm text-muted-foreground">v1.0.0</span>
	</section>
	<nav class="flex items-center gap-2">
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
		<Button
			variant={showMetrics ? 'default' : 'ghost'}
			size="sm"
			onclick={onToggleMetrics}
			aria-pressed={showMetrics ? 'true' : 'false'}>Metrics</Button
		>
		<div class="relative">
			<Button
				variant="ghost"
				size="sm"
				onclick={toggleSessionMenu}
				aria-haspopup="menu"
				aria-expanded={showSessionMenu ? 'true' : 'false'}>Session ▾</Button
			>
			{#if showSessionMenu}
				<button
					class="fixed inset-0 z-40"
					aria-label="Close session menu"
					onclick={() => (showSessionMenu = false)}
				></button>
				<div
					class="absolute right-0 z-50 mt-2 w-40 bg-card border rounded shadow-md p-1"
					role="menu"
				>
					<button
						class="w-full text-left px-3 py-1.5 hover:bg-muted rounded"
						role="menuitem"
						onclick={() => {
							exportSession();
							showSessionMenu = false;
						}}>Export</button
					>
					<button
						class="w-full text-left px-3 py-1.5 hover:bg-muted rounded"
						role="menuitem"
						onclick={() => {
							triggerImport();
							showSessionMenu = false;
						}}>Import</button
					>
					<button
						class="w-full text-left px-3 py-1.5 hover:bg-muted rounded"
						role="menuitem"
						onclick={() => {
							clearSession();
							showSessionMenu = false;
						}}>Clear</button
					>
				</div>
			{/if}
		</div>
	</nav>
</header>

<input
	bind:this={fileInput}
	type="file"
	accept="application/json"
	class="hidden"
	onchange={handleImportFile}
/>

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
							{#if idx === $history.currentIndex}
								<button
									class="w-full text-left border rounded p-2 bg-muted border-primary cursor-default"
									disabled
									aria-current="true"
									aria-label="Current version"
								>
									<div class="text-xs text-muted-foreground flex items-center gap-2">
										<span>{new Date(v.timestamp).toLocaleTimeString()}</span>
										<span class="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary"
											>current</span
										>
									</div>
									<div class="text-sm line-clamp-2">{v.prompt}</div>
								</button>
							{:else}
								<button
									class="w-full text-left border rounded p-2 hover:bg-muted"
									onclick={() => selectVersion(idx)}
									aria-current="false"
									aria-label="Revert to version"
								>
									<div class="text-xs text-muted-foreground flex items-center gap-2">
										<span>{new Date(v.timestamp).toLocaleTimeString()}</span>
									</div>
									<div class="text-sm line-clamp-2">{v.prompt}</div>
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</aside>
	</div>
{/if}

<ApiKeySettings isOpen={showApiKeySettings} onClose={closeApiKeySettings} />
