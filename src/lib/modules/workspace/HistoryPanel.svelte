<script lang="ts">
	import { historyStore } from '$lib/core/stores/historyScoped';
	import type { ComponentVersion } from '$lib/core/stores/historyScoped';
	import { Edit3, X } from '@lucide/svelte';
	import SidePanel from '$lib/shared/components/SidePanel.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSelectVersion?: (index: number) => void;
	}

	let { isOpen, onClose, onSelectVersion }: Props = $props();

	const history = historyStore;
	let query = $state('');

	function selectVersion(index: number) {
		onSelectVersion?.(index);
	}

	function filteredIndexes(): number[] {
		const q = query.trim().toLowerCase();
		const all = $history.versions.map((_, i) => i);
		if (!q) return all.slice();
		return all.filter((i) => {
			const v = $history.versions[i];
			return (v.label && v.label.toLowerCase().includes(q)) || v.prompt.toLowerCase().includes(q);
		});
	}

	function handleRename(idx: number, currentLabel?: string) {
		const name = prompt('Label this version:', currentLabel || '');
		if (name != null) {
			history.updateVersionLabel(idx, name.trim() || undefined);
		}
	}

	function handleKeydown(e: KeyboardEvent, idx: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			selectVersion(idx);
		}
	}
</script>

{#snippet versionCard(version: ComponentVersion, index: number, isCurrent: boolean)}
	<article
		class="w-full rounded-lg border p-2.5 {isCurrent
			? 'bg-accent/50 border-primary/20'
			: 'hover:bg-accent hover:border-border cursor-pointer border-transparent transition-colors'}"
		{...!isCurrent && {
			onclick: () => selectVersion(index),
			role: 'button',
			tabindex: 0,
			onkeydown: (e) => handleKeydown(e, index),
			title: 'Click to restore this version',
			'aria-label': 'Restore this version'
		}}
		{...isCurrent && {
			'aria-current': 'true',
			'aria-label': 'Current version'
		}}
	>
		<header class="mb-1.5 flex items-center justify-between">
			<div class="text-muted-foreground flex items-center gap-2 text-[11px]">
				<time datetime={new Date(version.timestamp).toISOString()}>
					{new Date(version.timestamp).toLocaleTimeString()}
				</time>
				{#if !isCurrent}
					<span class="text-[10px] opacity-70" aria-label="Code length"
						>{version.code?.length || 0} chars</span
					>
				{/if}
			</div>

			{#if isCurrent}
				<span
					class="bg-primary/10 text-primary border-primary/20 rounded-full border px-2 py-0.5 text-xs"
					role="status"
					aria-label="Current active version"
				>
					Current
				</span>
			{:else}
				<div class="flex items-center gap-1">
					<button
						class="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded p-1 opacity-60 transition-colors hover:opacity-100"
						onclick={(e) => {
							e.stopPropagation();
							handleRename(index, version.label);
						}}
						title="Rename this version"
						aria-label="Rename version"
						type="button"
					>
						<Edit3 class="size-3" />
					</button>
				</div>
			{/if}
		</header>

		<div class="line-clamp-2 text-[13px]">
			{#if version.label}
				<strong class="mr-1">{version.label}:</strong>
			{/if}
			{version.prompt}
		</div>
	</article>
{/snippet}

<SidePanel
	{isOpen}
	title="Version History"
	{onClose}
	showSearch={true}
	searchPlaceholder="Search versions..."
	searchValue={query}
	onSearch={(v) => (query = v)}
>
	<section aria-label="Version history">
		{#if $history.versions.length === 0}
			<p class="text-muted-foreground text-xs">No versions yet.</p>
		{:else}
			<ul class="space-y-1.5" role="list">
				{#each filteredIndexes() as idx (idx)}
					{@const version = $history.versions[idx]}
					{@const isCurrent = idx === $history.currentIndex}
					<li role="listitem">
						{@render versionCard(version, idx, isCurrent)}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</SidePanel>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}

	.animate-slide-in-right {
		animation: slide-in-right 0.3s ease-out;
	}
</style>
