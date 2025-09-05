<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/core/stores/chat';
	import { createPersistor } from '$lib/shared/utils';
	import { createChatHandlers } from '$lib/modules/chat/chatHandlers';
	import type { LLMProviderType } from '$lib/core/ai/services/llm';
	import ChatInput from './ChatInput.svelte';
	import ChatScrollArea from './ChatScrollArea.svelte';
	import { apiKeyStore, apiKeysReady } from '$lib/core/stores/apiKeys';
	import { modalStore } from '$lib/core/stores/modals';
	import { t } from '$lib/shared/i18n';
	import { chatSessionsStore } from '$lib/core/stores/chatSessions';
	import InlineNotice from '$lib/shared/components/InlineNotice.svelte';

	interface Props {
		onCodeGenerated?: (code: string, prompt: string, provider: LLMProviderType) => void;
		onStartGenerating?: () => void;
		showMessages?: boolean;
		inlineInput?: boolean;
	}

	let {
		onCodeGenerated,
		onStartGenerating,
		showMessages = true,
		inlineInput = false
	}: Props = $props();

	// Structured input state
	const input = (() => {
		let state = $state({
			currentPrompt: '',
			pendingPlan: '',
			modelInput: '',
			lastProvider: '' as 'openai' | 'anthropic' | 'gemini' | '',
			sendOnEnter: true
		});

		return {
			get currentPrompt() {
				return state.currentPrompt;
			},
			get pendingPlan() {
				return state.pendingPlan;
			},
			get modelInput() {
				return state.modelInput;
			},
			get lastProvider() {
				return state.lastProvider;
			},
			get sendOnEnter() {
				return state.sendOnEnter;
			},

			setPrompt: (prompt: string) => {
				state.currentPrompt = prompt;
			},
			setPendingPlan: (plan: string) => {
				state.pendingPlan = plan;
			},
			setModelInput: (input: string) => {
				state.modelInput = input;
			},
			setLastProvider: (provider: typeof state.lastProvider) => {
				state.lastProvider = provider;
			},
			toggleSendOnEnter: () => {
				state.sendOnEnter = !state.sendOnEnter;
			},

			clearPrompt: () => {
				state.currentPrompt = '';
			},
			clearAll: () => {
				state.currentPrompt = '';
				state.pendingPlan = '';
				state.modelInput = '';
			}
		};
	})();

	// Subscribe to chat store
	const chat = chatStore;

	// Detect a newly created session (no messages and untouched metadata)
	let isBrandNewSession = $state(false);
	$effect(() => {
		const state = $chatSessionsStore;
		const id = state.currentId;
		if (!id) {
			isBrandNewSession = false;
			return;
		}
		const meta = state.sessions.find((m) => m.id === id);
		const msgs = state.messagesById[id] || [];
		isBrandNewSession = !!meta && msgs.length === 0 && meta.createdAt === meta.updatedAt;
	});

	// Persist last-used model/provider (client-only)
	const chatUiPersist = createPersistor<{
		lastModel?: string;
		lastProvider?: 'openai' | 'anthropic' | 'gemini';
		sendOnEnter?: boolean;
	}>({
		key: 'ui-chat',
		version: 1,
		debounceMs: 200
	});

	// One-time restore on mount
	onMount(() => {
		const restored = chatUiPersist.load({});
		if (restored.lastModel) input.setModelInput(restored.lastModel);
		if (restored.lastProvider) input.setLastProvider(restored.lastProvider);
		if (typeof restored.sendOnEnter === 'boolean' && restored.sendOnEnter !== input.sendOnEnter) {
			input.toggleSendOnEnter();
		}
	});

	const { handleSubmit, handleBuildFromPlan } = createChatHandlers({
		onCodeGenerated,
		onStartGenerating,
		onProviderChange: (p) => {
			input.setLastProvider(p);
			if (p === 'openai' && input.modelInput && !input.modelInput.startsWith('gpt-')) {
				input.setModelInput('gpt-4o-mini');
			}
			savePersistence();
		}
	});
	// handlePlan available for future use

	let inputContainer: HTMLElement | null = null;

	function setInputHeightVar() {
		if (!inputContainer) return;
		const h = inputContainer.getBoundingClientRect().height;
		document.documentElement.style.setProperty('--chat-input-h', `${Math.round(h)}px`);
	}

	$effect(() => {
		setInputHeightVar();
		const ro = new ResizeObserver(() => setInputHeightVar());
		if (inputContainer) ro.observe(inputContainer);
		window.addEventListener('resize', setInputHeightVar);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', setInputHeightVar);
		};
	});

	function savePersistence() {
		chatUiPersist.save({
			lastModel: input.modelInput || undefined,
			lastProvider: input.lastProvider || undefined,
			sendOnEnter: input.sendOnEnter
		});
	}

	async function onSubmit() {
		if (!input.currentPrompt.trim()) return;

		const provider = await handleSubmit(input.currentPrompt, input.modelInput, input.lastProvider);
		if (provider) {
			input.setLastProvider(provider);
			if (provider === 'openai' && input.modelInput && !input.modelInput.startsWith('gpt-')) {
				input.setModelInput('gpt-4o-mini');
			}
			savePersistence();
			input.clearPrompt();
			const inputEl = document.querySelector('[data-chat-textarea]') as HTMLTextAreaElement | null;
			if (inputEl) {
				inputEl.style.height = 'auto';
				inputEl.focus();
			}
		}
	}

	async function onBuildFromPlan() {
		const provider = await handleBuildFromPlan(
			input.pendingPlan,
			input.modelInput,
			input.lastProvider
		);
		if (provider) {
			input.setLastProvider(provider);
			savePersistence();
		}
	}

	function handleUseCode(code: string) {
		// Find the message containing this code to get context
		const message = $chat.messages.find((m) => m.generatedCode === code);
		const userMessage = message
			? $chat.messages.find((m) => m.timestamp < message.timestamp && m.role === 'user')
			: null;
		const prompt = userMessage?.content || 'Use code from history';
		const provider = (message?.provider || 'openai') as LLMProviderType;
		onCodeGenerated?.(code, prompt, provider);
	}

	// Save messages back to current session whenever they change (avoid loops while generating)
	$effect(() => {
		if (!$chat.isGenerating) {
			chatSessionsStore.setMessagesForCurrent($chat.messages);
		}
	});

	function handleRefine(messageId: string) {
		const messageIndex = $chat.messages.findIndex((m) => m.id === messageId);
		if (messageIndex > 0) {
			const userMessage = $chat.messages[messageIndex - 1];
			if (userMessage.role === 'user') {
				input.setPrompt(`Refine this: ${userMessage.content}`);
			}
		}
	}

	function handleCancel() {
		chatStore.abortCurrent();
	}

	function handleSendOnEnterChange(checked: boolean) {
		if (checked !== input.sendOnEnter) {
			input.toggleSendOnEnter();
			savePersistence();
		}
	}

	function handleModelChange(model: string) {
		input.setModelInput(model);
		savePersistence();
	}

	function handlePromptChange(value: string) {
		input.setPrompt(value);
	}

	const hasAnyApiKey = () =>
		!!($apiKeyStore.openai || $apiKeyStore.anthropic || $apiKeyStore.gemini);
	function openApiKeys() {
		modalStore.open('apiKeys');
	}

	function handleProviderChange(provider: 'openai' | 'anthropic' | 'gemini' | '') {
		input.setLastProvider(provider);
		savePersistence();
	}
