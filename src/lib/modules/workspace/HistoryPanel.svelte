<script lang="ts">
	import { historyStore } from '$lib/core/stores/history';
	import { Edit3, X, Code } from '@lucide/svelte';

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
		onClose();
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
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50">
		<button class="absolute inset-0 bg-black/30" onclick={onClose} aria-label="Close history"
		></button>
		<aside
			class="absolute right-0 top-0 mt-[85px] mr-4 mb-4 h-[calc(100vh-101px)] w-[360px] bg-card border shadow-xl rounded-lg history-scrollbar overflow-auto"
		>
			<div class="p-4 border-b flex items-center justify-between">
				<h3 class="font-semibold">History</h3>
				<button
					onclick={onClose}
					class="p-1 hover:bg-accent rounded transition-colors"
					aria-label="Close history"
					title="Close"
				>
					<X class="size-4" />
				</button>
			</div>
			<div class="p-4">
				<div class="mb-3">
					<input
						type="search"
						placeholder="Search versions..."
						class="w-full px-3 py-2 text-sm border rounded-md bg-background"
						value={query}
						oninput={(e) => (query = (e.currentTarget as HTMLInputElement).value)}
						aria-label="Search history"
					/>
				</div>
				{#if $history.versions.length === 0}
					<p class="text-sm text-muted-foreground">No versions yet.</p>
				{:else}
					<ul class="space-y-2">
						{#each filteredIndexes() as idx (idx)}
							{@const v = $history.versions[idx]}
							<li>
								{#if idx === $history.currentIndex}
									<div
										class="w-full p-3 rounded-lg bg-accent/50 border border-primary/20"
										aria-current="true"
										aria-label="Current version"
									>
										<div class="flex items-center justify-between mb-2">
											<div class="text-xs text-muted-foreground">
												{new Date(v.timestamp).toLocaleTimeString()}
											</div>
											<span
												class="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
												>Current</span
											>
										</div>
										<div class="text-sm line-clamp-2">
											{#if v.label}
												<strong class="mr-1">{v.label}:</strong>
											{/if}
											{v.prompt}
										</div>
									</div>
								{:else}
									<div
										class="w-full p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
									>
										<div class="flex items-center justify-between mb-2">
											<div class="text-xs text-muted-foreground flex items-center gap-2">
												<span>{new Date(v.timestamp).toLocaleTimeString()}</span>
												<span class="opacity-70">{v.code?.length || 0} chars</span>
											</div>
											<div class="flex items-center gap-1">
												<button
													class="p-1 hover:bg-accent rounded transition-colors"
													onclick={() => selectVersion(idx)}
													title="Restore & open code"
													aria-label="Restore and open code"
												>
													<Code class="size-4" />
												</button>
												<button
													class="p-1 hover:bg-accent rounded transition-colors"
													onclick={() => {
														const name = prompt('Label this version:', v.label || '');
														if (name != null)
															history.updateCurrentVersion({ label: name.trim() || undefined });
													}}
													title="Rename"
													aria-label="Rename version"
												>
													<Edit3 class="size-3" />
												</button>
											</div>
										</div>
										<div class="text-sm line-clamp-2">
											{#if v.label}
												<strong class="mr-1">{v.label}:</strong>
											{/if}
											{v.prompt}
										</div>
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</aside>
	</div>
{/if}

<style>
	.history-scrollbar::-webkit-scrollbar {
		width: 8px;
	}

	.history-scrollbar::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.history-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.history-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Firefox scrollbar */
	.history-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
</style>
