<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { Textarea } from '$lib/shared/ui/textarea';
	import { t } from '$lib/shared/utils/i18n';
	import { Send, X, Sparkles } from '@lucide/svelte';
	import { LLM_PROVIDERS } from '$lib/shared/constants/providers';

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
		showProviderChips?: boolean;
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
		showProviderChips = false
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

	const charCount = $derived(currentPrompt.length);
	const lineCount = $derived(currentPrompt ? currentPrompt.split('\n').length : 0);

	function labelForProvider(key: 'openai' | 'anthropic' | 'gemini'): string {
		const p = LLM_PROVIDERS.find((p) => p.key === key);
		return p?.label ?? key;
	}
</script>

<form
	onsubmit={handleSubmit}
	class="p-4 space-y-3 max-w-full overflow-hidden"
	aria-label={t('chat.inputForm')}
>
	<fieldset>
		<legend class="sr-only">Send message to generate Svelte component</legend>
		<div class="mt-1 text-[11px] text-slate-500 flex items-center justify-end gap-2">
			<span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
			<span>•</span>
			<span>{charCount} chars</span>
		</div>
		<Textarea
			bind:value={currentPrompt}
			onkeydown={handleKeydown}
			oninput={autoGrow}
			placeholder={t('chat.placeholder')}
			class="w-full min-h-[60px] max-h-[200px] resize-none"
			style="max-width: 100%; overflow-x: hidden; word-break: break-all; overflow-wrap: anywhere; white-space: pre-wrap;"
			disabled={isGenerating}
			aria-label={t('chat.inputLabel')}
			data-chat-textarea
		/>
	</fieldset>

	<!-- Action rows -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			{#if isGenerating}
				<Button
					variant="outline"
					size="sm"
					onclick={onCancel}
					class="h-8 px-3 text-xs gap-1.5"
					aria-label={t('a11y.cancelGeneration')}
				>
					<div
						class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
						aria-hidden="true"
					></div>
					{t('actions.cancel')}
				</Button>
			{:else}
				<Button
					type="submit"
					size="sm"
					disabled={!currentPrompt.trim()}
					class="h-8 px-3 text-xs gap-1.5"
					aria-label={t('actions.send')}
				>
					<Send class="w-3.5 h-3.5" />
					{t('actions.send')}
				</Button>
				{#if pendingPlan}
					<Button
						variant="outline"
						size="sm"
						onclick={onBuildFromPlan}
						disabled={isGenerating}
						class="h-8 px-3 text-xs gap-1.5"
						aria-label={t('a11y.buildFromPlan')}
					>
						<Sparkles class="w-3.5 h-3.5" />
						{t('actions.build')}
					</Button>
				{/if}
			{/if}
		</div>

		<!-- Model selector -->
		<select
			class="h-8 text-xs bg-transparent text-slate-500 border-0 outline-none focus:outline-none focus:ring-0 hover:text-foreground cursor-pointer appearance-none"
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
				<option value="gemini-1.5-pro-latest">{t('models.gemini.gemini-1_5-pro-latest')}</option>
				<option value="gemini-1.5-flash-latest">{t('models.gemini.gemini-1_5-flash-latest')}</option
				>
			</optgroup>
		</select>

		<!-- Right side options -->
		<div class="flex items-center gap-3 text-xs text-slate-500">
			<label
				class="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
			>
				<input
					type="checkbox"
					checked={sendOnEnter}
					oninput={handleToggleSendOnEnter}
					aria-label={t('a11y.toggleSendOnEnter')}
					class="w-3 h-3"
				/>
				<span>{sendOnEnter ? t('chat.sendOnEnter') : t('chat.sendWithCmd')}</span>
			</label>
		</div>

		{#if showProviderChips}
			<!-- Provider chips (wrap on small widths) -->
			<div
				class="flex items-center gap-1 flex-wrap basis-full mt-2"
				aria-label="Provider selection"
			>
				<button
					class={`h-8 px-2 text-xs rounded-md border shrink-0 ${lastProvider === 'openai' ? 'bg-accent' : 'bg-background'} ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
					disabled={isGenerating}
					onclick={() => onProviderChange?.('openai')}
					title={labelForProvider('openai')}
					aria-pressed={lastProvider === 'openai'}
					aria-label={labelForProvider('openai')}>{labelForProvider('openai')}</button
				>
				<button
					class={`h-8 px-2 text-xs rounded-md border shrink-0 ${lastProvider === 'anthropic' ? 'bg-accent' : 'bg-background'} ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
					disabled={isGenerating}
					onclick={() => onProviderChange?.('anthropic')}
					title={labelForProvider('anthropic')}
					aria-pressed={lastProvider === 'anthropic'}
					aria-label={labelForProvider('anthropic')}>{labelForProvider('anthropic')}</button
				>
				<button
					class={`h-8 px-2 text-xs rounded-md border shrink-0 ${lastProvider === 'gemini' ? 'bg-accent' : 'bg-background'} ${isGenerating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
					disabled={isGenerating}
					onclick={() => onProviderChange?.('gemini')}
					title={labelForProvider('gemini')}
					aria-pressed={lastProvider === 'gemini'}
					aria-label={labelForProvider('gemini')}>{labelForProvider('gemini')}</button
				>
			</div>
		{/if}
	</div>
</form>
