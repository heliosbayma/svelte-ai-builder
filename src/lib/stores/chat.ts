import { writable } from 'svelte/store';
import type { LLMProviderType } from '$lib/services/llm';

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

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,
		
		addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
			const chatMessage: ChatMessage = {
				...message,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};
			
			update(state => ({
				...state,
				messages: [...state.messages, chatMessage]
			}));
			
			return chatMessage.id;
		},
		
		updateMessage: (id: string, updates: Partial<ChatMessage>) => {
			update(state => ({
				...state,
				messages: state.messages.map(msg => 
					msg.id === id ? { ...msg, ...updates } : msg
				)
			}));
		},
		
		startGeneration: (provider: LLMProviderType, requestId: string) => {
			update(state => ({
				...state,
				isGenerating: true,
				currentProvider: provider,
				currentRequestId: requestId
			}));
		},
		
		stopGeneration: () => {
			update(state => ({
				...state,
				isGenerating: false,
				currentProvider: null,
				currentRequestId: null
			}));
		},
		
		clear: () => {
			set(initialState);
		},
		
		// For undo/redo system - get messages with generated code
		getComponentVersions: () => {
			let messages: ChatMessage[] = [];
			const unsubscribe = subscribe(state => {
				messages = state.messages;
			});
			unsubscribe();
			
			return messages
				.filter(msg => msg.role === 'assistant' && msg.generatedCode)
				.map(msg => ({
					id: msg.id,
					timestamp: msg.timestamp,
					prompt: messages.find(m => m.timestamp < msg.timestamp && m.role === 'user')?.content || '',
					code: msg.generatedCode!,
					provider: msg.provider!
				}));
		}
	};
}

export const chatStore = createChatStore();