<script lang="ts">
	import { chatSessionsStore, type ChatSessionMeta } from '$lib/core/stores/chatSessions';
	import { chatStore } from '$lib/core/stores/chat';
	import { Plus, Trash2, Pencil, X } from '@lucide/svelte';
	import { historyStore } from '$lib/core/stores/historyScoped';
	import SidePanel from '$lib/shared/components/SidePanel.svelte';

	interface Props {
		isOpen?: boolean;
		onClose?: () => void;
		onNewChat?: () => void;
		onOpenSession?: (sessionId: string) => void;
		mode?: 'overlay' | 'popover';
		anchorRect?: { top: number; left: number; width: number; height: number } | null;
	}
	let {
		isOpen = true,
		onClose = () => (isOpen = false),
		onNewChat,
		onOpenSession,
		mode = 'overlay',
		anchorRect = null
	}: Props = $props();

	let query = $state('');

	function createNew() {
		const id = chatSessionsStore.createSession('New Chat');
		chatSessionsStore.setCurrent(id);
		chatStore.replaceMessages([]);
		historyStore.setCurrentSession(id);
		onNewChat?.();
	}

	function openSession(id: string) {
		chatSessionsStore.setCurrent(id);
		const msgs = chatSessionsStore.getCurrentMessages();
		chatStore.replaceMessages(msgs);
		historyStore.setCurrentSession(id);
		isOpen = false;
		onClose?.();
		onOpenSession?.(id);
	}

	function renameSession(meta: ChatSessionMeta) {
		const title = prompt('Rename chat', meta.title) || meta.title;
		chatSessionsStore.renameSession(meta.id, title.trim());
	}

	function deleteSession(meta: ChatSessionMeta) {
		if (!confirm('Delete this chat?')) return;
		chatSessionsStore.deleteSession(meta.id);
	}

	function filteredSessions(): ChatSessionMeta[] {
		const q = query.trim().toLowerCase();
		const list = $chatSessionsStore.sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);
		if (!q) return list;
		return list.filter((s) => s.title.toLowerCase().includes(q));
	}
</script>

<SidePanel
	{isOpen}
	title="Your Chats"
	{onClose}
	showSearch={true}
	searchPlaceholder="Search chats..."
	searchValue={query}
	onSearch={(v) => (query = v)}
	{mode}
	{anchorRect}
>
	<button
		class="w-full mb-2 flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs border rounded cursor-pointer"
		onclick={createNew}
		aria-label="New chat"
		type="button"
	>
		<Plus class="size-3.5" />
		<span>New Chat</span>
	</button>
	<section aria-label="Chats list">
		<ul class="space-y-1.5" role="list">
			{#each filteredSessions() as s (s.id)}
				<li role="listitem">
					<article
						class="w-full p-2.5 rounded-lg border hover:bg-accent transition-colors border-transparent hover:border-border flex items-center justify-between"
					>
						<button
							class="flex-1 text-left cursor-pointer"
							onclick={() => openSession(s.id)}
							aria-label={`Open chat ${s.title}`}
							type="button"
						>
							<div class="text-sm font-medium">{s.title}</div>
							<div class="text-[10px] opacity-70">{new Date(s.updatedAt).toLocaleString()}</div>
						</button>
						<div class="flex items-center gap-1">
							<button
								class="p-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer opacity-60 hover:opacity-100"
								onclick={(e) => {
									e.stopPropagation();
									renameSession(s);
								}}
								aria-label="Rename"
								type="button"
							>
								<Pencil class="size-4" />
							</button>
							<button
								class="p-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer opacity-60 hover:opacity-100"
								onclick={(e) => {
									e.stopPropagation();
									deleteSession(s);
								}}
								aria-label="Delete"
								type="button"
							>
								<Trash2 class="size-4" />
							</button>
						</div>
					</article>
				</li>
			{/each}
			{#if filteredSessions().length === 0}
				<li class="text-xs text-muted-foreground">No chats found.</li>
			{/if}
		</ul>
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
</style>
