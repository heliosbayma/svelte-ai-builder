<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { chatStore } from '$lib/stores/chat';
	import { apiKeyStore } from '$lib/stores/apiKeys';
	import { llmClient } from '$lib/services';
	import ChatMessage from './ChatMessage.svelte';
	import { get } from 'svelte/store';
	import { createPersistor } from '$lib/utils';
	import type { LLMProviderType } from '$lib/services/llm';
	import { Send, X, Sparkles } from '@lucide/svelte';

	interface Props {
		onCodeGenerated?: (code: string, prompt: string, provider: LLMProviderType) => void;
		onStartGenerating?: () => void;
	}

	let { onCodeGenerated, onStartGenerating }: Props = $props();
	let currentPrompt = $state('');
	let chatContainer: HTMLElement | undefined;
	let isAtBottom = $state(true);
	let pendingPlan = $state('');
	let modelInput = $state('');
	let lastProvider = $state<'openai' | 'anthropic' | 'gemini' | ''>('');
	let sendOnEnter = $state(true);

	function autoGrow(e: Event) {
		const el = e.currentTarget as HTMLTextAreaElement | null;
		if (!el) return;
		el.style.height = 'auto';
		const maxLines = 8;
		const cs = getComputedStyle(el);
		const line = parseFloat(cs.lineHeight || '20') || 20;
		const maxHeight = Math.round(line * maxLines);
		el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
	}

	// Persist last-used model/provider (client-only)
	const chatUiPersist = createPersistor<{
		lastModel?: string;
		lastProvider?: 'openai' | 'anthropic' | 'gemini';
		sendOnEnter?: boolean;
	}>({
		key: 'ui-chat',
		version: 1
	});

	$effect(() => {
		// One-time restore
		const restored = chatUiPersist.load({});
		if (restored.lastModel) modelInput = restored.lastModel;
		if (restored.lastProvider) lastProvider = restored.lastProvider;
		if (typeof restored.sendOnEnter === 'boolean') sendOnEnter = restored.sendOnEnter;
	});

	// Subscribe to chat store
	const chat = chatStore;

	function scrollToBottom() {
		if (chatContainer && isAtBottom) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	// Auto-scroll when new messages arrive
	$effect(() => {
		if ($chat.messages.length > 0) {
			requestAnimationFrame(() => scrollToBottom());
		}
	});

	function handleScroll() {
		if (!chatContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = chatContainer;
		isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
	}

	function handleToggleSendOnEnter(e: Event) {
		const input = e.currentTarget as HTMLInputElement | null;
		sendOnEnter = !!input?.checked;
		chatUiPersist.save({
			lastModel: modelInput || undefined,
			lastProvider: lastProvider || undefined,
			sendOnEnter
		});
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const prompt = currentPrompt.trim();
		if (!prompt || $chat.isGenerating) return;

		const apiKeys = get(apiKeyStore);
		const availableProviders = (Object.keys(apiKeys) as Array<keyof typeof apiKeys>).filter(
			(provider) => apiKeys[provider] !== null
		);

		if (availableProviders.length === 0) {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Please configure your API keys in Settings before starting a conversation.',
				error: 'No API keys configured'
			});
			return;
		}

		// Prefer last used provider if available, else OpenAI, else Anthropic, else first
		const provider = (
			lastProvider && (availableProviders as string[]).includes(lastProvider)
				? lastProvider
				: availableProviders.includes('openai')
					? 'openai'
					: availableProviders.includes('anthropic')
						? 'anthropic'
						: availableProviders[0]
		) as 'openai' | 'anthropic' | 'gemini';

		// Add user message
		chatStore.addMessage({ role: 'user', content: prompt });

		// Start assistant message
		const assistantMessageId = chatStore.addMessage({
			role: 'assistant',
			content: '',
			streaming: true,
			provider
		});

		// Clear input and start generation
		currentPrompt = '';
		const inputEl = document.querySelector('[data-chat-textarea]') as HTMLTextAreaElement | null;
		if (inputEl) {
			inputEl.style.height = 'auto';
			inputEl.focus();
		}
		const requestId = crypto.randomUUID();
		chatStore.startGeneration(provider, requestId);

		// Notify parent to show preview loading immediately
		onStartGenerating?.();

		try {
			console.log('Starting LLM generation:', { provider, prompt });
			lastProvider = provider;
			chatUiPersist.save({ lastModel: modelInput || undefined, lastProvider: provider });
			// Get previous code for refinement context
			const versions = chatStore.getComponentVersions();
			const previousCode = versions[versions.length - 1]?.code;

			const controller = new AbortController();
			chatStore.registerRequest(requestId, controller);
			const response = await llmClient.generateComponent(
				prompt,
				{
					provider,
					apiKey: apiKeys[provider]!,
					model: modelInput || undefined,
					signal: controller.signal,
					purpose: 'generate'
				},
				previousCode
			);

			console.log('LLM generation completed:', response);
			// Guard late results for canceled/replaced requests
			if ($chat.currentRequestId !== requestId) return;
			chatStore.updateMessage(assistantMessageId, {
				content: '',
				generatedCode: response.content,
				codeLength: response.content?.length || 0,
				streaming: false
			});
			onCodeGenerated?.(response.content, prompt, provider);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			chatStore.updateMessage(assistantMessageId, {
				content: '',
				streaming: false,
				error: errorMessage
			});
		} finally {
			chatStore.stopGeneration();
		}
	}

	async function handlePlan() {
		const prompt = currentPrompt.trim();
		if (!prompt || $chat.isGenerating) return;
		const apiKeys = get(apiKeyStore);
		const provider =
			lastProvider && apiKeys[lastProvider]
				? lastProvider
				: (['openai', 'anthropic', 'gemini'] as const).find((p) => apiKeys[p]) || 'openai';
		chatStore.addMessage({ role: 'user', content: `PLAN: ${prompt}` });
		try {
			lastProvider = provider;
			chatUiPersist.save({ lastModel: modelInput || undefined, lastProvider: provider });
			const res = await llmClient.planPage(prompt, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				purpose: 'plan'
			});
			let raw = res.content?.trim() || '';
			raw = raw
				.replace(/^```[a-zA-Z]*\n?/, '')
				.replace(/```$/, '')
				.trim();
			JSON.parse(raw);
			pendingPlan = raw;
			chatStore.addMessage({ role: 'assistant', content: pendingPlan });
		} catch {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Plan failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.planPage(prompt, {
					provider,
					apiKey: apiKeys[provider]!,
					purpose: 'plan'
				});
				let raw2 = res2.content?.trim() || '';
				raw2 = raw2
					.replace(/^```[a-zA-Z]*\n?/, '')
					.replace(/```$/, '')
					.trim();
				JSON.parse(raw2);
				pendingPlan = raw2;
				chatStore.addMessage({ role: 'assistant', content: pendingPlan });
			} catch {
				pendingPlan = '';
				chatStore.addMessage({
					role: 'assistant',
					content: 'Plan failed. Please try again or pick another model.'
				});
			}
		}
	}

	async function handleBuildFromPlan() {
		if (!pendingPlan) return;
		const apiKeys = get(apiKeyStore);
		const provider =
			lastProvider && apiKeys[lastProvider]
				? lastProvider
				: (['openai', 'anthropic', 'gemini'] as const).find((p) => apiKeys[p]) || 'openai';
		chatStore.addMessage({ role: 'user', content: 'BUILD FROM PLAN' });
		try {
			lastProvider = provider;
			chatUiPersist.save({ lastModel: modelInput || undefined, lastProvider: provider });
			// Notify parent to show preview loading for build-from-plan flow
			onStartGenerating?.();
			const res = await llmClient.buildPageFromPlan(pendingPlan, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				purpose: 'build'
			});
			chatStore.addMessage({
				role: 'assistant',
				content: '',
				generatedCode: res.content,
				codeLength: res.content?.length || 0,
				provider
			});
			onCodeGenerated?.(res.content, 'Build from plan', provider);
		} catch {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Build failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.buildPageFromPlan(pendingPlan, {
					provider,
					apiKey: apiKeys[provider]!,
					purpose: 'build'
				});
				chatStore.addMessage({
					role: 'assistant',
					content: '',
					generatedCode: res2.content,
					codeLength: res2.content?.length || 0,
					provider
				});
				onCodeGenerated?.(res2.content, 'Build from plan', provider);
			} catch {
				chatStore.addMessage({
					role: 'assistant',
					content: 'Build failed. Please try again or pick another model.'
				});
			}
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
				currentPrompt = `Refine this: ${userMessage.content}`;
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;
		const wantsSendOnEnter =
			sendOnEnter && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;
		const wantsCtrlSend = !sendOnEnter && (event.metaKey || event.ctrlKey);
		if (wantsSendOnEnter || wantsCtrlSend) {
			event.preventDefault();
			const form = (event.target as HTMLElement).closest('form');
			if (form) {
				const submitEvent = new SubmitEvent('submit', { bubbles: true, cancelable: true });
				handleSubmit(submitEvent);
			}
		}
	}

	function handleCancel() {
		chatStore.abortCurrent();
	}
