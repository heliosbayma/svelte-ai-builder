<script lang="ts">
	import type { ChatMessage } from '$lib/core/stores/chat';
	import ChatMessageComponent from './ChatMessage.svelte';

	interface Props {
		messages: ChatMessage[];
		isGenerating: boolean;
		onUseCode: (code: string) => void;
		onRefine: (messageId: string) => void;
	}

	let { messages, isGenerating, onUseCode, onRefine }: Props = $props();
	let chatContainer: HTMLElement | undefined;
	let isAtBottom = $state(true);

	function scrollToBottom() {
		if (chatContainer && isAtBottom) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	// Auto-scroll when new messages arrive
	$effect(() => {
		if (messages.length > 0) {
			requestAnimationFrame(() => scrollToBottom());
		}
	});

	function handleScroll() {
		if (!chatContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = chatContainer;
		isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
	}

	function jumpToLatest() {
		if (!chatContainer) return;
		chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
	}
</script>

<section
	bind:this={chatContainer}
	onscroll={handleScroll}
	class="relative flex-1 overflow-y-auto p-4 scroll-smooth chat-scrollbar"
	role="log"
	aria-live="polite"
	aria-busy={isGenerating ? 'true' : 'false'}
	aria-label="Chat conversation"
>
	{#if !isGenerating && !isAtBottom && messages.length > 0}
		<button
			onclick={jumpToLatest}
			class="absolute left-1/2 -translate-x-1/2 bottom-4 z-10 rounded-full bg-primary text-primary-foreground text-xs px-3 py-1 shadow"
			aria-label="Jump to latest messages"
		>
			Jump to latest
		</button>
	{/if}
	{#if messages.length === 0}
		<section
			class="text-center text-muted-foreground mt-8"
			role="status"
			aria-label="Empty conversation state"
		>
			<p class="text-sm">Start a conversation to generate Svelte components</p>
			<p class="text-xs mt-2 opacity-70">Try: "Create a responsive login form with validation"</p>
		</section>
	{:else}
		{#each messages as message (message.id)}
			<ChatMessageComponent {message} {onUseCode} {onRefine} />
		{/each}
	{/if}
</section>

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
