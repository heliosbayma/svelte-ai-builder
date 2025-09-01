import { writable } from 'svelte/store';
import type { LLMProviderType } from '$lib/services/llm/types';

export type TelemetryPurpose = 'generate' | 'plan' | 'build' | 'repair' | 'other';

export interface TelemetryUsage {
	promptTokens?: number;
	completionTokens?: number;
	totalTokens?: number;
}

export interface TelemetryEvent {
	id: string;
	timestamp: number;
	provider: LLMProviderType;
	model: string;
	ms: number;
	ok: boolean;
	purpose: TelemetryPurpose;
	usage?: TelemetryUsage;
	errorMessage?: string;
	meta?: Record<string, string | number>;
}

export interface TelemetryState {
	events: TelemetryEvent[];
	maxEvents: number;
}

function createTelemetryStore() {
	const initial: TelemetryState = { events: [], maxEvents: 100 };
	const { subscribe, update, set } = writable(initial);

	return {
		subscribe,
		add: (e: Omit<TelemetryEvent, 'id' | 'timestamp'>) => {
			const ev: TelemetryEvent = {
				...e,
				id: crypto.randomUUID(),
				timestamp: Date.now()
			};
			update((s) => {
				const next = [...s.events, ev];
				while (next.length > s.maxEvents) next.shift();
				return { ...s, events: next };
			});
			return ev.id;
		},
		clear: () => set(initial)
	};
}

export const telemetryStore = createTelemetryStore();

export function summarize(events: TelemetryEvent[]) {
	if (!events.length) return { count: 0, avgMs: 0, totalTokens: 0 };
	const count = events.length;
	const avgMs = Math.round(events.reduce((a, b) => a + b.ms, 0) / count);
	const totalTokens = events.reduce((a, b) => a + (b.usage?.totalTokens || 0), 0);
	return { count, avgMs, totalTokens };
}

// Derived summaries
import { derived } from 'svelte/store';
export const telemetrySummary = derived(telemetryStore, (s) => summarize(s.events));

export const telemetryByProvider = derived(telemetryStore, (s) => {
	const groups: Record<
		string,
		{ count: number; avgMs: number; errorRate: number; totalTokens: number }
	> = {};
	const byProvider: Record<string, TelemetryEvent[]> = {};
	for (const e of s.events) {
		(byProvider[e.provider] ||= []).push(e);
	}
	for (const [provider, evs] of Object.entries(byProvider)) {
		const count = evs.length;
		const avgMs = count ? Math.round(evs.reduce((a, b) => a + b.ms, 0) / count) : 0;
		const errors = evs.filter((e) => !e.ok).length;
		const errorRate = count ? Math.round((errors / count) * 100) / 100 : 0;
		const totalTokens = evs.reduce((a, b) => a + (b.usage?.totalTokens || 0), 0);
		groups[provider] = { count, avgMs, errorRate, totalTokens };
	}
	return groups;
});
