<script lang="ts">
	interface Props {
		label?: string;
		title?: string;
		ariaLabel?: string;
		class?: string;
		buttonClass?: string;
		onClick?: () => void;
	}
	let {
		label = 'AI Svelte Builder',
		title = '',
		ariaLabel = '',
		class: className = '',
		buttonClass = '',
		onClick
	}: Props = $props();
</script>

<h1 class={`flex items-center leading-none ${className}`}>
	<button
		class={`m-0 inline-flex h-8 cursor-pointer items-center border-0 bg-transparent p-0 font-semibold tracking-tight select-none ${buttonClass}`}
		type="button"
		onclick={onClick}
		{title}
		aria-label={ariaLabel}
	>
		{label}
	</button>
</h1>
