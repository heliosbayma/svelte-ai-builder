<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { apiKeyStore } from '$lib/core/stores/apiKeys';
	import { allPersistKeys, PERSIST_VERSION } from '$lib/shared/utils';
	import {
		ChevronDown,
		Download,
		Upload,
		Key,
		Palette,
		Trash2,
		Bomb,
		Settings
	} from '@lucide/svelte';

	interface Props {
		isOpen: boolean;
		onToggle: () => void;
		onClose: () => void;
		onOpenApiKeys: () => void;
	}

	let { isOpen, onToggle, onClose, onOpenApiKeys }: Props = $props();
	let fileInput: HTMLInputElement | null = null;

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
				const histRaw = (json as Record<string, unknown>)[historyKey];
				const chatRaw = (json as Record<string, unknown>)[chatKey];

				function hasVersionsArray(obj: unknown): obj is { versions: unknown[] } {
					return (
						typeof obj === 'object' &&
						obj !== null &&
						'versions' in obj &&
						Array.isArray((obj as any).versions)
					);
				}

				function hasMessagesArray(obj: unknown): obj is { messages: unknown[] } {
					return (
						typeof obj === 'object' &&
						obj !== null &&
						'messages' in obj &&
						Array.isArray((obj as any).messages)
					);
				}

				const versionsCount = hasVersionsArray(histRaw) ? histRaw.versions.length : 0;
				const messagesCount = hasMessagesArray(chatRaw) ? chatRaw.messages.length : 0;

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

	function toggleTheme() {
		const root = document.documentElement;
		const nowDark = !root.classList.contains('dark');
		root.classList.toggle('dark', nowDark);
		try {
			localStorage.setItem('theme', nowDark ? 'dark' : 'light');
		} catch {
			// Ignore errors
		}
	}
</script>

<div class="relative">
	<Button
		variant="ghost"
		size="sm"
		onclick={onToggle}
		aria-haspopup="menu"
		aria-expanded={isOpen ? 'true' : 'false'}
		aria-label="Session menu"
		title="Session"
	>
		<Settings class="size-4" />
		<ChevronDown class="size-3 opacity-60" />
	</Button>
	{#if isOpen}
		<button class="fixed inset-0 z-40" aria-label="Close session menu" onclick={onClose}></button>
		<nav
			class="absolute right-0 z-50 mt-2 w-48 bg-popover border rounded-lg shadow-lg p-1"
			aria-label="Session menu"
		>
			<section class="p-1 space-y-0.5">
				<button
					class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
					role="menuitem"
					onclick={() => {
						exportSession();
						onClose();
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
						onClose();
					}}
				>
					<Upload class="size-4 text-muted-foreground" />
					Import Session
				</button>
				<button
					class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
					role="menuitem"
					onclick={() => {
						onOpenApiKeys();
						onClose();
					}}
				>
					<Key class="size-4 text-muted-foreground" />
					API Keys
				</button>
				<button
					class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
					role="menuitem"
					onclick={() => {
						toggleTheme();
						onClose();
					}}
				>
					<Palette class="size-4 text-muted-foreground" />
					Toggle Theme
				</button>
			</section>

			<div class="border-t my-1"></div>

			<div class="p-1 space-y-0.5">
				<button
					class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3 text-destructive hover:text-destructive"
					role="menuitem"
					onclick={() => {
						if (confirm('Clear API keys from this browser?')) apiKeyStore.clear();
						onClose();
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
						onClose();
					}}
				>
					<Bomb class="size-4 opacity-70" />
					Clear Session
				</button>
			</div>
		</nav>
	{/if}
</div>

<input
	bind:this={fileInput}
	type="file"
	accept="application/json"
	class="hidden"
	onchange={handleImportFile}
/>
