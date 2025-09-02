<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ApiKeySettings from './ApiKeySettings.svelte';
	import { historyStore } from '$lib/stores/history';
	import { createEventDispatcher } from 'svelte';
	import { allPersistKeys, PERSIST_VERSION } from '$lib/utils';
	import { apiKeyStore } from '$lib/stores/apiKeys';
	import {
		Undo2,
		Redo2,
		ChevronDown,
		History,
		Code,
		Settings,
		Download,
		Upload,
		Key,
		Palette,
		Trash2,
		Bomb,
		Edit3,
		X
	} from '@lucide/svelte';
	const history = historyStore;

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
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
		} catch {
			// Ignore errors
		}
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
				const keys = allPersistKeys(PERSIST_VERSION);
				const historyKey = keys.find((k) => k.includes(':history:')) || '';
				const chatKey = keys.find((k) => k.includes(':chat:')) || '';
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const histRaw = (json as any)[historyKey];
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
				} catch {
			// Ignore errors
		}
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
		} catch {
			// Ignore errors
		}
	}

	function toggleSessionMenu() {
		showSessionMenu = !showSessionMenu;
	}
</script>

<header class="border-b bg-card px-6 py-4 flex items-center justify-between">
	<section class="flex items-center gap-4">
		<h1 class="text-2xl font-bold">AI Svelte Builder</h1>
	</section>
	<nav class="flex items-center gap-3">
		<div class="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				disabled={!canUndo}
				onclick={onUndo}
				aria-label="Undo last change"
				title="Undo (⌘Z)"
			>
				<Undo2 class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={!canRedo}
				onclick={onRedo}
				aria-label="Redo last undone change"
				title="Redo (⌘⇧Z)"
			>
				<Redo2 class="size-4" />
			</Button>
		</div>

		<div class="w-px h-6 bg-border"></div>

		<Button
			variant="ghost"
			size="sm"
			onclick={toggleHistory}
			aria-label="Open history"
			title="History"
		>
			<History class="size-4" />
		</Button>

		<Button
			variant={showCode ? 'default' : 'ghost'}
			size="sm"
			onclick={onToggleCode}
			aria-label={showCode ? 'Hide code panel' : 'Show code panel'}
			title={showCode ? 'Hide Code' : 'Show Code'}
		>
			<Code class="size-4" />
		</Button>

		<div class="relative">
			<Button
				variant="ghost"
				size="sm"
				onclick={toggleSessionMenu}
				aria-haspopup="menu"
				aria-expanded={showSessionMenu ? 'true' : 'false'}
				aria-label="Session menu"
				title="Session"
			>
				<Settings class="size-4" />
				<ChevronDown class="size-3 opacity-60" />
			</Button>
			{#if showSessionMenu}
				<button
					class="fixed inset-0 z-40"
					aria-label="Close session menu"
					onclick={() => (showSessionMenu = false)}
				></button>
				<div
					class="absolute right-0 z-50 mt-2 w-48 bg-popover border rounded-lg shadow-lg p-1"
					role="menu"
				>
					<div class="p-1 space-y-0.5">
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
							role="menuitem"
							onclick={() => {
								exportSession();
								showSessionMenu = false;
							}}
						>
							<Download class="size-4 text-muted-foreground" />
							Export Session
						</button>
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
							role="menuitem"
							onclick={() => {
								triggerImport();
								showSessionMenu = false;
							}}
						>
							<Upload class="size-4 text-muted-foreground" />
							Import Session
						</button>
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
							role="menuitem"
							onclick={() => {
								openApiKeySettings();
								showSessionMenu = false;
							}}
						>
							<Key class="size-4 text-muted-foreground" />
							API Keys
						</button>
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
							role="menuitem"
							onclick={() => {
								const root = document.documentElement;
								const nowDark = !root.classList.contains('dark');
								root.classList.toggle('dark', nowDark);
								try {
									localStorage.setItem('theme', nowDark ? 'dark' : 'light');
								} catch {
			// Ignore errors
		}
								showSessionMenu = false;
							}}
						>
							<Palette class="size-4 text-muted-foreground" />
							Toggle Theme
						</button>
					</div>

					<div class="border-t my-1"></div>

					<div class="p-1 space-y-0.5">
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3 text-destructive hover:text-destructive"
							role="menuitem"
							onclick={() => {
								if (confirm('Clear API keys from this browser?')) apiKeyStore.clear();
								showSessionMenu = false;
							}}
						>
							<Trash2 class="size-4 opacity-70" />
							Clear API Keys
						</button>
						<button
							class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3 text-destructive hover:text-destructive"
							role="menuitem"
							onclick={() => {
								clearSession();
								showSessionMenu = false;
							}}
						>
							<Bomb class="size-4 opacity-70" />
							Clear Session
						</button>
					</div>
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
	<!-- history side drawer -->
	<div class="fixed inset-0 z-50">
		<button class="absolute inset-0 bg-black/30" onclick={toggleHistory} aria-label="Close history"
		></button>
		<aside
			class="absolute right-0 top-0 mt-[85px] mr-4 mb-4 h-[calc(100vh-101px)] w-[360px] bg-card border shadow-xl rounded-lg history-scrollbar overflow-auto"
		>
			<div class="p-4 border-b flex items-center justify-between">
				<h3 class="font-semibold">History</h3>
				<button
					onclick={toggleHistory}
					class="p-1 hover:bg-accent rounded transition-colors"
					aria-label="Close history"
					title="Close"
				>
					<X class="size-4" />
				</button>
			</div>
			<div class="p-4">
				{#if $history.versions.length === 0}
					<p class="text-sm text-muted-foreground">No versions yet.</p>
				{:else}
					<ul class="space-y-2">
						{#each $history.versions as v, idx (v.id)}
							<li>
								{#if idx === $history.currentIndex}
									<div
										class="w-full p-3 rounded-lg bg-accent/50 border border-primary/20"
										aria-current="true"
										aria-label="Current version"
									>
										<div class="flex items-center justify-between mb-2">
											<div class="text-xs text-muted-foreground">
												{new Date(v.timestamp).toLocaleTimeString()}
											</div>
											<span
												class="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
												>Current</span
											>
										</div>
										<div class="text-sm line-clamp-2">
											{#if v.label}
												<strong class="mr-1">{v.label}:</strong>
											{/if}
											{v.prompt}
										</div>
									</div>
								{:else}
									<button
										class="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
										onclick={() => selectVersion(idx)}
										aria-current="false"
										aria-label="Revert to version"
									>
										<div class="flex items-center justify-between mb-2">
											<div class="text-xs text-muted-foreground">
												{new Date(v.timestamp).toLocaleTimeString()}
											</div>
											<span
												class="p-1 hover:bg-accent rounded transition-colors cursor-pointer inline-flex items-center justify-center"
												onclick={(e) => {
													e.stopPropagation();
													const name = prompt('Label this version:', v.label || '');
													if (name != null)
														history.updateCurrentVersion({ label: name.trim() || undefined });
												}}
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														e.stopPropagation();
														const name = prompt('Label this version:', v.label || '');
														if (name != null)
															history.updateCurrentVersion({ label: name.trim() || undefined });
													}
												}}
												role="button"
												tabindex="0"
												aria-label="Rename version"
												title="Rename"
											>
												<Edit3 class="size-3" />
											</span>
										</div>
										<div class="text-sm line-clamp-2">
											{#if v.label}
												<strong class="mr-1">{v.label}:</strong>
											{/if}
											{v.prompt}
										</div>
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</aside>
	</div>
{/if}

<ApiKeySettings isOpen={showApiKeySettings} onClose={closeApiKeySettings} />

<style>
	.history-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.history-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.history-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.history-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Firefox scrollbar */
	.history-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
</style>
