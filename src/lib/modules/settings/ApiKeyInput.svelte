<script lang="ts">
	import { Input } from '$lib/shared/ui/input';
	import { Label } from '$lib/shared/ui/label';
	import type { ApiKeys } from '$lib/core/stores/apiKeys';
	import { Button } from '$lib/shared/ui/button';

	interface Props {
		provider: {
			key: keyof ApiKeys;
			label: string;
			placeholder: string;
			hint: string;
		};
		value: string | null;
		error: string;
		onInput: (value: string) => void;
	}

	let { provider, value, error, onInput }: Props = $props();
	let reveal = $state(false);

	function handleInput(e: Event) {
		if (e.currentTarget instanceof HTMLInputElement) {
			onInput(e.currentTarget.value);
		}
	}
</script>

<div class="space-y-2">
	<Label for={provider.key + '-key'} class="flex items-center gap-2">
		{provider.label}
		<a
			href={`https://${provider.hint}`}
			target="_blank"
			rel="noopener"
			class="text-xs text-muted-foreground hover:underline ml-auto"
		>
			Get key →
		</a>
	</Label>
	<Input
		id={provider.key + '-key'}
		type={reveal ? 'text' : 'password'}
		placeholder={provider.placeholder}
		value={value || ''}
		oninput={handleInput}
		autocomplete="off"
		autocapitalize="off"
		spellcheck={false}
		inputmode="text"
		aria-invalid={!!error}
		aria-describedby={provider.key + '-key-error'}
		class={error ? 'border-red-500 focus:ring-red-500' : ''}
	/>
	<div class="flex items-center justify-between">
		<button
			class="text-xs text-muted-foreground hover:underline"
			type="button"
			onclick={() => (reveal = !reveal)}
			aria-pressed={reveal}
			aria-label={reveal ? 'Hide API key' : 'Show API key'}
		>
			{reveal ? 'Hide' : 'Show'}
		</button>
		<span class="text-[11px] text-muted-foreground">Keys are stored locally and encrypted</span>
	</div>
	{#if error}
		<p id={provider.key + '-key-error'} class="text-xs text-red-500 animate-in fade-in">
			{error}
		</p>
	{/if}
</div>
