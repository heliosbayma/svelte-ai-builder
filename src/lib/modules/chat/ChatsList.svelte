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
	class={`border-t bg-card sm:pb-[var(--chat-offset)] ${
		mode === 'expanded' ? 'h-[60vh] flex flex-col' : 'h-[45vh] flex flex-col sm:h-auto sm:pb-0'
	}`}
>
	<!-- Single sticky bar that stays above input using --chat-offset -->
	<div
		class="flex items-center justify-between px-3 py-2 bg-card/90 flex-shrink-0 sm:sticky sm:bottom-[var(--chat-offset)] sm:z-50"
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
			class={`overflow-y-auto ${mode === 'expanded' ? 'flex-1 min-h-0' : 'flex-1 min-h-0 sm:h-[25vh]'}`}
		>
			{#if children}
				{@render children?.()}
			{:else}
				<div class="p-3 text-xs text-muted-foreground">Messages will appear here</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Fullscreen overlay for Messages -->
{#if mode === 'fullscreen'}
	<div class="fixed inset-0 z-50 bg-background sm:hidden">
		<div class="h-full flex flex-col">
			<div class="p-2 border-b flex items-center justify-between">
				<span class="text-xs text-muted-foreground">Messages</span>
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
			<div class="flex-1 min-h-0 overflow-y-auto">
				{#if children?.fullscreen}
					{@render children.fullscreen()}
				{:else}
					{@render children?.()}
				{/if}
			</div>
		</div>
	</div>
{/if}
