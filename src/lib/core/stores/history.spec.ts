import { describe, it, expect } from 'vitest';
import { historyStore, HISTORY_MAX_VERSIONS } from './history';

describe('history store', () => {
	it('adds versions and updates currentIndex', () => {
		const id1 = historyStore.addVersion({ prompt: 'p1', code: '<div/>', provider: 'openai' });
		const id2 = historyStore.addVersion({ prompt: 'p2', code: '<span/>', provider: 'openai' });
		let idx = -1;
		let len = 0;
		const unsub = historyStore.subscribe((s) => {
			idx = s.currentIndex;
			len = s.versions.length;
		});
		unsub();
		expect(len).toBeGreaterThanOrEqual(2);
		expect(idx).toBe(len - 1);
		expect([id1, id2]).toContain(historyStore.getCurrentVersion()?.id);
	});

	it('undo/redo within bounds', () => {
		const unsub = historyStore.subscribe(() => {});
		unsub();
		historyStore.undo();
		const afterUndo = historyStore.getCurrentVersion();
		historyStore.redo();
		const afterRedo = historyStore.getCurrentVersion();
		expect(afterUndo).toBeTruthy();
		expect(afterRedo).toBeTruthy();
	});

	it('respects max versions cap', () => {
		for (let i = 0; i < HISTORY_MAX_VERSIONS + 5; i++) {
			historyStore.addVersion({ prompt: 'p' + i, code: `<div>${i}</div>`, provider: 'openai' });
		}
		let len = 0;
		const unsub = historyStore.subscribe((s) => {
			len = s.versions.length;
		});
		unsub();
		expect(len).toBeLessThanOrEqual(HISTORY_MAX_VERSIONS);
	});
});
