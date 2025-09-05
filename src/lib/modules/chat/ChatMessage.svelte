<script lang="ts">
	import { browser } from '$app/environment';
	import type { ChatMessage } from '$lib/core/stores/chat';
	import { getCodePreview, formatProvider, formatTime } from '$lib/shared/utils/codePreview';
	import {
		Copy as CopyIcon,
		Code as CodeIcon,
		Wand2 as Wand2Icon,
		Eye as EyeIcon,
		EyeOff as EyeOffIcon
	} from '@lucide/svelte';
	import { safeSessionStorage } from '$lib/shared/utils/storage';
	import { t } from '$lib/shared/i18n';
	import { createEventDispatcher } from 'svelte';
	import Prism from 'prismjs';
	import 'prism-svelte';
	import 'prismjs/themes/prism-tomorrow.css';

	interface Props {
		message: ChatMessage;
		onUseCode?: (code: string) => void;
		onRefine?: (messageId: string) => void;
	}

	let { message, onUseCode, onRefine }: Props = $props();
	let expanded = $state(false);
	let copiedUser = $state(false);
	const dispatch = createEventDispatcher<{ retry: { messageId: string } }>();

	function handleCopy() {
		if (message.generatedCode) {
			navigator.clipboard.writeText(message.generatedCode);
		}
	}

	function handleUseCode() {
		if (message.generatedCode) {
			onUseCode?.(message.generatedCode);
		}
	}

	function handleRefine() {
		onRefine?.(message.id);
	}

	function handleCopyUserMessage() {
		navigator.clipboard.writeText(message.content);
		copiedUser = true;
		setTimeout(() => (copiedUser = false), 1200);
	}

	// Action button configuration - using derived to react to expanded state
	const actionButtons = $derived([
		{
			icon: expanded ? EyeOffIcon : EyeIcon,
			label: expanded ? t('actions.hide') : t('actions.show'),
			onClick: toggleExpanded,
			ariaLabel: expanded ? t('actions.hide') : t('actions.show'),
			title: expanded ? t('actions.hide') : t('actions.show'),
			ariaExpanded: expanded,
			ariaControls: `code-${message.id}`
		},
		{
			icon: CodeIcon,
			label: 'Use Code',
			onClick: handleUseCode,
			ariaLabel: t('a11y.useCodeInEditor'),
			title: t('actions.useCode'),
			whitespaceNowrap: true
		},
		{
			icon: CopyIcon,
			label: 'Copy',
			onClick: handleCopy,
			ariaLabel: t('a11y.copyCode'),
			title: t('actions.copy')
		},
		{
			icon: Wand2Icon,
			label: 'Refine',
			onClick: handleRefine,
			ariaLabel: t('a11y.refineComponent'),
			title: t('actions.refine')
		}
	]);

	$effect(() => {
		// Load saved expansion state
		const key = `msg_expanded_${message.id}`;
		const result = safeSessionStorage.get(key);
		if (result.success && result.data === '1') {
			expanded = true;
		} else if (!result.success) {
			console.warn('Failed to load message expansion state:', result.error);
		}
	});

	// Code is hidden by default - no auto-expansion

	function toggleExpanded() {
		expanded = !expanded;
		const key = `msg_expanded_${message.id}`;
		const result = safeSessionStorage.set(key, expanded ? '1' : '0');
		if (!result.success) {
			console.warn('Failed to save message expansion state:', result.error);
		}
	}

	// Proper syntax highlighting using Prism.js (same as CodePanel)
	function highlightCode(code: string): string {
		if (!browser) return code;
		try {
			return (Prism as any).highlight(code, (Prism as any).languages.svelte, 'svelte');
		} catch {
			return code;
		}
	}
</script>

<article
	class="{message.role === 'user' ? 'mb-2 sm:mb-3' : 'mb-4 sm:mb-8'} flex {message.role === 'user'
		? 'justify-end'
		: 'justify-start'} w-full {message.role === 'user' ? 'order-2' : 'order-1'} @container"
	aria-label={message.role === 'user' ? t('chat.userMessage') : t('chat.assistantMessage')}
	role="group"
