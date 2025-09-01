<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { chatStore } from '$lib/stores/chat';
	import { apiKeyStore } from '$lib/stores/apiKeys';
	import { llmClient } from '$lib/services';
	import ChatMessage from './ChatMessage.svelte';
	import { get } from 'svelte/store';

	interface Props {
		onCodeGenerated?: (code: string, prompt: string, provider: string) => void;
	}

	let { onCodeGenerated }: Props = $props();
	let currentPrompt = $state('');
	let chatContainer: HTMLElement | undefined;
	let isAtBottom = $state(true);
	let pendingPlan = $state('');
	let modelInput = $state('');
	let promptVariant = $state<'A' | 'B'>('A');

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
			setTimeout(scrollToBottom, 50);
		}
	});

	function handleScroll() {
		if (!chatContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = chatContainer;
		isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
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

		// Prefer OpenAI for code gen quality, else Anthropic, else first available
		const provider = availableProviders.includes('openai')
			? 'openai'
			: availableProviders.includes('anthropic')
				? 'anthropic'
				: availableProviders[0];

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
		const requestId = crypto.randomUUID();
		chatStore.startGeneration(provider, requestId);

		try {
			console.log('Starting LLM generation:', { provider, prompt });
			// Get previous code for refinement context
			const versions = chatStore.getComponentVersions();
			const previousCode = versions[versions.length - 1]?.code;

			const response = await llmClient.generateComponent(
				prompt,
				{
					provider,
					apiKey: apiKeys[provider]!,
					model: modelInput || undefined,
					signal: new AbortController().signal,
					promptVariant,
					purpose: 'generate'
				},
				previousCode
			);

			console.log('LLM generation completed:', response);
			chatStore.updateMessage(assistantMessageId, {
				content: response.content,
				generatedCode: response.content,
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
			(['openai', 'anthropic', 'gemini'] as const).find((p) => apiKeys[p]) || 'openai';
		chatStore.addMessage({ role: 'user', content: `PLAN: ${prompt}` });
		try {
			const res = await llmClient.planPage(prompt, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				promptVariant,
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
		} catch (err) {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Plan failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.planPage(prompt, {
					provider,
					apiKey: apiKeys[provider]!,
					promptVariant,
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
			(['openai', 'anthropic', 'gemini'] as const).find((p) => apiKeys[p]) || 'openai';
		chatStore.addMessage({ role: 'user', content: 'BUILD FROM PLAN' });
		try {
			const res = await llmClient.buildPageFromPlan(pendingPlan, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				promptVariant,
				purpose: 'build'
			});
			chatStore.addMessage({ role: 'assistant', content: res.content });
			onCodeGenerated?.(res.content, 'Build from plan', provider);
		} catch (err) {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Build failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.buildPageFromPlan(pendingPlan, {
					provider,
					apiKey: apiKeys[provider]!,
					promptVariant,
					purpose: 'build'
				});
				chatStore.addMessage({ role: 'assistant', content: res2.content });
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
		const provider = message?.provider || 'unknown';
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
		if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			const form = (event.target as HTMLElement).closest('form');
			if (form) {
				const submitEvent = new SubmitEvent('submit', { bubbles: true, cancelable: true });
				handleSubmit(submitEvent);
			}
		}
	}

	function handleCancel() {
		if ($chat.currentRequestId) {
			chatStore.stopGeneration();
		}
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
		class="flex-1 overflow-y-auto p-4 scroll-smooth"
		role="log"
		aria-live="polite"
		aria-label="Chat conversation"
	>
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
	<form onsubmit={handleSubmit} class="border-t p-4" aria-label="Message input form">
		<fieldset class="flex gap-2">
			<legend class="sr-only">Send message to generate Svelte component</legend>
			<Textarea
				bind:value={currentPrompt}
				onkeydown={handleKeydown}
				placeholder="Describe the component you want to create..."
				class="flex-1 min-h-[60px] resize-none"
				disabled={$chat.isGenerating}
				aria-label="Component description input"
			/>
			<div class="flex flex-col gap-2" role="group" aria-label="Message actions">
				{#if $chat.isGenerating}
					<Button
						variant="outline"
						onclick={handleCancel}
						class="px-3"
						aria-label="Cancel generation request">Cancel</Button
					>
				{:else}
					<div class="flex gap-2 items-center">
						<Button
							type="submit"
							disabled={!currentPrompt.trim()}
							class="px-6"
							aria-label="Send message to generate component">Send</Button
						>
						<Button variant="outline" onclick={handlePlan} aria-label="Plan page">Plan</Button>
						<Button
							variant="outline"
							onclick={handleBuildFromPlan}
							disabled={!pendingPlan || $chat.isGenerating}
							aria-label="Build from plan">Build</Button
						>
						<select
							class="h-9 px-2 text-sm border rounded-md bg-background"
							bind:value={promptVariant}
							aria-label="Prompt variant"
						>
							<option value="A">Prompt A</option>
							<option value="B">Prompt B</option>
						</select>
						<select
							class="h-9 px-2 text-sm border rounded-md bg-background"
							bind:value={modelInput}
							aria-label="Model override"
						>
							<option value="">Auto (default)</option>
							<optgroup label="OpenAI">
								<option value="gpt-5">gpt-5</option>
								<option value="gpt-4o-mini">gpt-4o-mini</option>
								<option value="gpt-4o">gpt-4o</option>
								<option value="gpt-4.1-mini">gpt-4.1-mini</option>
							</optgroup>
							<optgroup label="Anthropic">
								<option value="claude-4-sonnet">claude-4-sonnet</option>
								<option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
								<option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
							</optgroup>
							<optgroup label="Gemini">
								<option value="gemini-1.5-pro-latest">gemini-1.5-pro-latest</option>
								<option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
							</optgroup>
						</select>
					</div>
				{/if}
			</div>
		</fieldset>

		<footer
			class="flex items-center justify-between mt-2 text-xs text-muted-foreground"
			aria-label="Input hints and status"
		>
			<span>⌘+Enter to send</span>
			{#if $chat.isGenerating && $chat.currentProvider}
				<span aria-live="polite">Generating with {$chat.currentProvider}...</span>
			{/if}
		</footer>
	</form>
</main>
