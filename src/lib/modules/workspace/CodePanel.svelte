<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/shared/ui/button';
	import { Card } from '$lib/shared/ui/card';
	import { GitCompare, Copy, X } from '@lucide/svelte';
	import { diffLines } from '$lib/shared/utils/diff';
	import type { CompilationState, LayoutState } from '$lib/modules/workspace/state';
	import Prism from 'prismjs';
	import 'prism-svelte';
	import 'prismjs/themes/prism-tomorrow.css';

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

	function highlight(code: string): string {
		if (!browser) return code;
		try {
			return (Prism as any).highlight(code, (Prism as any).languages.svelte, 'svelte');
		} catch {
			return code;
		}
	}

	// Unified diff settings
	let showOnlyChanges = $state(true);
	let sideBySide = $state(false); // optional, desktop only

	interface HunkLine {
		kind: 'context' | 'add' | 'remove';
		text: string;
	}
	interface Hunk {
		lines: HunkLine[];
		hidden: boolean; // collapsed
	}

	function buildHunks(ops: ReturnType<typeof diffLines>, context: number): Hunk[] {
		const hunks: Hunk[] = [];
		let current: Hunk | null = null;

		function pushLine(kind: HunkLine['kind'], text: string) {
			if (!current) current = { lines: [], hidden: false };
			current.lines.push({ kind, text });
		}

		// First, coalesce equal/add/remove into a linear list with context
		const equalBlocks: { start: number; end: number }[] = [];
		let i = 0;
		while (i < ops.length) {
			if (ops[i].type === 'equal') {
				const start = i;
				while (i < ops.length && ops[i].type === 'equal') i++;
				equalBlocks.push({ start, end: i - 1 });
			} else i++;
		}

		// Determine which equal ranges to collapse
		const collapseRanges = new Set<number>();
		for (const { start, end } of equalBlocks) {
			const count = end - start + 1;
			if (count > context * 2) {
				for (let k = start + context; k <= end - context; k++) collapseRanges.add(k);
			}
		}

		// Build hunks
		current = null;
		for (let idx = 0; idx < ops.length; idx++) {
			const op = ops[idx];
			if (op.type === 'equal') {
				const isCollapsed = collapseRanges.has(idx);
				if (isCollapsed) {
					if (current) {
						hunks.push(current);
						current = null;
					}
					// collapsed marker hunk
					hunks.push({ lines: [{ kind: 'context', text: `… ${op.a ?? ''}` }], hidden: true });
				} else {
					pushLine('context', op.a ?? '');
				}
			} else if (op.type === 'add') {
				pushLine('add', op.b ?? '');
			} else {
				pushLine('remove', op.a ?? '');
			}
			// When switching from changes back to collapsed marker, finalize the hunk
			const next = ops[idx + 1];
			const boundary =
				!next || (op.type !== 'equal' && next.type === 'equal' && collapseRanges.has(idx + 1));
			if (boundary && current) {
				hunks.push(current);
				current = null;
			}
		}
		if (current) hunks.push(current);
		return hunks;
	}

	function lineClass(kind: HunkLine['kind']): string {
		// keep row taking full width and add a thin gutter border for changes
		if (kind === 'add') return 'w-full min-w-0 border-l-2 border-emerald-500';
		if (kind === 'remove') return 'w-full min-w-0 border-l-2 border-rose-500';
		return 'w-full min-w-0';
	}

	function lineBgClass(kind: HunkLine['kind']): string {
		// keep row clean; color lives mostly under code, with a subtle left border
		return '';
	}

	function preBgClass(kind: HunkLine['kind']): string {
		if (kind === 'add') return 'bg-green-500/10';
		if (kind === 'remove') return 'bg-red-500/10';
		return '';
	}

	function preStyle(): string {
		// always wrap for readability on limited widths
		return 'white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;';
	}
</script>

