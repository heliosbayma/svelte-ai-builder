<script lang="ts">
	import { Input } from '$lib/shared/ui/input';
	import { Label } from '$lib/shared/ui/label';
	import type { ApiKeys } from '$lib/core/stores/apiKeys';

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
		type="password"
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
	{#if error}
		<p id={provider.key + '-key-error'} class="text-xs text-red-500 animate-in fade-in">
			{error}
		</p>
	{/if}
</div>
