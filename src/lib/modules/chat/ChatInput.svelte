<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { Textarea } from '$lib/shared/ui/textarea';
	import { t } from '$lib/shared/utils/i18n';
	import { Send, X, Sparkles, ChevronDown } from '@lucide/svelte';
	import { LLM_PROVIDERS } from '$lib/shared/constants/providers';
	import { en } from '$lib/shared/i18n';

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
			onSubmit();
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
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
		<div
			class="relative rounded-2xl border bg-background/70 backdrop-blur px-3 py-3 shadow-sm pb-14"
		>
			<Textarea
				bind:value={currentPrompt}
				onkeydown={handleKeydown}
				oninput={autoGrow}
				placeholder={t('chat.placeholder')}
				class="w-full min-h-[68px] max-h-[240px] resize-none border-0 focus:ring-0 pr-16 overflow-x-hidden break-words whitespace-pre-wrap text-muted-foreground placeholder:text-muted-foreground/60"
				disabled={isGenerating}
				aria-label={t('chat.inputLabel')}
				data-chat-textarea
			/>

			<!-- Bottom controls: left checkbox; right model select + icon-only send -->
			<div class="absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2">
				<div class="text-xs text-muted-foreground">
					<label class="flex items-center gap-1.5 cursor-pointer">
						<input
							type="checkbox"
							checked={sendOnEnter}
							oninput={handleToggleSendOnEnter}
							class="w-3 h-3"
						/>
						<span>{sendOnEnter ? t('chat.sendOnEnter') : t('chat.sendWithCmd')}</span>
					</label>
				</div>

				<div class="flex items-center gap-2 sm:gap-4">
					{#if showIdeasButton}
						<button
							class="h-8 px-2 text-[10px] rounded border border-border/40 bg-card/30 hover:bg-card/50 text-muted-foreground cursor-pointer"
							type="button"
							onclick={insertIdea}
							aria-label={en.actions.ideas}
						>
							{en.actions.ideas}
						</button>
					{/if}
					<select
						class="h-8 px-2 text-[10px] rounded text-muted-foreground border border-border/40 bg-card/30 hover:bg-card/50 outline-none focus:outline-none focus:ring-0 cursor-pointer"
						value={modelInput}
						onchange={handleModelChange}
						disabled={isGenerating}
						aria-label={t('chat.modelOverride')}
						title={t('chat.modelOverride')}
					>
						<option value="">{t('chat.autoModel')}</option>
						<optgroup label={labelForProvider('openai')}>
							<option value="gpt-4o">{t('models.openai.gpt-4o')}</option>
							<option value="gpt-4o-mini">{t('models.openai.gpt-4o-mini')}</option>
						</optgroup>
						<optgroup label={labelForProvider('anthropic')}>
							<option value="claude-3-5-sonnet-20241022"
								>{t('models.anthropic.claude-3-5-sonnet-20241022')}</option
							>
							<option value="claude-3-5-haiku-20241022"
								>{t('models.anthropic.claude-3-5-haiku-20241022')}</option
							>
						</optgroup>
						<optgroup label={labelForProvider('gemini')}>
							<option value="gemini-1.5-pro-latest"
								>{t('models.gemini.gemini-1_5-pro-latest')}</option
							>
							<option value="gemini-1.5-flash-latest"
								>{t('models.gemini.gemini-1_5-flash-latest')}</option
							>
						</optgroup>
					</select>
					<Button
						type="submit"
						size="sm"
						disabled={!currentPrompt.trim() || isGenerating}
						class="h-8 w-8 p-0 rounded-full"
						aria-label={t('actions.send')}
					>
						<Send class="w-4 h-4" />
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
						class="h-7 px-2 text-xs gap-1.5"
						aria-label={t('a11y.buildFromPlan')}
					>
						<Sparkles class="w-3.5 h-3.5" />
						{t('actions.build')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
</form>
