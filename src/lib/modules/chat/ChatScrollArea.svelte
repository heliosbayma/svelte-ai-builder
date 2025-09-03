<script lang="ts">
	import { browser } from '$app/environment';
	import type { ChatMessage } from '$lib/core/stores/chat';
	import { t } from '$lib/shared/i18n';
	import ChatMessageComponent from './ChatMessage.svelte';

	interface Props {
		messages: ChatMessage[];
		isGenerating: boolean;
		onUseCode: (code: string) => void;
		onRefine: (messageId: string) => void;
		onRetry?: (messageId: string) => void;
	}

	let { messages, isGenerating, onUseCode, onRefine, onRetry }: Props = $props();
	let chatContainer: HTMLElement | undefined;
	let isAtBottom = $state(true);

	// Virtualization state
	let containerHeight = $state(0);
	const estimatedItemHeight = 72; // px, heuristic average
	const overscan = 6;
	let startIndex = $state(0);
	let endIndex = $state(0);

	function updateContainerHeight() {
		containerHeight = chatContainer?.clientHeight || 0;
	}

	function computeWindow() {
		const total = messages.length;
		if (!chatContainer) {
			startIndex = 0;
			endIndex = total;
			return;
		}
		const scrollTop = chatContainer.scrollTop;
		const visibleCount = Math.max(1, Math.ceil(containerHeight / estimatedItemHeight));
		const first = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
		const last = Math.min(total, first + visibleCount + overscan * 2);
		startIndex = first;
		endIndex = last;
	}

	function topSpacerHeight() {
		return startIndex * estimatedItemHeight;
	}
	function bottomSpacerHeight() {
		return Math.max(0, (messages.length - endIndex) * estimatedItemHeight);
	}

	function scrollToBottom() {
		if (chatContainer && isAtBottom) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	}

	// Auto-scroll when new messages arrive
	$effect(() => {
		updateContainerHeight();
		computeWindow();
		if (messages.length > 0) {
			requestAnimationFrame(() => scrollToBottom());
		}
	});

	function handleScroll() {
		if (!chatContainer) return;
		const { scrollTop, scrollHeight, clientHeight } = chatContainer;
		isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
		computeWindow();
	}

	function jumpToLatest() {
		if (!chatContainer) return;
		chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
	}

	function onResize() {
		updateContainerHeight();
		computeWindow();
	}
</script>

<svelte:window onresize={onResize} />

<section
	bind:this={chatContainer}
	onscroll={handleScroll}
	class="relative flex-1 overflow-y-auto p-4 scroll-smooth"
	role="log"
	aria-live="polite"
	aria-busy={isGenerating ? 'true' : 'false'}
	aria-label={t('chat.conversationLabel')}
>
	{#if !isGenerating && !isAtBottom && messages.length > 0}
		<button
			onclick={jumpToLatest}
			class="absolute left-1/2 -translate-x-1/2 bottom-2 z-10 rounded-full bg-primary text-primary-foreground text-xs px-3 py-2 shadow-lg hover:bg-primary/90 transition-all duration-200 cursor-pointer flex items-center gap-1"
			aria-label={t('actions.jumpToLatest')}
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 14l-7 7m0 0l-7-7m7 7V3"
				/>
			</svg>
			{t('actions.jumpToLatest')}
		</button>
	{/if}
	{#if browser && messages.length === 0}
		<section
			class="text-center text-muted-foreground mt-8"
			role="status"
			aria-label={t('chat.emptyState')}
		>
			<p class="text-sm">{t('chat.emptyState')}</p>
			<p class="text-xs mt-2 opacity-70">{t('chat.emptySubtext')}</p>
		</section>
	{:else}
		<div style={`height:${topSpacerHeight()}px`} aria-hidden="true"></div>
		{#each messages.slice(startIndex, endIndex) as message (message.id)}
			<ChatMessageComponent
				{message}
				{onUseCode}
				{onRefine}
				on:retry={(e) => onRetry?.(e.detail.messageId)}
			/>
		{/each}
		<div style={`height:${bottomSpacerHeight()}px`} aria-hidden="true"></div>
	{/if}
</section>