>
	{#if message.role === 'user'}
		<!-- User message: Keep the card/bubble style -->
		<div class="flex justify-end">
			<div class="group relative max-w-[80%]">
				<div
					class="overflow-hidden rounded-lg bg-slate-700 p-3 break-words break-all text-slate-400 shadow-sm dark:bg-slate-800"
				>
					<div class="text-sm break-words break-all whitespace-pre-wrap">{message.content}</div>
				</div>
				<!-- Copy button for user message -->
				<button
					class="absolute right-2 -bottom-2 rounded-full bg-slate-700 p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
					onclick={handleCopyUserMessage}
					title="Copy message"
					aria-label="Copy user message"
				>
					<CopyIcon class="h-3 w-3 text-slate-200" />
				</button>
				{#if copiedUser}
					<div
						class="absolute right-2 -bottom-7 rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200 shadow-sm dark:bg-slate-800"
						role="status"
						aria-live="polite"
					>
						Copied
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- AI message: More integrated, minimal styling -->
		<div class="w-full">
			{#if message.error}
				<section
					class="bg-destructive/10 border-destructive/20 rounded-lg border p-4"
					role="alert"
					aria-live="polite"
				>
					<h4 class="text-destructive mb-2 text-sm font-medium">Error</h4>
					<p class="text-destructive text-sm break-words break-all">{message.error}</p>
					<div class="mt-2">
						<button
							class="text-destructive text-xs underline hover:opacity-80"
							onclick={() => dispatch('retry', { messageId: message.id })}
							aria-label="Retry with default model"
						>
							Retry with default model
						</button>
					</div>
				</section>
			{:else if message.generatedCode && !message.streaming}
				<!-- Code generation result -->
				<section class="space-y-1" aria-labelledby={`code-header-${message.id}`}>
					<header
						class="text-muted-foreground hidden items-center justify-end gap-2 text-sm sm:flex"
						id={`code-header-${message.id}`}
					>
						<div class="flex flex-shrink-0 items-center gap-2 text-xs">
							<time datetime={new Date(message.timestamp).toISOString()}
								>{formatTime(message.timestamp)}</time
							>
							{#if message.provider}
								<span
									class="bg-muted/60 rounded px-1.5 py-0.5"
									role="img"
									aria-label={`Generated by ${formatProvider(message.provider)}`}
								>
									{formatProvider(message.provider)}
								</span>
							{/if}
						</div>
					</header>

					{#if expanded}
						<div
							id={`code-${message.id}`}
							class="relative max-h-96 overflow-auto rounded-lg border p-4 font-mono text-xs break-words whitespace-pre-wrap"
							aria-label="Generated Svelte component code"
							role="code"
						>
							<!-- Code with Prism.js syntax highlighting -->
							<pre
								class="inline-block max-h-full px-0 py-0 text-xs"
								style="white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;"><code
									class="language-svelte">{@html highlightCode(message.generatedCode)}</code
								></pre>
						</div>
					{:else}
						<div class="bg-muted/30 border-muted/50 rounded-lg border p-3 break-words">
							<div class="text-muted-foreground flex items-center gap-2 text-sm">
								<CodeIcon class="h-4 w-4" />
								<span class="font-medium">Code Generated</span>
								<span class="text-xs opacity-60"
									>({message.generatedCode.split('\n').length} lines)</span
								>
							</div>
						</div>
					{/if}
				</section>
			{:else}
				<!-- Regular AI text response -->
				<section class="space-y-2" aria-labelledby={`text-header-${message.id}`}>
					<header
						class="text-muted-foreground mb-2 hidden items-center justify-end gap-2 text-sm sm:flex"
						id={`text-header-${message.id}`}
					>
						<div class="flex flex-shrink-0 items-center gap-2 text-xs">
							<time datetime={new Date(message.timestamp).toISOString()}
								>{formatTime(message.timestamp)}</time
							>
							{#if message.provider}
								<span
									class="bg-muted/60 rounded px-1.5 py-0.5"
									role="img"
									aria-label={`Generated by ${formatProvider(message.provider)}`}
								>
									{formatProvider(message.provider)}
								</span>
							{/if}
						</div>
					</header>
					<div
						class="text-sm leading-relaxed break-words break-all whitespace-pre-wrap"
						role="region"
						aria-label="AI response"
					>
						{message.content}
					</div>
					{#if message.streaming}
						<div
							class="text-muted-foreground mt-3 flex items-center gap-1 text-xs"
							role="status"
							aria-live="polite"
							aria-label={t('chat.generating')}
						>
							<div class="h-1 w-1 animate-pulse rounded-full bg-current" aria-hidden="true"></div>
							<div
								class="h-1 w-1 animate-pulse rounded-full bg-current delay-100"
								aria-hidden="true"
							></div>
							<div
								class="h-1 w-1 animate-pulse rounded-full bg-current delay-200"
								aria-hidden="true"
							></div>
							<span class="ml-2">{t('chat.generating')}</span>
						</div>
					{/if}
				</section>
			{/if}
			<!-- Simplified action buttons for assistant code -->
			{#if message.generatedCode && !message.streaming && !message.error}
				<div
					class="text-muted-foreground mt-0 flex items-center gap-3 text-xs [@container(min-width:280px)]:gap-0"
					aria-label={t('chat.messageActions')}
				>
					{#each actionButtons as button}
						{@const IconComponent = button.icon}
						<button
							class="hover:text-foreground hover:bg-accent/50 flex cursor-pointer items-center gap-1 rounded px-1 py-1 transition-colors [@container(min-width:280px)]:px-2"
							onclick={button.onClick}
							aria-label={button.ariaLabel}
							title={button.title}
							aria-expanded={button.ariaExpanded}
							aria-controls={button.ariaControls}
						>
							<IconComponent
								class="w-{button.icon === EyeIcon || button.icon === EyeOffIcon
									? '4'
									: '3.5'} h-{button.icon === EyeIcon || button.icon === EyeOffIcon
									? '4'
									: '3.5'} min-w-{button.icon === EyeIcon || button.icon === EyeOffIcon
									? '4'
									: '3.5'}"
							/>
							<span
								class="hidden [@container(min-width:280px)]:inline {button.whitespaceNowrap
									? 'whitespace-nowrap'
									: ''}"
							>
								{button.label}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</article>

<style>
	/* Neutralize Prism backgrounds so our theme backgrounds work properly */
	:global(pre[class*='language-']) {
		background: transparent !important;
		margin: 0 !important;
		border-radius: 0 !important;
	}
	:global(code[class*='language-']) {
		background: transparent !important;
	}
</style>