</script>

<main
	class="h-full flex flex-col"
	role="application"
	aria-label="Chat interface for Svelte component generation"
>
	<!-- Chat messages -->
	<section
		bind:this={chatContainer}
		onscroll={handleScroll}
		class="relative flex-1 overflow-y-auto p-4 scroll-smooth chat-scrollbar"
		role="log"
		aria-live="polite"
		aria-busy={$chat.isGenerating ? 'true' : 'false'}
		aria-label="Chat conversation"
	>
		{#if !$chat.isGenerating && !isAtBottom && $chat.messages.length > 0}
			<button
				onclick={() => {
					if (!chatContainer) return;
					chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
				}}
				class="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 rounded-full bg-primary text-primary-foreground text-xs px-3 py-1 shadow"
				aria-label="Jump to latest messages"
			>
				Jump to latest
			</button>
		{/if}
		{#if $chat.messages.length === 0}
			<div class="text-center text-muted-foreground mt-8">
				<p class="text-sm">Start a conversation to generate Svelte components</p>
				<p class="text-xs mt-2 opacity-70">Try: "Create a responsive login form with validation"</p>
			</div>
		{:else}
			{#each $chat.messages as message (message.id)}
				<ChatMessage {message} onUseCode={handleUseCode} onRefine={handleRefine} />
			{/each}
		{/if}
	</section>

	<!-- Input area -->
	<form onsubmit={handleSubmit} class="border-t p-4 space-y-3" aria-label="Message input form">
		<fieldset>
			<legend class="sr-only">Send message to generate Svelte component</legend>
			<Textarea
				bind:value={currentPrompt}
				onkeydown={handleKeydown}
				oninput={autoGrow}
				placeholder="Describe the component you want to create..."
				class="w-full min-h-[60px] max-h-[200px] resize-none"
				disabled={$chat.isGenerating}
				aria-label="Component description input"
				data-chat-textarea
			/>
		</fieldset>

		<!-- Action buttons below textarea -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				{#if $chat.isGenerating}
					<Button
						variant="outline"
						size="sm"
						onclick={handleCancel}
						class="h-8 px-3 text-xs gap-1.5"
						aria-label="Cancel generation"
					>
						<X class="w-3.5 h-3.5" />
						Cancel
					</Button>
				{:else}
					<Button
						type="submit"
						size="sm"
						disabled={!currentPrompt.trim()}
						class="h-8 px-3 text-xs gap-1.5"
						aria-label="Send message"
					>
						<Send class="w-3.5 h-3.5" />
						Send
					</Button>
					{#if pendingPlan}
						<Button
							variant="outline"
							size="sm"
							onclick={handleBuildFromPlan}
							disabled={$chat.isGenerating}
							class="h-8 px-3 text-xs gap-1.5"
							aria-label="Build from existing plan"
						>
							<Sparkles class="w-3.5 h-3.5" />
							Build
						</Button>
					{/if}
				{/if}

				<!-- Model selector -->
				<select
					class="h-8 px-2 text-xs border rounded-md bg-background text-muted-foreground"
					bind:value={modelInput}
					aria-label="Model override"
				>
					<option value="">Auto model</option>
					<optgroup label="OpenAI">
						<option value="gpt-4o">GPT-4o</option>
						<option value="gpt-4o-mini">GPT-4o mini</option>
					</optgroup>
					<optgroup label="Anthropic">
						<option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
						<option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
					</optgroup>
					<optgroup label="Gemini">
						<option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
						<option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
					</optgroup>
				</select>
			</div>

			<!-- Right side options -->
			<div class="flex items-center gap-3 text-xs text-muted-foreground">
				<label
					class="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
				>
					<input
						type="checkbox"
						checked={sendOnEnter}
						oninput={handleToggleSendOnEnter}
						aria-label="Toggle send on Enter"
						class="w-3 h-3"
					/>
					<span>{sendOnEnter ? '↵ to send' : '⌘↵ to send'}</span>
				</label>
			</div>
		</div>

		<footer class="hidden" aria-label="Input hints and status">
			<span>⌘+Enter to send</span>
			{#if $chat.isGenerating && $chat.currentProvider}
				<span aria-live="polite">Generating with {$chat.currentProvider}...</span>
			{/if}
		</footer>
	</form>
</main>

<style>
	.chat-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.chat-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.chat-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.chat-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Firefox scrollbar */
	.chat-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
</style>