<section class="h-full min-h-0 flex flex-col p-4">
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
	<section class="flex-1 min-h-0 overflow-hidden">
		{#if $showDiff && $previousCode}
			<div class="flex items-center justify-between mb-2 gap-2 text-xs">
				<label class="flex items-center gap-1 cursor-pointer"
					><input type="checkbox" bind:checked={showOnlyChanges} /> Only changes</label
				>
				<label class="hidden sm:flex items-center gap-1 cursor-pointer"
					><input type="checkbox" bind:checked={sideBySide} /> Side‑by‑side</label
				>
			</div>

			{#if sideBySide}
				<!-- fallback to previous side-by-side when toggled -->
				<div class="h-full min-h-0 flex flex-col sm:flex-row gap-4">
					<Card class="flex-1 min-w-0 h-full min-h-0 p-2 font-mono text-xs flex flex-col">
						<h3 class="font-semibold mb-2">Previous</h3>
						<div class="flex-1 min-h-0 overflow-auto">
							{#each diffOps as op, i (i)}
								{#if op.type === 'equal'}
									<div class="w-full min-w-0">
										<pre
											class={`inline-block text-xs max-h-full px-2 py-0.5`}
											style={preStyle()}><code class="language-svelte"
												>{@html highlight(op.a ?? '')}</code
											></pre>
									</div>
								{:else if op.type === 'remove'}
									<div class={`w-full min-w-0 border-l-2 border-red-500 ${lineBgClass('remove')}`}>
										<pre
											class={`inline-block text-xs max-h-full px-2 py-0.5 ${preBgClass('remove')}`}
											style={preStyle()}><code class="language-svelte"
												>{@html highlight(op.a ?? '')}</code
											></pre>
									</div>
								{:else}
									<div class="whitespace-pre text-xs opacity-50"></div>
								{/if}
							{/each}
						</div>
					</Card>
					<Card class="flex-1 min-w-0 h-full min-h-0 p-2 font-mono text-xs flex flex-col">
						<h3 class="font-semibold mb-2">Current</h3>
						<div class="flex-1 min-h-0 overflow-auto">
							{#each diffOps as op, i (i)}
								{#if op.type === 'equal'}
									<div class="w-full min-w-0">
										<pre
											class={`inline-block text-xs max-h-full px-2 py-0.5`}
											style={preStyle()}><code class="language-svelte"
												>{@html highlight(op.b ?? '')}</code
											></pre>
									</div>
								{:else if op.type === 'add'}
									<div class={`w-full min-w-0 border-l-2 border-green-500 ${lineBgClass('add')}`}>
										<pre
											class={`inline-block text-xs max-h-full px-2 py-0.5 ${preBgClass('add')}`}
											style={preStyle()}><code class="language-svelte"
												>{@html highlight(op.b ?? '')}</code
											></pre>
									</div>
								{:else}
									<div class="whitespace-pre text-xs opacity-50"></div>
								{/if}
							{/each}
						</div>
					</Card>
				</div>
			{:else}
				<!-- unified inline diff -->
				<Card class="h-full min-h-0 p-2 font-mono text-xs flex flex-col">
					<div class="flex-1 min-h-0 overflow-auto">
						{#each buildHunks(diffOps, 3) as hunk, hi (hi)}
							{#if hunk.hidden}
								<div class="text-xs text-muted-foreground my-1">
									<button
										class="underline cursor-pointer"
										onclick={() => (showOnlyChanges = false)}
										aria-label="Show context">{hunk.lines[0].text}</button
									>
								</div>
							{:else}
								{#each hunk.lines as line, li (li)}
									{#if !(showOnlyChanges && line.kind === 'context')}
										<div
											class={`grid grid-cols-[auto_1fr] gap-2 items-start ${lineClass(line.kind)} ${line.kind === 'context' ? 'text-foreground/80' : ''}`}
										>
											<span class="px-1 text-xs select-none"
												>{line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}</span
											>
											<pre
												class={`inline-block text-xs max-h-full px-2 py-0.5 ${preBgClass(line.kind)}`}
												style={preStyle()}><code class="language-svelte"
													>{@html highlight(line.text)}</code
												></pre>
										</div>
									{/if}
								{/each}
							{/if}
						{/each}
					</div>
				</Card>
			{/if}
		{:else}
			<Card class="h-full min-h-0 p-2 font-mono text-sm flex flex-col">
				<div class="flex-1 min-h-0 overflow-auto">
					{#if $currentCode}
						<pre class={`inline-block text-xs max-h-full px-2 py-0.5`} style={preStyle()}><code
								class="language-svelte">{@html highlight($currentCode ?? '')}</code
							></pre>
					{:else if browser}
						<p class="text-muted-foreground">Generated Svelte code will appear here...</p>
					{/if}
				</div>
			</Card>
		{/if}
	</section>
</section>

<style>
	/* Neutralize Prism backgrounds so our diff colors span full width */
	:global(pre[class*='language-']) {
		background: transparent !important;
		margin: 0 !important;
		border-radius: 0 !important;
	}
	:global(code[class*='language-']) {
		background: transparent !important;
	}
</style>
