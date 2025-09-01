import { describe, it, expect } from 'vitest';
import type { TelemetryEvent } from './telemetry';
import { summarize } from './telemetry';

describe('telemetry summarize', () => {
	it('returns zeros for empty list', () => {
		const s = summarize([]);
		expect(s).toEqual({ count: 0, avgMs: 0, totalTokens: 0 });
	});

	it('computes count, average ms and total tokens', () => {
		const events: TelemetryEvent[] = [
			{
				id: '1',
				timestamp: Date.now(),
				provider: 'openai',
				model: 'gpt-4o',
				ms: 120,
				ok: true,
				purpose: 'generate',
				usage: { totalTokens: 100 }
			},
			{
				id: '2',
				timestamp: Date.now(),
				provider: 'anthropic',
				model: 'claude-3',
				ms: 80,
				ok: true,
				purpose: 'plan',
				usage: { totalTokens: 40 }
			}
		];
		const s = summarize(events);
		expect(s.count).toBe(2);
		expect(s.avgMs).toBe(100); // (120+80)/2
		expect(s.totalTokens).toBe(140);
	});
});
