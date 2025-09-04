<script lang="ts">
	import { X } from '@lucide/svelte';
	interface AnchorRect {
		top: number;
		left: number;
		width: number;
		height: number;
	}
	interface Props {
		isOpen: boolean;
		title: string;
		onClose: () => void;
		showSearch?: boolean;
		searchPlaceholder?: string;
		searchValue?: string;
		onSearch?: (value: string) => void;
		class?: string;
		mode?: 'overlay' | 'popover';
		anchorRect?: AnchorRect | null;
		children?: any;
	}
	let {
		isOpen,
		title,
		onClose,
		showSearch = false,
		searchPlaceholder = 'Search…',
		searchValue = '',
		onSearch,
		class: className = '',
		mode = 'overlay',
		anchorRect = null,
		children
	}: Props = $props();

	function handleSearch(e: Event) {
		const v = (e.currentTarget as HTMLInputElement).value;
		onSearch?.(v);
	}

	const panelWidth = 340; // px (desktop)

	// Click outside handler for popover mode
	let panelRef: HTMLElement | null = $state(null);

	$effect(() => {
		if (isOpen && mode === 'popover' && panelRef) {
			function handleClickOutside(event: MouseEvent) {
				const target = event.target as Node;
				if (panelRef && !panelRef.contains(target)) {
					onClose();
				}
			}

			// Add listener on next tick to avoid immediate closing
			setTimeout(() => {
				document.addEventListener('mousedown', handleClickOutside);
			}, 0);

			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	});
</script>

{#if isOpen}
	{#if mode === 'overlay'}
		<div
			class="fixed inset-0 z-50 {className}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sidepanel-title"
		>
			<div
				class="absolute inset-0 bg-black/30 animate-fade-in"
				onclick={onClose}
				aria-hidden="true"
			></div>
			<aside
				class="absolute right-0 top-0 bg-card/80 border shadow-xl overflow-auto backdrop-blur-sm w-full h-full rounded-none animate-fade-in sm:mt-[65px] sm:mr-4 sm:mb-4 sm:h-[calc(100vh-82px)] sm:w-[340px] sm:rounded-lg sm:animate-slide-in-right"
				aria-labelledby="sidepanel-title"
			>
				<header class="px-3 py-2 border-b flex items-center justify-between">
					<h2 id="sidepanel-title" class="text-sm font-semibold">{title}</h2>
					<button
						onclick={onClose}
						class="p-1 hover:bg-accent rounded transition-colors cursor-pointer"
						aria-label="Close"
						title="Close"
						type="button"
					>
						<X class="size-4" />
					</button>
				</header>
				<main class="p-3">
					{#if showSearch}
						<div class="mb-2">
							<label for="sidepanel-search" class="sr-only">{searchPlaceholder}</label>
							<input
								id="sidepanel-search"
								type="search"
								placeholder={searchPlaceholder}
								class="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background"
								value={searchValue}
								oninput={handleSearch}
							/>
						</div>
					{/if}
					{@render children?.()}
				</main>
			</aside>
		</div>
	{:else}
		<!-- Popover mode: no backdrop, fixed below anchorRect -->
		{#if anchorRect}
			<aside
				bind:this={panelRef}
				class="fixed z-50 bg-card border shadow-xl overflow-auto rounded-lg"
				style={`top:${anchorRect.top + anchorRect.height + 8}px; left:${Math.min(anchorRect.left, Math.max(8, window.innerWidth - panelWidth - 8))}px; width:${panelWidth}px; max-height: calc(100vh - ${anchorRect.top + anchorRect.height + 16}px);`}
				aria-labelledby="sidepanel-title"
			>
				<header class="px-3 py-2 border-b flex items-center justify-between">
					<h2 id="sidepanel-title" class="text-sm font-semibold">{title}</h2>
					<button
						onclick={onClose}
						class="p-1 hover:bg-accent rounded transition-colors cursor-pointer"
						aria-label="Close"
						title="Close"
						type="button"
					>
						<X class="size-4" />
					</button>
				</header>
				<main class="p-3">
					{#if showSearch}
						<div class="mb-2">
							<label for="sidepanel-search" class="sr-only">{searchPlaceholder}</label>
							<input
								id="sidepanel-search"
								type="search"
								placeholder={searchPlaceholder}
								class="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background"
								value={searchValue}
								oninput={handleSearch}
							/>
						</div>
					{/if}
					{@render children?.()}
				</main>
			</aside>
		{/if}
	{/if}
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
		animation: fade-in 0.2s ease-out;
	}
	@keyframes slide-in-right {
		from {
			transform: translateX(8px);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	.sm\:animate-slide-in-right {
		animation: slide-in-right 0.2s ease-out;
	}
</style>
