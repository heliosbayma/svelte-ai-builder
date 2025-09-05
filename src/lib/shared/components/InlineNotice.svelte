<script lang="ts">
	interface Props {
		type?: 'info' | 'warning' | 'error' | 'success';
		title?: string;
		message?: string;
		actionLabel?: string;
		onAction?: () => void;
		class?: string;
		children?: any; // For Svelte 5 render children
	}
	let {
		type = 'info',
		title,
		message = '',
		actionLabel,
		onAction,
		class: className = '',
		children
	}: Props = $props();

	const stylesDefault: Record<NonNullable<Props['type']>, string> = {
		info: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
		warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
		error: 'bg-red-500/10 text-red-400 border-red-500/20',
		success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
	};

	const actionNeutral =
		'cursor-pointer h-6 px-2 whitespace-nowrap rounded-sm border border-current/30 bg-transparent text-current hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25 transition-colors';
</script>

<section
	class={`flex items-center gap-3 border px-3 py-4 text-xs ${stylesDefault[type]} ${className}`}
>
	<div class="leading-tight sm:flex sm:flex-wrap sm:items-center">
		<p class="inline mr-8">{title}</p>
		{#if message}
			<p class="block sm:ml-1">{message}</p>
		{/if}
		{@render children?.()}
		{#if actionLabel}
			<button
				class={actionNeutral}
				onclick={() => onAction?.()}
				aria-label={actionLabel}
				type="button"
			>
				{actionLabel}
			</button>
		{/if}
	</div>
</section>
