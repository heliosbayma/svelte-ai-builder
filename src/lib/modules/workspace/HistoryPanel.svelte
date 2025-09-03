<script lang="ts">
	import { historyStore } from '$lib/core/stores/history';
	import type { ComponentVersion } from '$lib/core/stores/history';
	import { Edit3, X } from '@lucide/svelte';

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

{#if isOpen}
	<div class="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="history-title">
		<div
			class="absolute inset-0 bg-black/30 animate-fade-in"
			onclick={onClose}
			aria-hidden="true"
		></div>
		<aside
			class="absolute right-0 top-0 mt-[65px] mr-4 mb-4 h-[calc(100vh-82px)] w-[360px] bg-card/80 border shadow-xl rounded-lg overflow-auto backdrop-blur-sm animate-slide-in-right"
			aria-labelledby="history-title"
		>
			<header class="p-4 border-b flex items-center justify-between">
				<h2 id="history-title" class="font-semibold">Version History</h2>
				<button
					onclick={onClose}
					class="p-1 hover:bg-accent rounded transition-colors cursor-pointer"
					aria-label="Close history panel"
					title="Close"
					type="button"
				>
					<X class="size-4" />
				</button>
			</header>
			<main class="p-4">
				<div class="mb-3">
					<label for="version-search" class="sr-only">Search version history</label>
					<input
						id="version-search"
						type="search"
						placeholder="Search versions..."
						class="w-full px-3 py-2 text-sm border rounded-md bg-background"
						value={query}
						oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)}
					/>
				</div>
				{#snippet versionCard(version: ComponentVersion, index: number, isCurrent: boolean)}
					<article
						class="w-full p-3 rounded-lg border {isCurrent
							? 'bg-accent/50 border-primary/20'
							: 'hover:bg-accent transition-colors border-transparent hover:border-border cursor-pointer'}"
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
						<header class="flex items-center justify-between mb-2">
							<div class="text-xs text-muted-foreground flex items-center gap-2">
								<time datetime={new Date(version.timestamp).toISOString()}>
									{new Date(version.timestamp).toLocaleTimeString()}
								</time>
								{#if !isCurrent}
									<span class="opacity-70" aria-label="Code length"
										>{version.code?.length || 0} chars</span
									>
								{/if}
							</div>

							{#if isCurrent}
								<span
									class="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
									role="status"
									aria-label="Current active version"
								>
									Current
								</span>
							{:else}
								<div class="flex items-center gap-1">
									<button
										class="p-1 hover:bg-accent hover:text-accent-foreground rounded transition-colors cursor-pointer opacity-60 hover:opacity-100"
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

						<div class="text-sm line-clamp-2">
							{#if version.label}
								<strong class="mr-1">{version.label}:</strong>
							{/if}
							{version.prompt}
						</div>
					</article>
				{/snippet}

				{#if $history.versions.length === 0}
					<p class="text-sm text-muted-foreground">No versions yet.</p>
				{:else}
					<section aria-label="Version history">
						<ul class="space-y-2" role="list">
							{#each filteredIndexes() as idx (idx)}
								{@const version = $history.versions[idx]}
								{@const isCurrent = idx === $history.currentIndex}
								<li role="listitem">
									{@render versionCard(version, idx, isCurrent)}
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</main>
		</aside>
	</div>
{/if}

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
