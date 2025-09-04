<script lang="ts">
	import { onMount } from 'svelte';
	import { Splitpanes, Pane } from 'svelte-splitpanes';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';

	import ChatInterface from '$lib/modules/chat/ChatInterface.svelte';
	import PreviewPanel from '$lib/modules/editor/PreviewPanel.svelte';
	import AppHeader from '$lib/modules/workspace/AppHeader.svelte';
	import CodePanel from '$lib/modules/workspace/CodePanel.svelte';

	import { LAYOUT } from '$lib/shared/constants';
	import { createPersistor } from '$lib/shared/utils';
	import { LayoutState, CompilationState } from '$lib/modules/workspace/state';
	import { createWorkspaceHandlers } from '$lib/modules/workspace/composables/createWorkspaceHandlers';
	import {
		historyCanUndo,
		historyCanRedo,
		historyCurrentVersion
	} from '$lib/core/stores/historyScoped';
	import { t } from '$lib/shared/i18n';
	import { chatSessionsStore } from '$lib/core/stores/chatSessions';
	import { chatStore } from '$lib/core/stores/chat';
	import { MessageSquare } from '@lucide/svelte';
	import ChatSessionsPanel from '$lib/modules/chat/ChatSessionsPanel.svelte';

	import ChatsList from '$lib/modules/chat/ChatsList.svelte';
	import WelcomeScreen from '$lib/modules/editor/WelcomeScreen.svelte';
	import WireframeLoader from '$lib/shared/components/WireframeLoader.svelte';

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
	const chat = chatStore;
	let isWelcome = $state(false);
	// Determine mode based on URL
	let welcomeMode = $state(false);
	$effect(() => {
		// If we have a chat in URL, never show welcome
		const urlChatId = $page.url.searchParams.get('chat');
		if (urlChatId) {
			isWelcome = false;
			welcomeMode = false;
			return;
		}

		// No chat in URL - check if we should show welcome
		if (welcomeMode) {
			const noMessages = $chat.messages.length === 0;
			const sessions = $chatSessionsStore;
			const noSessionsWithMessages =
				!sessions.currentId || (sessions.messagesById[sessions.currentId] || []).length === 0;
			isWelcome = noMessages && noSessionsWithMessages;
		} else {
			isWelcome = false;
		}
	});

	// Initialize handlers
	const {
		handleCodeGenerated: _handleCodeGenerated,
		copyCode,
		handleUndo,
		handleRedo,
		handleSelectVersion,
		handleCodePanesResize,
		initializeWorkspace,
		loadCurrentVersion
	} = createWorkspaceHandlers({ compilation, layout });

	// Wrap handleCodeGenerated to exit welcome mode when generating
	const handleCodeGenerated = (...args: Parameters<typeof _handleCodeGenerated>) => {
		welcomeMode = false;
		return _handleCodeGenerated(...args);
	};

	// Helper to update URL when session changes programmatically
	function updateUrlForSession(sessionId: string | null) {
		if (sessionId && !welcomeMode) {
			goto(`?chat=${sessionId}`, { replaceState: true, noScroll: true, keepFocus: true });
		} else if (!sessionId) {
			goto('/', { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

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
	let isBootstrapped = $state(false);
	let isMobile = $state(false);
	// Smooth fade between welcome and app sections
	let bodyFade = $state<'in' | 'out'>('in');
	$effect(() => {
		// Re-run only when welcome toggles
		const _w = isWelcome;
		bodyFade = 'out';
		setTimeout(() => (bodyFade = 'in'), 150);
	});

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

	// Simple URL handling on mount only to avoid circular effects
	function handleUrlNavigation() {
		console.log('handleUrlNavigation called with URL:', $page.url.href);
		const urlChatId = $page.url.searchParams.get('chat');

		if (!urlChatId && $page.url.pathname === '/') {
			// No chat ID, show welcome
			welcomeMode = true;
			chatStore.clearMessages();
			compilation.clearAll();
			compilation.setLoading(t('loading.welcomeLong'));
		} else if (urlChatId) {
			// Chat ID in URL, load that session
			const sessions = get(chatSessionsStore);
			console.log('Checking session existence:', {
				urlChatId,
				availableSessions: sessions.sessions.map(s => s.id),
				totalSessions: sessions.sessions.length
			});
			
			const sessionExists = (sessions.sessions as Array<{ id: string }>).some(
				(s) => s.id === urlChatId
			);
			
			if (sessionExists) {
				console.log('Session found, loading:', urlChatId);
				welcomeMode = false;
				chatSessionsStore.setCurrent(urlChatId);
				const messages = sessions.messagesById[urlChatId] || [];
				chatStore.setMessages(messages);
			} else {
				// Invalid chat ID, redirect to welcome only if not already at root
				console.log('Invalid chat ID, redirecting to welcome:', {
					urlChatId,
					currentPath: $page.url.pathname,
					searchParams: $page.url.searchParams.toString()
				});
				if ($page.url.pathname !== '/' || $page.url.searchParams.toString()) {
					goto('/', { replaceState: true });
				}
				welcomeMode = true;
			}
		}
	}

	// Initialize workspace on mount
	onMount(() => {
		// Track breakpoint so we mount only one layout (mobile OR desktop)
		try {
			const mql = window.matchMedia('(max-width: 640px)');
			const apply = () => (isMobile = mql.matches);
			apply();
			mql.addEventListener('change', apply);
		} catch {}

		// One-time UI state restore
		const restored = uiPersist.load({
			showCode: false,
			preview: LAYOUT.PREVIEW_SIZE_DEFAULT,
			code: LAYOUT.CODE_SIZE_DEFAULT
		});
		layout.restore(restored);
		uiLoaded = true;

		// Handle initial URL navigation
		handleUrlNavigation();

		// Initialize workspace
		initializeWorkspace();

		// Do not auto-open or auto-load any chat; just show welcome preview if empty
		const chatState = chatStore.getState();
		if (!chatState.messages.length) {
			compilation.setLoading(t('loading.welcomeLong'));
		}
		// after initializing state, allow rendering conditionally
		isBootstrapped = true;
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

	// Anchor rect for popover placement below the Chats button
	let chatsBtnEl = $state<HTMLButtonElement | null>(null);
	function getChatsAnchorRect() {
		const el = chatsBtnEl;
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return {
			top: r.top + window.scrollY,
			left: r.left + window.scrollX,
			width: r.width,
			height: r.height
		};
	}
</script>

<main class="h-screen bg-background flex flex-col">
	{#if !isBootstrapped}
		<div class="flex-1 grid place-content-center">
			<div class="flex items-center justify-center">
				<WireframeLoader width={94} height={60} />
			</div>
		</div>
	{:else}
		<div class={`transition-opacity duration-500 ${bodyFade === 'in' ? 'opacity-100' : 'opacity-0'}`}>
			<AppHeader
				showCode={$showCode}
				onToggleCode={handleToggleCode}
				canUndo={$historyCanUndo}
				canRedo={$historyCanRedo}
				onUndo={handleUndo}
				onRedo={handleRedo}
				onSelectVersion={handleSelectVersion}
				onOpenChats={() => (showSessionsOnLoad = true)}
				onNewChat={() => {
					welcomeMode = true;
					compilation.clearAll();
					compilation.setLoading(t('loading.welcomeLong'));
					updateUrlForSession(null);
				}}
				{isWelcome}
				bind:chatsBtnEl
			/>
		</div>

		{#if showSessionsOnLoad}
			<ChatSessionsPanel
				onClose={closeSessionsPanel}
				onNewChat={() => {
					welcomeMode = true;
					compilation.clearAll();
					compilation.setLoading(t('loading.welcomeLong'));
					updateUrlForSession(null);
				}}
				onOpenSession={(sessionId) => {
					welcomeMode = false;
					if (sessionId) {
						updateUrlForSession(sessionId);
					}
				}}
				mode="popover"
				anchorRect={getChatsAnchorRect()}
			/>
		{/if}

		{#if isWelcome}
			<!-- Welcome layout: fully centered block + input -->
			<div
				class={`flex-1 min-h-0 grid place-content-center p-4 transition-opacity duration-500 ${bodyFade === 'in' ? 'opacity-100' : 'opacity-0'}`}
			>
				<div class="max-w-3xl w-[92vw] sm:w-[80vw] md:w-[60vw] lg:w-[48rem] -translate-y-[10vh]">
					<WelcomeScreen />

					<ChatInterface
						onCodeGenerated={handleCodeGenerated}
						onStartGenerating={() => {
							console.log('Starting generation from welcome mode');
							welcomeMode = false;
							// Small delay to ensure welcome mode change is processed
							setTimeout(() => {
								compilation.setLoading(t('loading.default'));
							}, 0);
						}}
						showMessages={false}
						inlineInput={true}
					/>
				</div>
			</div>
		{:else if isMobile}
			<!-- Mobile layout: only one PreviewPanel mounted -->
			<div
				class={`flex-1 min-h-0 flex flex-col relative transition-opacity duration-500 ${bodyFade === 'in' ? 'opacity-100' : 'opacity-0'}`}
			>
				<section class="absolute inset-0 p-4 pt-0 overflow-y-auto pb-64">
					<PreviewPanel
						class="h-full"
						previewHtml={$previewHtml}
						compiledJs={$compiledJs}
						compiledCss={$compiledCss}
						loadingMessage={$loadingMessage}
					/>
				</section>

				{#if !chatHidden}
					<div class="fixed bottom-0 left-0 right-0 z-30">
						<ChatsList
							collapsed={chatCollapsed}
							mode={chatMode}
							on:openSessions={() => (showSessionsOnLoad = true)}
							on:collapse={collapseChatPanel}
							on:expand={expandChatPanel}
							on:fullscreen={setChatFullscreen}
							on:hide={hideChat}
						/>

						{#if chatMode !== 'fullscreen'}
							<section class="bg-card border-t">
								<ChatInterface
									onCodeGenerated={handleCodeGenerated}
									onStartGenerating={() => {
										welcomeMode = false;
										compilation.setLoading(t('loading.default'));
									}}
									showMessages={false}
								/>
							</section>
						{/if}
					</div>
				{/if}

				{#if chatHidden}
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
			</div>
		{:else}
			<!-- Desktop layout: only one PreviewPanel mounted -->
			<div
				class={`flex-1 min-h-0 transition-opacity duration-500 ${bodyFade === 'in' ? 'opacity-100' : 'opacity-0'}`}
			>
				<Splitpanes class="flex-1 min-h-0" horizontal={false}>
					<Pane
						minSize={LAYOUT.CHAT_SIZE_MIN}
						size={LAYOUT.CHAT_SIZE_DEFAULT}
						maxSize={LAYOUT.CHAT_SIZE_MAX}
						class="bg-card flex flex-col"
					>
						<ChatInterface
							onCodeGenerated={handleCodeGenerated}
							onStartGenerating={() => {
								welcomeMode = false;
								compilation.setLoading(t('loading.default'));
							}}
						/>
					</Pane>

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
		{/if}
	{/if}
</main>

<style>
	:global(html, body) {
		overflow: hidden;
		height: 100%;
	}
</style>
