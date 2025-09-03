import { writable, get } from 'svelte/store';
import type { ChatMessage } from './chat';
import { createPersistor } from '$lib/shared/utils';

export interface ChatSessionMeta {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
}

export interface ChatSessionsState {
	sessions: ChatSessionMeta[];
	currentId: string | null;
	messagesById: Record<string, ChatMessage[]>;
}

function createChatSessionsStore() {
	const initial: ChatSessionsState = {
		sessions: [],
		currentId: null,
		messagesById: {}
	};

	const persist = createPersistor<ChatSessionsState>({
		key: 'chat-sessions',
		version: 1,
		debounceMs: 200
	});
	const restored0 = persist.load(initial);
	// Provide a mocked list if empty for testing UX
	const restored: ChatSessionsState = restored0.sessions.length
		? restored0
		: {
				sessions: [
					{
						id: 'mock-1',
						title: 'Landing page hero',
						createdAt: Date.now() - 86400000,
						updatedAt: Date.now() - 86000000
					},
					{
						id: 'mock-2',
						title: 'Pricing table v2',
						createdAt: Date.now() - 5400000,
						updatedAt: Date.now() - 5300000
					},
					{
						id: 'mock-3',
						title: 'Signup form tweaks',
						createdAt: Date.now() - 3600000,
						updatedAt: Date.now() - 3500000
					}
				],
				currentId: null,
				messagesById: {
					'mock-1': [],
					'mock-2': [],
					'mock-3': []
				}
			};
	const { subscribe, update } = writable<ChatSessionsState>(restored);

	function touch(meta: ChatSessionMeta): ChatSessionMeta {
		return { ...meta, updatedAt: Date.now() };
	}

	return {
		subscribe,
		createSession: (title = 'New Chat'): string => {
			const id = crypto.randomUUID();
			const now = Date.now();
			const meta: ChatSessionMeta = { id, title, createdAt: now, updatedAt: now };
			update((s) => {
				const next: ChatSessionsState = {
					sessions: [meta, ...s.sessions],
					currentId: id,
					messagesById: { ...s.messagesById, [id]: [] }
				};
				persist.save(next);
				return next;
			});
			return id;
		},
		renameSession: (id: string, title: string) => {
			update((s) => {
				const next: ChatSessionsState = {
					...s,
					sessions: s.sessions.map((m) => (m.id === id ? touch({ ...m, title }) : m))
				};
				persist.save(next);
				return next;
			});
		},
		deleteSession: (id: string) => {
			update((s) => {
				const { [id]: _, ...rest } = s.messagesById;
				let nextCurrent = s.currentId;
				const sessions = s.sessions.filter((m) => m.id !== id);
				if (nextCurrent === id) nextCurrent = sessions[0]?.id ?? null;
				const next: ChatSessionsState = { sessions, currentId: nextCurrent, messagesById: rest };
				persist.save(next);
				return next;
			});
		},
		setCurrent: (id: string) => {
			update((s) => {
				const exists = s.sessions.some((m) => m.id === id);
				if (!exists) return s;
				const next = { ...s, currentId: id };
				persist.save(next);
				return next;
			});
		},
		setMessagesForCurrent: (messages: ChatMessage[]) => {
			update((s) => {
				if (!s.currentId) return s;
				const next: ChatSessionsState = {
					...s,
					messagesById: { ...s.messagesById, [s.currentId]: messages }
				};
				persist.save(next);
				return next;
			});
		},
		getCurrentMessages: (): ChatMessage[] => {
			const s = get({ subscribe });
			return s.currentId ? s.messagesById[s.currentId] || [] : [];
		}
	};
}

export const chatSessionsStore = createChatSessionsStore();
