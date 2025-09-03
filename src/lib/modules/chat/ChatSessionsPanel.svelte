<script lang="ts">
	import { chatSessionsStore, type ChatSessionMeta } from '$lib/core/stores/chatSessions';
	import { chatStore } from '$lib/core/stores/chat';
	import { Plus, Trash2, Pencil } from '@lucide/svelte';

	interface Props {
		isOpen?: boolean;
		onClose?: () => void;
		embedded?: boolean;
	}
	let { isOpen = true, onClose, embedded = false }: Props = $props();

	function createNew() {
		const id = chatSessionsStore.createSession('New Chat');
		chatSessionsStore.setCurrent(id);
		chatStore.replaceMessages([]);
	}

	function openSession(id: string) {
		chatSessionsStore.setCurrent(id);
		const msgs = chatSessionsStore.getCurrentMessages();
		chatStore.replaceMessages(msgs);
		isOpen = false;
		onClose?.();
	}

	function renameSession(meta: ChatSessionMeta) {
		const title = prompt('Rename chat', meta.title) || meta.title;
		chatSessionsStore.renameSession(meta.id, title.trim());
	}

	function deleteSession(meta: ChatSessionMeta) {
		if (!confirm('Delete this chat?')) return;
		chatSessionsStore.deleteSession(meta.id);
	}
</script>

{#if isOpen}
	<div
		class={embedded
			? 'h-full flex flex-col'
			: 'fixed inset-0 z-50 bg-background/95 sm:bg-background/80 sm:backdrop-blur'}
	>
		<div class={embedded ? 'p-3 h-full' : 'max-w-md mx-auto p-4'}>
			<header class="flex items-center justify-between mb-3">
				<h2 class="text-base font-semibold">Your Chats</h2>
				<button
					class="px-2 py-1 border rounded cursor-pointer"
					onclick={() => {
						isOpen = false;
						onClose?.();
					}}
					aria-label="Close"
				>
					Close
				</button>
			</header>
			<button
				class="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 border rounded cursor-pointer"
				onclick={createNew}
				aria-label="New chat"
			>
				<Plus class="size-4" />
				New Chat
			</button>
			<ul class="space-y-2 overflow-auto {embedded ? 'h-[calc(100%-90px)]' : ''}">
				{#each $chatSessionsStore.sessions as s (s.id)}
					<li class="border rounded p-3 flex items-center justify-between">
						<button
							class="text-left cursor-pointer hover:underline"
							onclick={() => openSession(s.id)}
						>
							<div class="font-medium">{s.title}</div>
							<div class="text-xs opacity-70">{new Date(s.updatedAt).toLocaleString()}</div>
						</button>
						<div class="flex items-center gap-1">
							<button
								class="p-1 rounded hover:bg-accent cursor-pointer"
								onclick={() => renameSession(s)}
								aria-label="Rename"
							>
								<Pencil class="size-4" />
							</button>
							<button
								class="p-1 rounded hover:bg-accent cursor-pointer"
								onclick={() => deleteSession(s)}
								aria-label="Delete"
							>
								<Trash2 class="size-4" />
							</button>
						</div>
					</li>
				{/each}
				{#if $chatSessionsStore.sessions.length === 0}
					<li class="text-sm text-muted-foreground">No chats yet. Create one to get started.</li>
				{/if}
			</ul>
		</div>
		{#if !embedded}
			<div class="h-[max(env(safe-area-inset-bottom),0px)]"></div>
		{/if}
	</div>
{/if}
