<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { Textarea } from '$lib/shared/ui/textarea';
	import { t } from '$lib/shared/utils/i18n';
	import { Send, X, Sparkles } from '@lucide/svelte';

	interface Props {
		currentPrompt: string;
		isGenerating: boolean;
		sendOnEnter: boolean;
		modelInput: string;
		pendingPlan: string;
		onPromptChange: (value: string) => void;
		onSubmit: () => void;
		onCancel: () => void;
		onBuildFromPlan: () => void;
		onSendOnEnterChange: (checked: boolean) => void;
		onModelChange: (model: string) => void;
	}

	let {
		currentPrompt,
		isGenerating,
		sendOnEnter,
		modelInput,
		pendingPlan,
		onPromptChange,
		onSubmit,
		onCancel,
		onBuildFromPlan,
		onSendOnEnterChange,
		onModelChange
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
</script>

<form onsubmit={handleSubmit} class="border-t p-4 space-y-3" aria-label="Message input form">
	<fieldset>
		<legend class="sr-only">Send message to generate Svelte component</legend>
		<Textarea
			bind:value={currentPrompt}
			onkeydown={handleKeydown}
			oninput={autoGrow}
			placeholder={t('chat.placeholder')}
			class="w-full min-h-[60px] max-h-[200px] resize-none"
			disabled={isGenerating}
			aria-label="Component description input"
			data-chat-textarea
		/>
	</fieldset>

	<!-- Action buttons below textarea -->
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			{#if isGenerating}
				<Button
					variant="outline"
					size="sm"
					onclick={onCancel}
					class="h-8 px-3 text-xs gap-1.5"
					aria-label="Cancel generation"
				>
					<X class="w-3.5 h-3.5" />
					{t('actions.cancel')}
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
					{t('actions.send')}
				</Button>
				{#if pendingPlan}
					<Button
						variant="outline"
						size="sm"
						onclick={onBuildFromPlan}
						disabled={isGenerating}
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
				value={modelInput}
				onchange={handleModelChange}
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
</form>
