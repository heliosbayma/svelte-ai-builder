<script lang="ts">
	interface Props {
		type?: 'info' | 'warning' | 'error' | 'success';
		title?: string;
		message?: string;
		actionLabel?: string;
		onAction?: () => void;
		class?: string;
		children?: any;
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

	const styles: Record<NonNullable<Props['type']>, string> = {
		info: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
		warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
		error: 'bg-red-500/10 text-red-700 border-red-500/20',
		success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
	};
</script>

<section
	class={`px-4 py-2 text-xs border flex items-center justify-between ${styles[type]} ${className}`}
>
	<div class="leading-tight sm:flex sm:flex-wrap sm:items-baseline mr-6 min-w-48">
		<strong><p class="block sm:inline mr-3 mb-1 sm:mb-0">{title}</p></strong>
		<p class="block mr-4">{message}</p>
		{@render children?.()}
	</div>
	{#if actionLabel}
		<button class="cursor-pointer underline" onclick={() => onAction?.()} aria-label={actionLabel}>
			{actionLabel}
		</button>
	{/if}
</section>
