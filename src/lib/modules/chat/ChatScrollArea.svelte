<script lang="ts">
	import { browser } from '$app/environment';
	import type { ChatMessage } from '$lib/core/stores/chat';
	import { t } from '$lib/shared/i18n';
	import { en } from '$lib/shared/i18n';
	import ChatMessageComponent from './ChatMessage.svelte';

	interface Props {
		messages: ChatMessage[];
		isGenerating: boolean;
		onUseCode: (code: string) => void;
		onRefine: (messageId: string) => void;
		onRetry?: (messageId: string) => void;
		class?: string;
		emptyTitleOverride?: string;
		emptySubtextOverride?: string;
	}

	let {
		messages,
		isGenerating,
		onUseCode,
		onRefine,
		onRetry,
		class: className = '',
		emptyTitleOverride,
		emptySubtextOverride
	}: Props = $props();
	let chatContainer: HTMLElement | undefined;
	let isAtBottom = $state(true);

	// Random inspiration when empty
	let suggestion = $state('');
	$effect(() => {
		if (messages.length === 0) {
			const pool = en.inspirations as readonly string[];
			if (pool?.length) suggestion = pool[Math.floor(Math.random() * pool.length)];
		}
	});

	// Virtualization state (temporarily disabled to avoid scroll loop on mobile branch)
	let containerHeight = $state(0);
	const virtualizationEnabled = false;
	const estimatedItemHeight = 72; // px, heuristic average
	const overscan = 6;
	let startIndex = $state(0);
	let endIndex = $state(0);

	function updateContainerHeight() {
		containerHeight = chatContainer?.clientHeight || 0;
	}

	function computeWindow() {
		const total = messages.length;
		if (!virtualizationEnabled) {
			startIndex = 0;
			endIndex = total;
			return;
		}
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
		if (!virtualizationEnabled) return 0;
		return startIndex * estimatedItemHeight;
	}
	function bottomSpacerHeight() {
		if (!virtualizationEnabled) return 0;
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
	class="relative flex-1 overflow-y-auto p-4 scroll-smooth {className}"
	role="log"
	aria-live="polite"
	aria-busy={isGenerating ? 'true' : 'false'}
	aria-label={t('chat.conversationLabel')}
>
	{#if browser && messages.length === 0}
		<div class="min-h-[50vh] grid place-content-center -translate-y-[8vh]">
			<section
				class="text-center text-muted-foreground"
				role="status"
				aria-label={t('chat.emptyState')}
			>
				<p class="text-sm">{emptyTitleOverride || t('chat.emptyState')}</p>
				{#if emptySubtextOverride}
					<p class="text-xs mt-2 opacity-70">{emptySubtextOverride}</p>
				{:else if suggestion}
					<p class="text-xs mt-2 opacity-70">{`Try: "${suggestion}"`}</p>
				{/if}
			</section>
		</div>
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
