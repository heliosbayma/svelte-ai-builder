<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { apiKeyStore } from '$lib/core/stores/apiKeys';
	import { allPersistKeys, PERSIST_VERSION } from '$lib/shared/utils';
	import { success as toastSuccess } from '$lib/core/stores/toast';
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
	import { t } from '$lib/shared/i18n';

	interface Props {
		isOpen: boolean;
		onToggle: () => void;
		onClose: () => void;
		onOpenApiKeys: () => void;
	}

	let { isOpen, onToggle, onClose, onOpenApiKeys }: Props = $props();
	let fileInput: HTMLInputElement | null = null;
	let menuRef = $state<HTMLElement | null>(null);

	function getMenuItems(): HTMLButtonElement[] {
		return Array.from(menuRef?.querySelectorAll('button[role="menuitem"]') || []);
	}

	function focusItem(index: number) {
		const items = getMenuItems();
		if (items.length === 0) return;
		const i = Math.max(0, Math.min(index, items.length - 1));
		items[i].focus();
	}

	function handleMenuKeydown(e: KeyboardEvent) {
		const items = getMenuItems();
		if (items.length === 0) return;
		const currentIndex = items.findIndex((el) => el === document.activeElement);
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusItem(currentIndex >= 0 ? currentIndex + 1 : 0);
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusItem(currentIndex >= 0 ? currentIndex - 1 : 0);
			return;
		}
		if (e.key === 'Home') {
			e.preventDefault();
			focusItem(0);
			return;
		}
		if (e.key === 'End') {
			e.preventDefault();
			focusItem(items.length - 1);
			return;
		}
	}

	$effect(() => {
		if (isOpen) {
			requestAnimationFrame(() => focusItem(0));
		}
	});

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
				// Notify user and offer to reload with a toast
				try {
					toastSuccess(`Imported session: ${versionsCount} versions, ${messagesCount} messages.`, {
						title: 'Session Imported',
						action: { label: 'Reload', handler: () => location.reload() }
					});
				} catch {}
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
			bind:this={menuRef}
			class="absolute right-0 z-50 mt-2 w-48 bg-popover border rounded-lg shadow-lg p-1"
			aria-label="Session menu"
			role="presentation"
			onkeydown={handleMenuKeydown}
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
					{t('session.exportSession')}
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
					{t('session.importSession')}
				</button>
				<button
					class="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-3"
					role="menuitem"
					onclick={() => {
						onOpenApiKeys();
					}}
				>
					<Key class="size-4 text-muted-foreground" />
					{t('session.apiKeys')}
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
					{t('session.toggleTheme')}
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
					{t('session.clearApiKeys')}
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
					{t('session.clearSession')}
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
