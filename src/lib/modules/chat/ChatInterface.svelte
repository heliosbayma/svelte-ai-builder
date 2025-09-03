<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/core/stores/chat';
	import { createPersistor } from '$lib/shared/utils';
	import { createChatHandlers } from '$lib/modules/chat/chatHandlers';
	import type { LLMProviderType } from '$lib/core/ai/services/llm';
	import ChatInput from './ChatInput.svelte';
	import ChatScrollArea from './ChatScrollArea.svelte';

	interface Props {
		onCodeGenerated?: (code: string, prompt: string, provider: LLMProviderType) => void;
		onStartGenerating?: () => void;
	}

	let { onCodeGenerated, onStartGenerating }: Props = $props();

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
			get currentPrompt() { return state.currentPrompt; },
			get pendingPlan() { return state.pendingPlan; },
			get modelInput() { return state.modelInput; },
			get lastProvider() { return state.lastProvider; },
			get sendOnEnter() { return state.sendOnEnter; },

			setPrompt: (prompt: string) => { state.currentPrompt = prompt; },
			setPendingPlan: (plan: string) => { state.pendingPlan = plan; },
			setModelInput: (input: string) => { state.modelInput = input; },
			setLastProvider: (provider: typeof state.lastProvider) => { state.lastProvider = provider; },
			toggleSendOnEnter: () => { state.sendOnEnter = !state.sendOnEnter; },
			
			clearPrompt: () => { state.currentPrompt = ''; },
			clearAll: () => {
				state.currentPrompt = '';
				state.pendingPlan = '';
				state.modelInput = '';
			}
		};
	})();

	// Subscribe to chat store
	const chat = chatStore;

	// Persist last-used model/provider (client-only)
	const chatUiPersist = createPersistor<{
		lastModel?: string;
		lastProvider?: 'openai' | 'anthropic' | 'gemini';
		sendOnEnter?: boolean;
	}>({
		key: 'ui-chat',
		version: 1
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
		onStartGenerating
	});
	// handlePlan available for future use

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
			savePersistence();
		}

		input.clearPrompt();
		const inputEl = document.querySelector('[data-chat-textarea]') as HTMLTextAreaElement | null;
		if (inputEl) {
			inputEl.style.height = 'auto';
			inputEl.focus();
		}
	}

	async function onBuildFromPlan() {
		const provider = await handleBuildFromPlan(input.pendingPlan, input.modelInput, input.lastProvider);
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
</script>

<main
	class="h-full flex flex-col"
	role="application"
	aria-label="Chat interface for Svelte component generation"
>
	<ChatScrollArea
		messages={$chat.messages}
		isGenerating={$chat.isGenerating}
		onUseCode={handleUseCode}
		onRefine={handleRefine}
	/>

	<ChatInput
		currentPrompt={input.currentPrompt}
		isGenerating={$chat.isGenerating}
		sendOnEnter={input.sendOnEnter}
		modelInput={input.modelInput}
		pendingPlan={input.pendingPlan}
		onPromptChange={handlePromptChange}
		{onSubmit}
		onCancel={handleCancel}
		{onBuildFromPlan}
		onSendOnEnterChange={handleSendOnEnterChange}
		onModelChange={handleModelChange}
	/>
</main>
