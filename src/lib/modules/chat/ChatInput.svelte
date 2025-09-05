<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { Textarea } from '$lib/shared/ui/textarea';
	import { t } from '$lib/shared/utils/i18n';
	import { Send, X, Sparkles, ChevronDown } from '@lucide/svelte';
	import { LLM_PROVIDERS } from '$lib/shared/constants/providers';
	import { en } from '$lib/shared/i18n';
	import { warning as toastWarning } from '$lib/core/stores/toast';

	interface Props {
		currentPrompt: string;
		isGenerating: boolean;
		sendOnEnter: boolean;
		modelInput: string;
		pendingPlan: string;
		lastProvider?: 'openai' | 'anthropic' | 'gemini' | '';
		onPromptChange: (value: string) => void;
		onSubmit: () => void;
		onCancel: () => void;
		onBuildFromPlan: () => void;
		onSendOnEnterChange: (checked: boolean) => void;
		onModelChange: (model: string) => void;
		onProviderChange?: (provider: 'openai' | 'anthropic' | 'gemini' | '') => void;
		showIdeasButton?: boolean;
	}

	let {
		currentPrompt,
		isGenerating,
		sendOnEnter,
		modelInput,
		pendingPlan,
		lastProvider = '',
		onPromptChange,
		onSubmit,
		onCancel,
		onBuildFromPlan,
		onSendOnEnterChange,
		onModelChange,
		onProviderChange,
		showIdeasButton = false
	}: Props = $props();

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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') return;

		const hasModifier = event.shiftKey || event.altKey || event.metaKey || event.ctrlKey;
		const hasMetaKey = event.metaKey || event.ctrlKey;

		const wantsSendOnEnter = sendOnEnter && !hasModifier;
		const wantsCtrlSend = !sendOnEnter && hasMetaKey;

		if (wantsSendOnEnter || wantsCtrlSend) {
			event.preventDefault();

			// Validate message length (minimum 3 characters)
			const trimmedPrompt = currentPrompt.trim();
			if (trimmedPrompt.length < 3) {
				toastWarning(
					'Please write a message with at least 3 characters to generate your component.',
					{
						title: 'Message too short'
					}
				);
				return;
			}

			onSubmit();
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		// Validate message length (minimum 3 characters)
		const trimmedPrompt = currentPrompt.trim();
		if (trimmedPrompt.length < 3) {
			toastWarning(
				'Please write a message with at least 3 characters to generate your component.',
				{
					title: 'Message too short'
				}
			);

			// Auto-focus the textarea
			const textarea = document.querySelector('[data-chat-textarea]') as HTMLTextAreaElement | null;
			if (textarea) {
				textarea.focus();
			}
			return;
		}

		onSubmit();
	}

	function handleToggleSendOnEnter(e: Event) {
		const input = e.currentTarget as HTMLInputElement | null;
		onSendOnEnterChange(!!input?.checked);
	}

	function handleModelChange(e: Event) {
		const select = e.currentTarget as HTMLSelectElement;
		onModelChange(select.value);
	}

	// Watch for prompt changes to notify parent
	$effect(() => {
		onPromptChange(currentPrompt);
	});

	// Counters removed for cleaner mobile UI

	function labelForProvider(key: 'openai' | 'anthropic' | 'gemini'): string {
		const p = LLM_PROVIDERS.find((p) => p.key === key);
		return p?.label ?? key;
	}

	function insertIdea() {
		const pool = en.inspirations as readonly string[];
		if (!pool?.length) return;
		const idea = pool[Math.floor(Math.random() * pool.length)];
		currentPrompt = idea;
		// notify parent via effect
		onPromptChange(currentPrompt);
		// resize textarea if present
		const el = document.querySelector('[data-chat-textarea]') as HTMLTextAreaElement | null;
		if (el) {
			el.value = idea;
			el.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}
</script>

<form onsubmit={handleSubmit} aria-label={t('chat.inputForm')}>
	<!-- Single composer-style input used across app -->
	<div class="px-4 py-3">
		<div class="border-border bg-background relative rounded-2xl border px-3 py-3 pb-14 shadow-sm">
			<Textarea
				bind:value={currentPrompt}
				onkeydown={handleKeydown}
				oninput={autoGrow}
				placeholder={t('chat.placeholder')}
				class="text-foreground placeholder:text-muted-foreground max-h-[240px] min-h-[68px] w-full resize-none overflow-x-hidden border-0 pr-16 break-words whitespace-pre-wrap focus:ring-0"
				disabled={isGenerating}
				aria-label={t('chat.inputLabel')}
				data-chat-textarea
			/>

			<!-- Bottom controls: left checkbox; right model select + icon-only send -->
			<div
				class="absolute right-3 bottom-3 left-3 flex items-center justify-end gap-2 sm:justify-between"
			>
				<div class="text-muted-foreground hidden text-xs sm:block">
					<label class="flex cursor-pointer items-center gap-1.5">
						<input
							type="checkbox"
							checked={sendOnEnter}
							oninput={handleToggleSendOnEnter}
							class="h-3 w-3"
						/>
						<span>{sendOnEnter ? t('chat.sendOnEnter') : t('chat.sendWithCmd')}</span>
					</label>
				</div>

				<div class="flex items-center gap-2 sm:gap-4">
					{#if showIdeasButton}
						<button
							class="border-border/60 bg-card/40 hover:bg-card/80 text-muted-foreground h-9 cursor-pointer rounded border px-3 text-xs font-medium transition-colors"
							type="button"
							onclick={insertIdea}
							aria-label={en.actions.ideas}
						>
							{en.actions.ideas}
						</button>
					{/if}
					<div class="relative inline-block">
						<select
							class="text-muted-foreground border-border/60 bg-card/40 hover:bg-card/80 h-9 cursor-pointer appearance-none rounded border pr-6 pl-2 text-xs font-medium transition-colors outline-none focus:ring-0 focus:outline-none"
							value={modelInput}
							onchange={handleModelChange}
							disabled={isGenerating}
							aria-label={t('chat.modelOverride')}
							title={t('chat.modelOverride')}
						>
							<option value="" class="bg-background text-foreground">{t('chat.autoModel')}</option>
							<optgroup label={labelForProvider('openai')} class="bg-background">
								<option value="gpt-4o" class="bg-background text-foreground"
									>{t('models.openai.gpt-4o')}</option
								>
								<option value="gpt-4o-mini" class="bg-background text-foreground"
									>{t('models.openai.gpt-4o-mini')}</option
								>
							</optgroup>
							<optgroup label={labelForProvider('anthropic')} class="bg-background">
								<option value="claude-3-5-sonnet-20241022" class="bg-background text-foreground"
									>{t('models.anthropic.claude-3-5-sonnet-20241022')}</option
								>
								<option value="claude-3-5-haiku-20241022" class="bg-background text-foreground"
									>{t('models.anthropic.claude-3-5-haiku-20241022')}</option
								>
							</optgroup>
							<optgroup label={labelForProvider('gemini')} class="bg-background">
								<option value="gemini-1.5-pro-latest" class="bg-background text-foreground"
									>{t('models.gemini.gemini-1_5-pro-latest')}</option
								>
								<option value="gemini-1.5-flash-latest" class="bg-background text-foreground"
									>{t('models.gemini.gemini-1_5-flash-latest')}</option
								>
							</optgroup>
						</select>
						<ChevronDown
							class="text-muted-foreground pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2"
						/>
					</div>
					<Button
						type="submit"
						size="sm"
						disabled={isGenerating}
						class="h-8 w-8 rounded-full p-0"
						aria-label={t('actions.send')}
					>
						<Send class="h-4 w-4" />
					</Button>
				</div>
			</div>

			{#if pendingPlan}
				<div class="mt-2">
					<Button
						variant="outline"
						size="sm"
						onclick={onBuildFromPlan}
						disabled={isGenerating}
						class="h-7 gap-1.5 px-2 text-xs"
						aria-label={t('a11y.buildFromPlan')}
					>
						<Sparkles class="h-3.5 w-3.5" />
						{t('actions.build')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
</form>

<style>
	/* Force mobile select dropdown to use proper theme colors */
	.select-mobile {
		-webkit-appearance: none;
		appearance: none;
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.select-mobile option {
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.select-mobile optgroup {
		background-color: hsl(var(--background));
		color: hsl(var(--muted-foreground));
	}

	/* iOS specific fixes */
	@supports (-webkit-touch-callout: none) {
		.select-mobile {
			background-color: hsl(var(--background)) !important;
			color: hsl(var(--foreground)) !important;
		}

		.select-mobile option {
			background-color: hsl(var(--background)) !important;
			color: hsl(var(--foreground)) !important;
		}
	}

	/* Dark mode overrides */
	:global(.dark) .select-mobile {
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	:global(.dark) .select-mobile option,
	:global(.dark) .select-mobile optgroup {
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	/* Better text wrapping to prevent single word orphans */
	:global([data-chat-textarea]) {
		word-wrap: break-word;
		overflow-wrap: break-word;
		hyphens: auto;
		line-break: auto;
		/* Prevent orphan words (single words on new lines) */
		orphans: 2;
		widows: 2;
		/* Better word spacing */
		word-spacing: normal;
		/* Allow breaking long words but prefer breaking at word boundaries */
		word-break: break-word;
		overflow-wrap: anywhere;
	}
</style>
