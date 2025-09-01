import { writable } from 'svelte/store';

export interface ComponentVersion {
	id: string;
	timestamp: number;
	prompt: string;
	code: string;
	provider: string;
	compiledJs?: string;
	compiledCss?: string;
	previewHtml?: string;
}

export interface HistoryState {
	versions: ComponentVersion[];
	currentIndex: number;
	maxVersions: number;
}

function createHistoryStore() {
	const initialState: HistoryState = {
		versions: [],
		currentIndex: -1,
		maxVersions: 50 // Limit history to prevent memory issues
	};

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,
		
		// Add a new version to history
		addVersion: (version: Omit<ComponentVersion, 'id' | 'timestamp'>) => {
			const newVersion: ComponentVersion = {
				...version,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};
			
			update(state => {
				const newVersions = [...state.versions.slice(0, state.currentIndex + 1), newVersion];
				
				// Limit the number of versions stored
				if (newVersions.length > state.maxVersions) {
					newVersions.shift();
				}
				
				return {
					...state,
					versions: newVersions,
					currentIndex: newVersions.length - 1
				};
			});
			
			return newVersion.id;
		},
		
		// Navigate to a specific version
		goToVersion: (index: number) => {
			update(state => ({
				...state,
				currentIndex: Math.max(0, Math.min(index, state.versions.length - 1))
			}));
		},
		
		// Undo to previous version
		undo: () => {
			update(state => ({
				...state,
				currentIndex: Math.max(0, state.currentIndex - 1)
			}));
		},
		
		// Redo to next version
		redo: () => {
			update(state => ({
				...state,
				currentIndex: Math.min(state.versions.length - 1, state.currentIndex + 1)
			}));
		},
		
		// Get current version
		getCurrentVersion: (): ComponentVersion | null => {
			let currentVersion: ComponentVersion | null = null;
			const unsubscribe = subscribe(state => {
				currentVersion = state.versions[state.currentIndex] || null;
			});
			unsubscribe();
			return currentVersion;
		},
		
		// Check if undo is available
		canUndo: (): boolean => {
			let canUndo = false;
			const unsubscribe = subscribe(state => {
				canUndo = state.currentIndex > 0;
			});
			unsubscribe();
			return canUndo;
		},
		
		// Check if redo is available  
		canRedo: (): boolean => {
			let canRedo = false;
			const unsubscribe = subscribe(state => {
				canRedo = state.currentIndex < state.versions.length - 1;
			});
			unsubscribe();
			return canRedo;
		},
		
		// Clear all history
		clear: () => {
			set(initialState);
		},
		
		// Update compilation results for current version
		updateCurrentVersion: (updates: Partial<ComponentVersion>) => {
			update(state => {
				if (state.currentIndex >= 0 && state.versions[state.currentIndex]) {
					const updatedVersions = [...state.versions];
					updatedVersions[state.currentIndex] = {
						...updatedVersions[state.currentIndex],
						...updates
					};
					return {
						...state,
						versions: updatedVersions
					};
				}
				return state;
			});
		}
	};
}

export const historyStore = createHistoryStore();