import { writable } from 'svelte/store';
import type { LLMProviderType } from '$lib/services/llm';
import { createPersistor } from '$lib/utils';
import { historyStore } from '$lib/stores/history';

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	provider?: LLMProviderType;
	generatedCode?: string;
	streaming?: boolean;
	error?: string;
	linkedVersionId?: string;
	codeLength?: number;
}

export interface ChatState {
	messages: ChatMessage[];
	isGenerating: boolean;
	currentProvider: LLMProviderType | null;
	currentRequestId: string | null;
}

function createChatStore() {
	const initialState: ChatState = {
		messages: [],
		isGenerating: false,
		currentProvider: null,
		currentRequestId: null
	};

	const persist = createPersistor<ChatState>({
		key: 'chat',
		version: 1,
		debounceMs: 200,
		serialize: (s) => ({
			// Do not persist generatedCode or streaming to avoid duplication with history and transient flags
			messages: s.messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				timestamp: m.timestamp,
				provider: m.provider,
				linkedVersionId: m.linkedVersionId,
				codeLength: m.codeLength
			})),
			isGenerating: false,
			currentProvider: null,
			currentRequestId: null
		}),
		deserialize: (raw) => {
			const r = raw as Partial<ChatState> | null;
			if (!r || !Array.isArray(r.messages)) return null;
			return {
				// Ensure generatedCode is not restored from persistence
				messages: r.messages.slice(-200).map((m: Partial<ChatMessage>) => ({
					id: String(m.id),
					role: (m.role ?? 'assistant') as ChatMessage['role'],
					content: String(m.content ?? ''),
					timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
					provider: m.provider as LLMProviderType | undefined,
					linkedVersionId: m.linkedVersionId ? String(m.linkedVersionId) : undefined,
					codeLength: typeof m.codeLength === 'number' ? m.codeLength : undefined
				})),
				isGenerating: false,
				currentProvider: null,
				currentRequestId: null
			};
		}
	});

	function rehydrateFromHistory(state: ChatState): ChatState {
		try {
			const messages = state.messages.map((m) => {
				if (m.role === 'assistant' && m.linkedVersionId && !m.generatedCode) {
					const v = historyStore.getVersionById(m.linkedVersionId);
					if (v?.code) {
						return { ...m, generatedCode: v.code, codeLength: m.codeLength ?? v.code.length };
					}
				}
				return m;
			});
			return { ...state, messages };
		} catch {
			return state;
		}
	}

	const restored = persist.load(initialState);
	const restoredHydrated = rehydrateFromHistory(restored);
	const { subscribe, set, update } = writable(restoredHydrated);
	// Non-persisted map for in-flight request controllers
	const controllers = new Map<string, AbortController>();

	return {
		subscribe,

		addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
			const chatMessage: ChatMessage = {
				...message,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};

			update((state) => {
				const next = { ...state, messages: [...state.messages, chatMessage] };
				persist.save(next);
				return next;
			});

			return chatMessage.id;
		},

		updateMessage: (id: string, updates: Partial<ChatMessage>) => {
			update((state) => {
				const next = {
					...state,
					messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
				};
				persist.save(next);
				return next;
			});
		},

		startGeneration: (provider: LLMProviderType, requestId: string) => {
			update((state) => {
				const next = {
					...state,
					isGenerating: true,
					currentProvider: provider,
					currentRequestId: requestId
				};
				persist.save(next);
				return next;
			});
		},

		registerRequest: (requestId: string, controller: AbortController) => {
			controllers.set(requestId, controller);
		},

		abortCurrent: () => {
			update((state) => {
				const id = state.currentRequestId;
				if (id && controllers.has(id)) {
					try {
						controllers.get(id)?.abort();
					} catch {
						// ignore
					}
					controllers.delete(id);
				}
				const next = {
					...state,
					isGenerating: false,
					currentProvider: null,
					currentRequestId: null
				};
				persist.save(next);
				return next;
			});
		},

		stopGeneration: () => {
			update((state) => {
				if (state.currentRequestId) controllers.delete(state.currentRequestId);
				const next = {
					...state,
					isGenerating: false,
					currentProvider: null,
					currentRequestId: null
				};
				persist.save(next);
				return next;
			});
		},

		clear: () => {
			set(initialState);
			persist.clear();
		},

		// For undo/redo system - get messages with generated code
		getComponentVersions: () => {
			let messages: ChatMessage[] = [];
			const unsubscribe = subscribe((state) => {
				messages = state.messages;
			});
			unsubscribe();

			return messages
				.filter((msg) => msg.role === 'assistant' && msg.generatedCode)
				.map((msg) => ({
					id: msg.id,
					timestamp: msg.timestamp,
					prompt:
						messages.find((m) => m.timestamp < msg.timestamp && m.role === 'user')?.content || '',
					code: msg.generatedCode!,
					provider: msg.provider!
				}));
		},

		linkLatestAssistantToVersion: (versionId: string, codeLength: number) => {
			update((state) => {
				const idxFromEnd = [...state.messages].reverse().findIndex((m) => m.role === 'assistant');
				if (idxFromEnd === -1) return state;
				const absolute = state.messages.length - 1 - idxFromEnd;
				const next = {
					...state,
					messages: state.messages.map((m, i) =>
						i === absolute ? { ...m, linkedVersionId: versionId, codeLength } : m
					)
				};
				persist.save(next);
				return next;
			});
		},

		rehydrateNow: () => {
			update((state) => rehydrateFromHistory(state));
		}
	};
}

export const chatStore = createChatStore();
