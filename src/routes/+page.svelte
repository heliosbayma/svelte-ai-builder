<script lang="ts">
	import { onMount } from 'svelte';
	import { Splitpanes, Pane } from 'svelte-splitpanes';
	import { get as getStore } from 'svelte/store';

	import ChatInterface from '$lib/modules/chat/ChatInterface.svelte';
	import PreviewPanel from '$lib/modules/editor/PreviewPanel.svelte';
	import AppHeader from '$lib/modules/workspace/AppHeader.svelte';
	import CodePanel from '$lib/modules/workspace/CodePanel.svelte';

	import { LAYOUT } from '$lib/shared/constants';
	import { createPersistor } from '$lib/shared/utils';
	import { LayoutState, CompilationState } from '$lib/modules/workspace/state';
	import { createWorkspaceHandlers } from '$lib/modules/workspace/composables/createWorkspaceHandlers';
	import { historyCanUndo, historyCanRedo, historyCurrentVersion } from '$lib/core/stores/history';
	import { t } from '$lib/shared/i18n';
	import { chatSessionsStore } from '$lib/core/stores/chatSessions';
	import { chatStore } from '$lib/core/stores/chat';
	import { Plus, MessageSquare } from '@lucide/svelte';
	import ChatSessionsPanel from '$lib/modules/chat/ChatSessionsPanel.svelte';

	import { ChevronUp, ChevronDown, Maximize2, Minimize2, X } from '@lucide/svelte';
	import { Button } from '$lib/shared/ui/button';
	import ChatsList from '$lib/modules/chat/ChatsList.svelte';

	// Initialize state management
	const layout = new LayoutState();
	const compilation = new CompilationState();

	// Bind nested stores to top-level for $ auto-subscription
	const showCode = layout.showCode;
	const savedPreviewSize = layout.savedPreviewSize;
	const savedCodeSize = layout.savedCodeSize;

	const previewHtml = compilation.previewHtml;
	const compiledJs = compilation.compiledJs;
	const compiledCss = compilation.compiledCss;
	const loadingMessage = compilation.loadingMessage;
	const currentCode = compilation.currentCode;

	// Initialize handlers
	const {
		handleCodeGenerated,
		copyCode,
		handleUndo,
		handleRedo,
		handleSelectVersion,
		handleCodePanesResize,
		initializeWorkspace,
		loadCurrentVersion
	} = createWorkspaceHandlers({ compilation, layout });

	// Consistent local handler for toggling code panel
	function handleToggleCode() {
		layout.toggleCode();
	}

	// UI persistence setup
	const uiPersist = createPersistor<{ showCode: boolean; preview: number; code: number }>({
		key: 'ui',
		version: 1,
		debounceMs: 150
	});

	// One-time restore of UI state
	let uiLoaded = false;

	// Save UI state after initial restore
	$effect(() => {
		if (!uiLoaded) return;
		// Reference inner stores so the effect reacts to changes
		uiPersist.save({
			showCode: $showCode,
			preview: $savedPreviewSize,
			code: $savedCodeSize
		});
	});

	// Watch for history changes to reload (side effect)
	$effect(() => {
		const current = $historyCurrentVersion;
		if (current && current.code !== $currentCode) {
			loadCurrentVersion();
		}
	});

	// Keyboard shortcuts for undo/redo
	$effect(() => {
		function handleKeydown(event: KeyboardEvent) {
			const isMetaKey = event.metaKey || event.ctrlKey;
			const isZKey = event.key === 'z';

			if (isMetaKey && isZKey) {
				event.preventDefault();
				if (event.shiftKey) {
					handleRedo();
				} else {
					handleUndo();
				}
			}
		}

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	// Initialize workspace on mount
	onMount(() => {
		// One-time UI state restore
		const restored = uiPersist.load({
			showCode: false,
			preview: LAYOUT.PREVIEW_SIZE_DEFAULT,
			code: LAYOUT.CODE_SIZE_DEFAULT
		});
		layout.restore(restored);
		uiLoaded = true;

		// Initialize workspace
		initializeWorkspace();

		// Do not auto-open or auto-load any chat; just show welcome preview if empty
		const chatState = chatStore.getState();
		if (!chatState.messages.length) {
			compilation.setLoading(t('loading.welcomeLong'));
		}
	});

	// Mobile chat visibility / sizing state
	let chatHidden = $state(false);
	let chatMode = $state<'default' | 'expanded' | 'fullscreen'>('default');
	let chatCollapsed = $state(false); // Changed to false to show chat by default

	function setChatDefault() {
		chatMode = 'default';
	}
	function setChatExpanded() {
		chatMode = 'expanded';
		chatCollapsed = false;
	}
	function setChatFullscreen() {
		chatMode = 'fullscreen';
	}
	function hideChat() {
		chatHidden = true;
	}
	function showChat() {
		chatHidden = false;
		if (chatMode === 'fullscreen') chatMode = 'default';
	}
	function collapseChatPanel() {
		chatCollapsed = true;
		chatMode = 'default';
	}
	function expandChatPanel() {
		chatCollapsed = false;
		chatMode = 'expanded'; // Set to expanded mode to reach middle of screen
	}

	// Sessions panel visibility (manual open)
	let showSessionsOnLoad = $state(false);
	function closeSessionsPanel() {
		showSessionsOnLoad = false;
	}
</script>

<main class="h-screen bg-background flex flex-col">
	<AppHeader
		showCode={$showCode}
		onToggleCode={handleToggleCode}
		canUndo={$historyCanUndo}
		canRedo={$historyCanRedo}
		onUndo={handleUndo}
		onRedo={handleRedo}
		onSelectVersion={handleSelectVersion}
	/>

	<!-- {#if $loadingMessage}
		<div
			class="fixed left-3 bottom-3 z-40 bg-muted/80 text-foreground text-xs px-3 py-1 rounded shadow border"
			aria-live="polite"
		>
			{$loadingMessage}
		</div>
	{/if} -->

	<!-- Mobile (≤ sm): simple stacked layout with preview then chat -->
	<div class="flex-1 min-h-0 flex flex-col sm:hidden">
		{#if showSessionsOnLoad}
			<ChatSessionsPanel onClose={closeSessionsPanel} />
		{/if}
		<section class="flex-1 min-h-0 p-4 pt-0">
			<PreviewPanel
				class="h-full"
				previewHtml={$previewHtml}
				compiledJs={$compiledJs}
				compiledCss={$compiledCss}
				loadingMessage={$loadingMessage}
			/>
		</section>

		{#if !chatHidden}
			<ChatsList
				collapsed={chatCollapsed}
				mode={chatMode}
				on:openSessions={() => (showSessionsOnLoad = true)}
				on:collapse={collapseChatPanel}
				on:expand={expandChatPanel}
				on:fullscreen={setChatFullscreen}
				on:hide={hideChat}
			/>

			<!-- Chat input section - always visible, separate from drawer -->
			{#if chatMode !== 'fullscreen'}
				<section class="bg-card border-t">
					<ChatInterface
						onCodeGenerated={handleCodeGenerated}
						onStartGenerating={() => {
							compilation.setLoading(t('loading.default'));
						}}
						showMessages={false}
					/>
				</section>
			{/if}
		{/if}

		{#if chatHidden}
			<!-- Floating reopen button -->
			<button
				class="fixed right-3 bottom-3 z-40 rounded-full bg-primary text-primary-foreground shadow px-3 py-2 flex items-center gap-2 cursor-pointer"
				onclick={showChat}
				aria-label="Open chat"
				title="Open chat"
				type="button"
			>
				<MessageSquare class="size-4" />
				<span class="text-xs">Chat</span>
			</button>
		{/if}

		<!-- Conversations fullscreen handled inside ChatsList component -->

		{#if $showCode}
			<!-- Full-screen code overlay on mobile -->
			<div class="fixed inset-0 z-50 bg-background sm:hidden">
				<div class="h-full flex flex-col">
					<div class="flex-1 overflow-hidden">
						<CodePanel {layout} {compilation} onCopy={copyCode} />
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Desktop (≥ sm): resizable split layout -->
	<div class="hidden sm:flex flex-1 min-h-0">
		<Splitpanes class="flex-1 min-h-0" horizontal={false}>
			<!-- Chat Panel -->
			<Pane
				minSize={LAYOUT.CHAT_SIZE_MIN}
				size={LAYOUT.CHAT_SIZE_DEFAULT}
				maxSize={LAYOUT.CHAT_SIZE_MAX}
				class="bg-card"
			>
				<ChatInterface
					onCodeGenerated={handleCodeGenerated}
					onStartGenerating={() => {
						compilation.setLoading(t('loading.default'));
					}}
				/>
			</Pane>

			<!-- Content Panel -->
			<Pane minSize={LAYOUT.CONTENT_MIN_SIZE} class="flex">
				<Splitpanes horizontal={false} on:resize={handleCodePanesResize}>
					<Pane minSize={30} size={$showCode ? $savedPreviewSize : 100} class="bg-background">
						<div class="h-full flex flex-col">
							<div class="flex-1 p-4 pt-0">
								<PreviewPanel
									class="h-full"
									previewHtml={$previewHtml}
									compiledJs={$compiledJs}
									compiledCss={$compiledCss}
									loadingMessage={$loadingMessage}
								/>
							</div>
						</div>
					</Pane>
					{#if $showCode}
						<Pane
							minSize={LAYOUT.PANE_MIN_SIZE}
							size={$savedCodeSize}
							class="bg-background rounded-lg border mr-4"
						>
							<div class="h-full min-h-0 flex flex-col">
								<div class="flex-1 min-h-0 pt-0">
									<CodePanel {layout} {compilation} onCopy={copyCode} />
								</div>
							</div>
						</Pane>
					{/if}
				</Splitpanes>
			</Pane>
		</Splitpanes>
	</div>
</main>

<style>
	:global(html, body) {
		overflow: hidden;
		height: 100%;
	}
</style>
