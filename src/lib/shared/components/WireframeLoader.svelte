<script lang="ts">
	interface Props {
		class?: string;
		width?: number;
		height?: number;
	}
	let { class: className = '', width = 94, height = 60 }: Props = $props();
</script>

<svg
	class={`text-primary/80 ${className}`}
	{width}
	{height}
	viewBox="0 0 280 180"
	fill="none"
	stroke="currentColor"
	stroke-width="1.25"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-label="Building wireframe loader"
	role="img"
>
	<rect x="5" y="5" width="270" height="30" class="wf wf-d0" rx="4" ry="4" />
	<rect x="5" y="47" width="170" height="130" class="wf wf-d1" rx="4" ry="4" />
	<rect x="185" y="47" width="95" height="60" class="wf wf-d2" rx="4" ry="4" />
	<rect x="185" y="115" width="95" height="65" class="wf wf-d3" rx="4" ry="4" />
	<line x1="15" y1="62" x2="160" y2="62" class="wf wf-d4" />
	<line x1="15" y1="77" x2="140" y2="77" class="wf wf-d5" />
	<line x1="15" y1="92" x2="150" y2="92" class="wf wf-d6" />
	<line x1="195" y1="75" x2="270" y2="75" class="wf wf-d7" />
	<line x1="195" y1="133" x2="265" y2="133" class="wf wf-d8" />
</svg>

<style>
	/* Smooth draw → slide-out loop */
	@keyframes wf-loop {
		0% {
			stroke-dasharray: 0 420;
			stroke-dashoffset: 0;
		}
		45% {
			stroke-dasharray: 420 0;
			stroke-dashoffset: 0;
		}
		60% {
			stroke-dasharray: 420 0;
			stroke-dashoffset: -40;
		}
		100% {
			stroke-dasharray: 0 420;
			stroke-dashoffset: -420;
		}
	}

	.wf {
		stroke-dasharray: 420;
		stroke-dashoffset: 0;
		animation-name: wf-loop;
		animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
		animation-iteration-count: infinite;
		filter: drop-shadow(0 0 3px currentColor) drop-shadow(0 0 6px currentColor);
		opacity: 0.9;
	}
	/* Individual timings so elements feel alive */
	.wf-d0 {
		animation-duration: 2.6s;
		animation-delay: -0.4s;
	}
	.wf-d1 {
		animation-duration: 3.1s;
		animation-delay: -0.9s;
	}
	.wf-d2 {
		animation-duration: 2.4s;
		animation-delay: -0.6s;
	}
	.wf-d3 {
		animation-duration: 2.9s;
		animation-delay: -1.1s;
	}
	.wf-d4 {
		animation-duration: 2.2s;
		animation-delay: -0.3s;
	}
	.wf-d5 {
		animation-duration: 3.3s;
		animation-delay: -0.7s;
	}
	.wf-d6 {
		animation-duration: 2.7s;
		animation-delay: -1s;
	}
	.wf-d7 {
		animation-duration: 2.5s;
		animation-delay: -0.8s;
	}
	.wf-d8 {
		animation-duration: 3s;
		animation-delay: -1.2s;
	}
</style>
