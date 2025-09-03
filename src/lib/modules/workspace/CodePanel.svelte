<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/shared/ui/button';
	import { Card } from '$lib/shared/ui/card';
	import { GitCompare, Copy, X } from '@lucide/svelte';
	import { diffLines } from '$lib/shared/utils/diff';
	import type { CompilationState, LayoutState } from '$lib/modules/workspace/state';

	interface Props {
		layout: LayoutState;
		compilation: CompilationState;
		onCopy: () => void;
	}

	let { layout, compilation, onCopy }: Props = $props();

	// Bind nested stores for $ auto-subscription
	const showDiff = layout.showDiff;
	const currentCode = compilation.currentCode;
	const previousCode = compilation.previousCode;

	const diffOps = $derived(diffLines($previousCode || '', $currentCode || ''));
</script>

<section class="h-full flex flex-col p-4">
	<header class="pb-4 flex items-center justify-between">
		<h2 class="font-semibold text-sm">Generated Code</h2>
		<div class="flex items-center gap-1">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => layout.toggleDiff()}
				disabled={!$previousCode}
				aria-label={$showDiff ? 'Hide diff view' : 'Show diff vs previous'}
				title={!$previousCode
					? 'No previous version to compare'
					: $showDiff
						? 'Hide Diff'
						: 'Diff vs Previous'}
			>
				<GitCompare class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={onCopy}
				aria-label="Copy code to clipboard"
				title="Copy Code"
			>
				<Copy class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={layout.toggleCode}
				aria-label="Close code panel"
				title="Close"
			>
				<X class="size-4" />
			</Button>
		</div>
	</header>
	<section class="flex-1 overflow-auto">
		{#if $showDiff && $previousCode}
			<div class="grid grid-cols-2 gap-4 h-full">
				<Card class="h-full p-4 font-mono text-xs  overflow-auto">
					<h3 class="font-semibold mb-2">Previous</h3>
					<div>
						{#each diffOps as op, i (i)}
							{#if op.type === 'equal'}
								<div class="whitespace-pre text-xs">{op.a}</div>
							{:else if op.type === 'remove'}
								<div class="whitespace-pre text-xs bg-red-50 text-red-700">{op.a}</div>
							{:else}
								<div class="whitespace-pre text-xs opacity-50"></div>
							{/if}
						{/each}
					</div>
				</Card>
				<Card class="h-full p-4 font-mono text-xs  overflow-auto">
					<h3 class="font-semibold mb-2">Current</h3>
					<div>
						{#each diffOps as op, i (i)}
							{#if op.type === 'equal'}
								<div class="whitespace-pre text-xs">{op.b}</div>
							{:else if op.type === 'add'}
								<div class="whitespace-pre text-xs bg-green-50 text-green-700">
									{op.b}
								</div>
							{:else}
								<div class="whitespace-pre text-xs opacity-50"></div>
							{/if}
						{/each}
					</div>
				</Card>
			</div>
		{:else}
			<Card class="h-full p-4 font-mono text-sm  overflow-auto">
				{#if $currentCode}
					<pre class="whitespace-pre-wrap text-xs">{$currentCode}</pre>
				{:else if browser}
					<p class="text-muted-foreground">Generated Svelte code will appear here...</p>
				{/if}
			</Card>
		{/if}
	</section>
</section>
