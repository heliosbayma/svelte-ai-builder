<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import { MessageSquare, ChevronDown, ChevronUp, Maximize2, Minimize2, X } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';

	type Mode = 'default' | 'expanded' | 'fullscreen';

	let { collapsed, mode, children }: { collapsed: boolean; mode: Mode; children?: any } = $props();

	const dispatch = createEventDispatcher<{
		openSessions: void;
		collapse: void;
		expand: void;
		fullscreen: void;
		hide: void;
	}>();

	function handleOpenSessions() {
		dispatch('openSessions');
	}

	function handleCollapse() {
		dispatch('collapse');
	}

	function handleExpand() {
		dispatch('expand');
	}

	function handleFullscreen() {
		dispatch('fullscreen');
	}

	function handleHide() {
		dispatch('hide');
	}
</script>

<!-- Inline drawer instance (bar + optional content) -->
<div
	style="--chat-offset: calc(var(--chat-input-h,88px) + 4px);"
	class={`bg-card border-t sm:pb-[var(--chat-offset)] ${
		mode === 'expanded' ? 'flex h-[60vh] flex-col' : 'flex h-[45vh] flex-col sm:h-auto sm:pb-0'
	}`}
>
	<!-- Single sticky bar that stays above input using --chat-offset -->
	<div
		class="bg-card/90 flex flex-shrink-0 items-center justify-between px-3 py-2 sm:sticky sm:bottom-[var(--chat-offset)] sm:z-50"
	>
		<Button
			variant="ghost"
			size="sm"
			onclick={handleOpenSessions}
			aria-label="Messages"
			title="Messages"
			type="button"
		>
			<MessageSquare class="size-4" />
			<span class="ml-1 text-xs">Messages</span>
		</Button>

		<div class="flex items-center gap-1">
			<!-- Hide fullscreen on mobile to simplify -->
			<Button
				variant="ghost"
				size="sm"
				onclick={handleFullscreen}
				aria-label="Fullscreen"
				title="Fullscreen"
				type="button"
				class="hidden sm:inline-flex"
			>
				<Maximize2 class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={handleHide}
				aria-label="Hide"
				title="Hide"
				type="button"
			>
				<X class="size-4" />
			</Button>
		</div>
	</div>

	<!-- Drawer content (always shown on mobile since no collapse/expand buttons) -->
	{#if mode !== 'fullscreen'}
		<div
			class={`overflow-y-auto ${mode === 'expanded' ? 'min-h-0 flex-1' : 'min-h-0 flex-1 sm:h-[25vh]'}`}
		>
			{#if children}
				{@render children?.()}
			{:else}
				<div class="text-muted-foreground p-3 text-xs">Messages will appear here</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Fullscreen overlay for Messages -->
{#if mode === 'fullscreen'}
	<div class="bg-background fixed inset-0 z-50 sm:hidden">
		<div class="flex h-full flex-col">
			<div class="flex items-center justify-between border-b p-2">
				<span class="text-muted-foreground text-xs">Messages</span>
				<div class="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onclick={handleCollapse}
						aria-label="Minimize"
						title="Minimize"
						type="button"
					>
						<Minimize2 class="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleHide}
						aria-label="Close"
						title="Close"
						type="button"
					>
						<X class="size-4" />
					</Button>
				</div>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto">
				{#if children?.fullscreen}
					{@render children.fullscreen()}
				{:else}
					{@render children?.()}
				{/if}
			</div>
		</div>
	</div>
{/if}
