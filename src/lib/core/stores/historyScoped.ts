import { writable, derived, get } from 'svelte/store';
import { createPersistor } from '$lib/shared/utils';
import type { LLMProviderType } from '$lib/core/ai/services/llm/types';

export const HISTORY_MAX_VERSIONS = 50;
const HISTORY_STORAGE_BUDGET_BYTES = 4_500_000;

export interface ComponentVersion {
	id: string;
	timestamp: number;
	prompt: string;
	code: string;
	provider: LLMProviderType;
	label?: string;
	compiledJs?: string;
	compiledCss?: string;
	previewHtml?: string;
}

export interface HistoryState {
	versions: ComponentVersion[];
	currentIndex: number;
	maxVersions: number;
}

type SessionHistory = { versions: ComponentVersion[]; currentIndex: number };
interface PersistedHistoryBySession {
	bySession: Record<string, SessionHistory>;
	currentSessionId: string | null;
}

function createHistoryStore() {
	const initialPublic: HistoryState = {
		versions: [],
		currentIndex: -1,
		maxVersions: HISTORY_MAX_VERSIONS
	};

	let currentSessionId: string | null = null;
	let bySession: Record<string, SessionHistory> = {};

	const persist = createPersistor<PersistedHistoryBySession>({
		key: 'history-scoped',
		version: 2,
		debounceMs: 200,
		serialize: () => ({ bySession, currentSessionId }),
		deserialize: (raw) => {
			const r = raw as Partial<PersistedHistoryBySession> | null;
			if (!r || !r.bySession) return null;
			const normalized: Record<string, SessionHistory> = {};
			for (const [sid, data] of Object.entries(r.bySession)) {
				const trimmed = (data?.versions || [])
					.slice(0, HISTORY_MAX_VERSIONS)
					.map((v: Partial<ComponentVersion>) => ({
						id: String(v.id),
						timestamp: typeof v.timestamp === 'number' ? v.timestamp : Date.now(),
						prompt: String(v.prompt ?? ''),
						code: String(v.code ?? ''),
						provider: (v.provider as LLMProviderType) ?? 'openai',
						label: v.label ? String(v.label) : undefined
					}));
				normalized[sid] = {
					versions: trimmed,
					currentIndex:
						typeof data?.currentIndex === 'number' ? data!.currentIndex : trimmed.length - 1
				};
			}
			bySession = normalized;
			currentSessionId = (r.currentSessionId as string | null) ?? null;
			return null;
		}
	});

	// load persisted
	persist.load({ bySession: {}, currentSessionId: null });

	const { subscribe, set } = writable<HistoryState>(initialPublic);

	function ensureSession(sessionId: string): SessionHistory {
		if (!bySession[sessionId]) bySession[sessionId] = { versions: [], currentIndex: -1 };
		return bySession[sessionId];
	}

	function sync() {
		if (!currentSessionId) {
			set({ ...initialPublic });
			persist.save({ bySession, currentSessionId });
			return;
		}
		const sess = ensureSession(currentSessionId);
		set({
			versions: sess.versions,
			currentIndex: sess.currentIndex,
			maxVersions: HISTORY_MAX_VERSIONS
		});
		persist.save({ bySession, currentSessionId });
	}

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

	return {
		subscribe,

		setCurrentSession: (sessionId: string | null) => {
			currentSessionId = sessionId;
			if (sessionId) ensureSession(sessionId);
			sync();
		},

		getVersionById: (id: string): ComponentVersion | null => {
			if (!currentSessionId) return null;
			const sess = ensureSession(currentSessionId);
			return sess.versions.find((v) => v.id === id) ?? null;
		},

		addVersion: (version: Omit<ComponentVersion, 'id' | 'timestamp'>): string => {
			if (!currentSessionId) currentSessionId = 'default';
			const sess = ensureSession(currentSessionId);
			const newVersion: ComponentVersion = {
				...version,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};

			const newVersions = [...sess.versions.slice(0, sess.currentIndex + 1), newVersion];
			if (newVersions.length > HISTORY_MAX_VERSIONS) newVersions.shift();
			while (
				estimatePersistSize(newVersions, Math.min(newVersions.length - 1, sess.currentIndex + 1)) >
					HISTORY_STORAGE_BUDGET_BYTES &&
				newVersions.length > 1
			) {
				newVersions.shift();
			}

			bySession[currentSessionId] = { versions: newVersions, currentIndex: newVersions.length - 1 };
			sync();
			return newVersion.id;
		},

		goToVersion: (index: number) => {
			if (!currentSessionId) return;
			const sess = ensureSession(currentSessionId);
			bySession[currentSessionId] = {
				versions: sess.versions,
				currentIndex: Math.max(0, Math.min(index, sess.versions.length - 1))
			};
			sync();
		},

		undo: () => {
			if (!currentSessionId) return;
			const sess = ensureSession(currentSessionId);
			bySession[currentSessionId] = {
				versions: sess.versions,
				currentIndex: Math.max(0, sess.currentIndex - 1)
			};
			sync();
		},

		redo: () => {
			if (!currentSessionId) return;
			const sess = ensureSession(currentSessionId);
			bySession[currentSessionId] = {
				versions: sess.versions,
				currentIndex: Math.min(sess.versions.length - 1, sess.currentIndex + 1)
			};
			sync();
		},

		getCurrentVersion: (): ComponentVersion | null => {
			const s = get({ subscribe });
			return s.versions[s.currentIndex] ?? null;
		},

		canUndo: (): boolean => {
			const s = get({ subscribe });
			return s.currentIndex > 0;
		},

		canRedo: (): boolean => {
			const s = get({ subscribe });
			return s.currentIndex < s.versions.length - 1;
		},

		clear: () => {
			if (currentSessionId) bySession[currentSessionId] = { versions: [], currentIndex: -1 };
			sync();
		},

		updateCurrentVersion: (updates: Partial<ComponentVersion>) => {
			if (!currentSessionId) return;
			const sess = ensureSession(currentSessionId);
			if (sess.currentIndex >= 0 && sess.versions[sess.currentIndex]) {
				const updated = [...sess.versions];
				updated[sess.currentIndex] = { ...updated[sess.currentIndex], ...updates };
				bySession[currentSessionId] = { versions: updated, currentIndex: sess.currentIndex };
				sync();
			}
		},

		updateVersionLabel: (index: number, label: string | undefined) => {
			if (!currentSessionId) return;
			const sess = ensureSession(currentSessionId);
			if (index >= 0 && index < sess.versions.length && sess.versions[index]) {
				const updated = [...sess.versions];
				updated[index] = { ...updated[index], label };
				bySession[currentSessionId] = { versions: updated, currentIndex: sess.currentIndex };
				sync();
			}
		}
	};
}

export const historyStore = createHistoryStore();

export const historyCurrentVersion = derived(
	historyStore,
	(s) => s.versions[s.currentIndex] || null
);
export const historyCanUndo = derived(historyStore, (s) => s.currentIndex > 0);
export const historyCanRedo = derived(historyStore, (s) => s.currentIndex < s.versions.length - 1);
export const historyPreviousVersion = derived(historyStore, (s) =>
	s.currentIndex > 0 ? s.versions[s.currentIndex - 1] || null : null
);
