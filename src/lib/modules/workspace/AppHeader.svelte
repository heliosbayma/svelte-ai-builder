<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import ApiKeySettings from '$lib/modules/settings/ApiKeySettings.svelte';
	import HistoryPanel from './HistoryPanel.svelte';
	import SessionMenu from './SessionMenu.svelte';
	import { Undo2, Redo2, History, Code } from '@lucide/svelte';
	import { isApiKeysOpen, isHistoryOpen, isSessionMenuOpen, modalStore } from '$lib/core/stores/modals';

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
		onSelectVersion?: (index: number) => void;
	}

	let {
		showCode,
		onToggleCode,
		canUndo = false,
		canRedo = false,
		onUndo,
		onRedo,
		onSelectVersion
	}: Props = $props();

	// Modal state is now managed globally via modalStore

	function openApiKeySettings() {
		modalStore.open('apiKeys');
	}

	function closeApiKeySettings() {
		modalStore.close();
	}

	function toggleHistory() {
		modalStore.toggle('history');
	}

	function closeHistory() {
		modalStore.close();
	}

	function selectVersion(index: number) {
		onSelectVersion?.(index);
	}

	function toggleSessionMenu() {
		modalStore.toggle('sessionMenu');
	}

	function closeSessionMenu() {
		modalStore.close();
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

		<SessionMenu
			isOpen={$isSessionMenuOpen}
			onToggle={toggleSessionMenu}
			onClose={closeSessionMenu}
			onOpenApiKeys={openApiKeySettings}
		/>
	</nav>
</header>

<HistoryPanel
	isOpen={$isHistoryOpen}
	onClose={closeHistory}
	onSelectVersion={selectVersion}
/>

<ApiKeySettings isOpen={$isApiKeysOpen} onClose={closeApiKeySettings} />
