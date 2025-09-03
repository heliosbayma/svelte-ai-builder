<script lang="ts">
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

	interface Props {
		message: ChatMessage;
		onUseCode?: (code: string) => void;
		onRefine?: (messageId: string) => void;
	}

	let { message, onUseCode, onRefine }: Props = $props();
	let expanded = $state(false);
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

	// Simple syntax highlighting for Svelte/JS code
	function highlightCode(code: string): string {
		return (
			code
				// HTML/Svelte tags
				.replace(
					/(&lt;\/?)([a-zA-Z][a-zA-Z0-9-]*)(.*?)(&gt;)/g,
					'$1<span class="text-blue-400">$2</span>$3$4'
				)
				// Attributes
				.replace(/(\s)([a-zA-Z-]+)(=)/g, '$1<span class="text-green-400">$2</span>$3')
				// Strings
				.replace(/("[^"]*")/g, '<span class="text-yellow-300">$1</span>')
				.replace(/('[^']*')/g, '<span class="text-yellow-300">$1</span>')
				// Comments
				.replace(/(\/\*.*?\*\/)/gs, '<span class="text-gray-500 italic">$1</span>')
				.replace(/(\/\/.*$)/gm, '<span class="text-gray-500 italic">$1</span>')
				// Keywords
				.replace(
					/\b(function|const|let|var|if|else|for|while|return|import|export|interface|type|class)\b/g,
					'<span class="text-purple-400">$1</span>'
				)
				// Svelte directives
				.replace(
					/(\$:|#if|#each|#await|\/if|\/each|\/await|\$props|\$state|\$effect)/g,
					'<span class="text-pink-400">$1</span>'
				)
		);
	}
</script>

<article
	class="{message.role === 'user' ? 'mb-3' : 'mb-8'} flex {message.role === 'user'
		? 'justify-end'
		: 'justify-start'} w-full {message.role === 'user' ? 'order-2' : 'order-1'} @container"
	aria-label={message.role === 'user' ? t('chat.userMessage') : t('chat.assistantMessage')}
	role="group"
>
	{#if message.role === 'user'}
		<!-- User message: Keep the card/bubble style -->
		<div class="flex justify-end">
			<div class="max-w-[80%] group relative">
				<div
					class="p-3 rounded-lg bg-slate-700 dark:bg-slate-800 text-slate-400 shadow-sm break-words overflow-hidden"
				>
					<div class="whitespace-pre-wrap text-sm break-words">{message.content}</div>
				</div>
				<!-- Copy button for user message -->
				<button
					class="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 bg-slate-700 dark:bg-slate-800 rounded-full hover:bg-slate-600 dark:hover:bg-slate-700"
					onclick={handleCopyUserMessage}
					title="Copy message"
					aria-label="Copy user message"
				>
					<CopyIcon class="w-3 h-3 text-slate-200" />
				</button>
			</div>
		</div>
	{:else}
		<!-- AI message: More integrated, minimal styling -->
		<div class="w-full">
			{#if message.error}
				<section
					class="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
					role="alert"
					aria-live="polite"
				>
					<h4 class="text-destructive text-sm font-medium mb-2">Error</h4>
					<p class="text-destructive text-sm">{message.error}</p>
					<div class="mt-2">
						<button
							class="text-xs underline text-destructive hover:opacity-80"
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
						class="flex items-center justify-end gap-2 text-sm text-muted-foreground"
						id={`code-header-${message.id}`}
					>
						<div class="flex items-center gap-2 flex-shrink-0 text-xs">
							<time datetime={new Date(message.timestamp).toISOString()}
								>{formatTime(message.timestamp)}</time
							>
							{#if message.provider}
								<span
									class="px-1.5 py-0.5 rounded bg-muted/60"
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
							class="font-mono text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto rounded-lg bg-gray-900 border p-4 relative"
							aria-label="Generated Svelte component code"
							role="code"
						>
							<!-- Code with syntax highlighting -->
							<div class="text-gray-100">
								{@html highlightCode(
									message.generatedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')
								)}
							</div>
						</div>
					{:else}
						<div class="p-3 rounded-lg bg-muted/30 border border-muted/50">
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<CodeIcon class="w-4 h-4" />
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
						class="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-2"
						id={`text-header-${message.id}`}
					>
						<div class="flex items-center gap-2 flex-shrink-0 text-xs">
							<time datetime={new Date(message.timestamp).toISOString()}
								>{formatTime(message.timestamp)}</time
							>
							{#if message.provider}
								<span
									class="px-1.5 py-0.5 rounded bg-muted/60"
									role="img"
									aria-label={`Generated by ${formatProvider(message.provider)}`}
								>
									{formatProvider(message.provider)}
								</span>
							{/if}
						</div>
					</header>
					<div
						class="whitespace-pre-wrap text-sm leading-relaxed"
						role="region"
						aria-label="AI response"
					>
						{message.content}
					</div>
					{#if message.streaming}
						<div
							class="flex items-center gap-1 mt-3 text-xs text-muted-foreground"
							role="status"
							aria-live="polite"
							aria-label={t('chat.generating')}
						>
							<div class="w-1 h-1 bg-current rounded-full animate-pulse" aria-hidden="true"></div>
							<div
								class="w-1 h-1 bg-current rounded-full animate-pulse delay-100"
								aria-hidden="true"
							></div>
							<div
								class="w-1 h-1 bg-current rounded-full animate-pulse delay-200"
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
					class="mt-0 flex items-center gap-3 [@container(min-width:280px)]:gap-0 text-xs text-muted-foreground"
					aria-label={t('chat.messageActions')}
				>
					{#each actionButtons as button}
						{@const IconComponent = button.icon}
						<button
							class="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer px-1 [@container(min-width:280px)]:px-2 py-1 rounded hover:bg-accent/50"
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
