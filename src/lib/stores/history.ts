import { writable, derived } from 'svelte/store';
import { createPersistor } from '$lib/utils';

export const HISTORY_MAX_VERSIONS = 50; // rolling window cap to limit memory/storage
// Heuristic storage budget for serialized history payload (bytes)
const HISTORY_STORAGE_BUDGET_BYTES = 4_500_000; // ~4.5MB leaves headroom under common 5MB limits

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
		maxVersions: HISTORY_MAX_VERSIONS // Limit history to prevent memory issues
	};

	const persist = createPersistor<HistoryState>({
		key: 'history',
		version: 1,
		debounceMs: 200,
		serialize: (s) => ({
			versions: s.versions.map((v) => ({
				id: v.id,
				timestamp: v.timestamp,
				prompt: v.prompt,
				code: v.code,
				provider: v.provider
			})),
			currentIndex: s.currentIndex
		}),
		deserialize: (raw) => {
			const r = raw as Partial<HistoryState> | null;
			if (!r || !Array.isArray(r.versions)) return null;
			const trimmed = r.versions
				.slice(0, HISTORY_MAX_VERSIONS)
				.map((v: Partial<ComponentVersion>) => ({
					id: String(v.id),
					timestamp: typeof v.timestamp === 'number' ? v.timestamp : Date.now(),
					prompt: String(v.prompt ?? ''),
					code: String(v.code ?? ''),
					provider: String(v.provider ?? 'unknown')
				}));
			return {
				versions: trimmed,
				currentIndex: typeof r.currentIndex === 'number' ? r.currentIndex : trimmed.length - 1,
				maxVersions: HISTORY_MAX_VERSIONS
			};
		}
	});

	const restored = persist.load(initialState);
	const { subscribe, set, update } = writable(restored);

	return {
		subscribe,

		// Add a new version to history
		addVersion: (version: Omit<ComponentVersion, 'id' | 'timestamp'>) => {
			const newVersion: ComponentVersion = {
				...version,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};

			update((state) => {
				const newVersions = [...state.versions.slice(0, state.currentIndex + 1), newVersion];

				// Limit the number of versions stored
				if (newVersions.length > state.maxVersions) {
					newVersions.shift();
				}

				// Storage quota guard: estimate serialized size and trim oldest until under budget
				function estimatePersistSize(versions: ComponentVersion[], currentIndex: number): number {
					try {
						const minimal = {
							versions: versions.map((v) => ({
								id: v.id,
								timestamp: v.timestamp,
								prompt: v.prompt,
								code: v.code,
								provider: v.provider
							})),
							currentIndex
						};
						return JSON.stringify(minimal).length;
					} catch {
						return Infinity;
					}
				}

				while (
					estimatePersistSize(
						newVersions,
						Math.min(newVersions.length - 1, state.currentIndex + 1)
					) > HISTORY_STORAGE_BUDGET_BYTES &&
					newVersions.length > 1
				) {
					newVersions.shift();
				}

				const next: HistoryState = {
					...state,
					versions: newVersions,
					currentIndex: newVersions.length - 1
				};
				persist.save(next);
				return next;
			});

			return newVersion.id;
		},

		// Navigate to a specific version
		goToVersion: (index: number) => {
			update((state) => {
				const next: HistoryState = {
					...state,
					currentIndex: Math.max(0, Math.min(index, state.versions.length - 1))
				};
				persist.save(next);
				return next;
			});
		},

		// Undo to previous version
		undo: () => {
			update((state) => {
				const next: HistoryState = {
					...state,
					currentIndex: Math.max(0, state.currentIndex - 1)
				};
				persist.save(next);
				return next;
			});
		},

		// Redo to next version
		redo: () => {
			update((state) => {
				const next: HistoryState = {
					...state,
					currentIndex: Math.min(state.versions.length - 1, state.currentIndex + 1)
				};
				persist.save(next);
				return next;
			});
		},

		// Get current version
		getCurrentVersion: (): ComponentVersion | null => {
			let currentVersion: ComponentVersion | null = null;
			const unsubscribe = subscribe((state) => {
				currentVersion = state.versions[state.currentIndex] || null;
			});
			unsubscribe();
			return currentVersion;
		},

		// Check if undo is available
		canUndo: (): boolean => {
			let canUndo = false;
			const unsubscribe = subscribe((state) => {
				canUndo = state.currentIndex > 0;
			});
			unsubscribe();
			return canUndo;
		},

		// Check if redo is available
		canRedo: (): boolean => {
			let canRedo = false;
			const unsubscribe = subscribe((state) => {
				canRedo = state.currentIndex < state.versions.length - 1;
			});
			unsubscribe();
			return canRedo;
		},

		// Clear all history
		clear: () => {
			set(initialState);
			persist.clear();
		},

		// Update compilation results for current version
		updateCurrentVersion: (updates: Partial<ComponentVersion>) => {
			update((state) => {
				if (state.currentIndex >= 0 && state.versions[state.currentIndex]) {
					const updatedVersions = [...state.versions];
					updatedVersions[state.currentIndex] = {
						...updatedVersions[state.currentIndex],
						...updates
					};
					const next: HistoryState = {
						...state,
						versions: updatedVersions
					};
					persist.save(next);
					return next;
				}
				return state;
			});
		}
	};
}

export const historyStore = createHistoryStore();

// Derived selectors for convenience in components
export const historyCurrentVersion = derived(
	historyStore,
	(s) => s.versions[s.currentIndex] || null
);
export const historyCanUndo = derived(historyStore, (s) => s.currentIndex > 0);
export const historyCanRedo = derived(historyStore, (s) => s.currentIndex < s.versions.length - 1);
export const historyPreviousVersion = derived(historyStore, (s) =>
	s.currentIndex > 0 ? s.versions[s.currentIndex - 1] || null : null
);
