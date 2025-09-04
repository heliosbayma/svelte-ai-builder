<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import ApiKeySettings from '$lib/modules/settings/ApiKeySettings.svelte';
	import ApiKeysRequiredModal from '$lib/modules/settings/ApiKeysRequiredModal.svelte';
	import HistoryPanel from './HistoryPanel.svelte';
	import SessionMenu from './SessionMenu.svelte';
	import { Undo2, Redo2, History, Code, MessageSquare } from '@lucide/svelte';
	import { Plus } from '@lucide/svelte';
	import { chatSessionsStore } from '$lib/core/stores/chatSessions';
	import { chatStore } from '$lib/core/stores/chat';
	import { historyStore } from '$lib/core/stores/historyScoped';
	import {
		isApiKeysOpen,
		isApiKeysRequiredOpen,
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
		onOpenChats?: () => void;
		onNewChat?: () => void;
		isWelcome?: boolean;
		chatsBtnEl?: HTMLButtonElement | null;
	}

	let {
		showCode,
		onToggleCode,
		canUndo = false,
		canRedo = false,
		onUndo,
		onRedo,
		onSelectVersion,
		onOpenChats,
		onNewChat,
		isWelcome = false,
		chatsBtnEl = $bindable<HTMLButtonElement | null>(null)
	}: Props = $props();

	// Modal state is now managed globally via modalStore

	function openApiKeySettings() {
		modalStore.open('apiKeys');
	}

	function closeApiKeySettings() {
		modalStore.close();
	}

	function openApiKeysFromRequired() {
		modalStore.open('apiKeys');
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

	function createNewChat() {
		const id = chatSessionsStore.createSession('New Chat');
		chatSessionsStore.setCurrent(id);
		chatStore.replaceMessages([]);
		historyStore.setCurrentSession(id);
		onNewChat?.();
	}
</script>

<header class="flex items-center justify-between h-11 sm:h-12 px-3 sm:px-4">
	<section class="flex items-center gap-2">
		<h1 class="flex items-center leading-none">
			<button
				class="inline-flex items-center h-8 text-sm sm:text-base font-semibold tracking-tight cursor-pointer select-none bg-transparent border-0 p-0 m-0"
				type="button"
				onclick={createNewChat}
				title={t('header.titleTooltip')}
				aria-label={t('header.title')}
			>
				{t('header.title')}
			</button>
		</h1>
		<div class="w-px h-5 bg-border ml-3 mr-2"></div>
		<div class="flex items-center gap-1.5">
			<Button
				variant="ghost"
				size="sm"
				bind:ref={chatsBtnEl}
				onclick={onOpenChats}
				aria-label="Chats"
				title="Chats"
				type="button"
			>
				<MessageSquare class="size-4" />
				<span class="ml-1 text-xs hidden sm:inline">Chats</span>
			</Button>
			{#if !isWelcome}
				<Button
					variant="ghost"
					size="sm"
					onclick={createNewChat}
					aria-label="New Chat"
					title="New Chat"
					type="button"
				>
					<Plus class="size-4" />
					<span class="ml-1 text-xs hidden sm:inline">New</span>
				</Button>
			{/if}
		</div>
	</section>
	<nav class="flex items-center gap-2.5">
		{#if !isWelcome}
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

			<div class="w-px h-5 bg-border"></div>

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
		{/if}

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
<ApiKeysRequiredModal
	isOpen={$isApiKeysRequiredOpen}
	onClose={() => modalStore.close()}
	onOpenSettings={openApiKeysFromRequired}
/>