</script>

<article
	class="flex h-full flex-col"
	role="application"
	aria-label="Chat interface for Svelte component generation"
>
	{#if $apiKeysReady && !hasAnyApiKey()}
		<InlineNotice
			type="error"
			title={t('errors.noApiKeysConfigured')}
			actionLabel={t('actions.addKeys')}
			onAction={openApiKeys}
			class="mx-auto my-3 inline-block shrink-0 min-w-56 max-w-[90%] sm:max-w-[30rem] rounded-sm px-3 py-2 text-xs"
		/>
	{/if}
	<!-- Conversation list -->
	{#if showMessages}
		<section class="min-h-0 flex-1 overflow-y-auto">
			<ChatScrollArea
				messages={$chat.messages}
				isGenerating={$chat.isGenerating}
				onUseCode={handleUseCode}
				onRefine={handleRefine}
				class="h-full"
				emptyTitleOverride={isBrandNewSession ? t('chat.newChatTitle') : undefined}
				emptySubtextOverride={isBrandNewSession ? t('chat.newChatSubtext') : undefined}
			/>
		</section>
	{/if}

	<section
		bind:this={inputContainer}
		class={inlineInput ? 'relative z-10 bg-transparent px-0' : 'z-10 flex-shrink-0 px-0'}
		data-chat-input
	>
		<ChatInput
			currentPrompt={input.currentPrompt}
			isGenerating={$chat.isGenerating}
			sendOnEnter={input.sendOnEnter}
			modelInput={input.modelInput}
			pendingPlan={input.pendingPlan}
			lastProvider={input.lastProvider}
			onPromptChange={handlePromptChange}
			{onSubmit}
			onCancel={handleCancel}
			{onBuildFromPlan}
			onSendOnEnterChange={handleSendOnEnterChange}
			onModelChange={handleModelChange}
			onProviderChange={handleProviderChange}
			showIdeasButton={inlineInput}
		/>
		{#if !inlineInput}
			<div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
		{/if}
	</section>
</article>
