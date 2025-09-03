<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import ApiKeySettings from '$lib/modules/settings/ApiKeySettings.svelte';
	import HistoryPanel from './HistoryPanel.svelte';
	import SessionMenu from './SessionMenu.svelte';
	import { Undo2, Redo2, History, Code } from '@lucide/svelte';
	import {
		isApiKeysOpen,
		isHistoryOpen,
		isSessionMenuOpen,
		modalStore
	} from '$lib/core/stores/modals';
	import { t } from '$lib/shared/i18n';

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
		<h1 class="text-2xl font-bold">{t('header.title')}</h1>
	</section>
	<nav class="flex items-center gap-3">
		<div class="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				disabled={!canUndo}
				onclick={onUndo}
				aria-label={t('a11y.undoLastChange')}
				title={t('header.undoTooltip')}
			>
				<Undo2 class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				disabled={!canRedo}
				onclick={onRedo}
				aria-label={t('a11y.redoLastChange')}
				title={t('header.redoTooltip')}
			>
				<Redo2 class="size-4" />
			</Button>
		</div>

		<div class="w-px h-6 bg-border"></div>

		<Button
			variant="ghost"
			size="sm"
			onclick={toggleHistory}
			aria-label={t('a11y.openHistory')}
			title={t('header.historyTooltip')}
		>
			<History class="size-4" />
		</Button>

		<Button
			variant={showCode ? 'default' : 'ghost'}
			size="sm"
			onclick={onToggleCode}
			aria-label={showCode ? t('a11y.hideCode') : t('a11y.showCode')}
			title={showCode ? t('header.hideCodeTooltip') : t('header.codeTooltip')}
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

<HistoryPanel isOpen={$isHistoryOpen} onClose={closeHistory} onSelectVersion={selectVersion} />

<ApiKeySettings isOpen={$isApiKeysOpen} onClose={closeApiKeySettings} />
