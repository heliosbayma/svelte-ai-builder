import { writable } from 'svelte/store';
import type { LLMProviderType } from '$lib/services/llm';
import { createPersistor } from '$lib/utils';

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	provider?: LLMProviderType;
	generatedCode?: string;
	streaming?: boolean;
	error?: string;
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
		serialize: (s) => ({
			messages: s.messages.map((m) => ({ ...m, streaming: false })),
			isGenerating: false,
			currentProvider: null,
			currentRequestId: null
		}),
		deserialize: (raw) => {
			const r = raw as Partial<ChatState> | null;
			if (!r || !Array.isArray(r.messages)) return null;
			return {
				messages: r.messages.slice(-200),
				isGenerating: false,
				currentProvider: null,
				currentRequestId: null
			};
		}
	});

	const restored = persist.load(initialState);
	const { subscribe, set, update } = writable(restored);

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

		stopGeneration: () => {
			update((state) => {
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
		}
	};
}

export const chatStore = createChatStore();
