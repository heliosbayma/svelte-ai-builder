import { mount as svelteMount } from 'svelte';
import type { SvelteComponent, SvelteInternalClient } from '$lib/types/svelte-runtime';

export interface MountStrategy {
	name: string;
	fn: (Component: SvelteComponent, target: HTMLElement, props: Record<string, unknown>) => unknown;
}

export class MountManager {
	private strategies: MountStrategy[] = [
		{
			name: 'Svelte 5 runtime mount API',
			fn: (Component, target, props) => {
				if (!target) throw new Error('Target element not found');
				return svelteMount(Component as Parameters<typeof svelteMount>[0], { target, props });
			}
		},
		{
			name: 'Internal mount API',
			fn: (Component, target, props) => {
				// @ts-ignore - svelte/internal/client is not typed
				const svelteClient = globalThis.svelte_internal as SvelteInternalClient;
				return svelteClient?.mount?.(Component, { target, props });
			}
		},
		{
			name: 'Constructor style (Svelte 4/compat)',
			fn: (Component, target, props) => new Component({ target, props })
		}
	];

	async mountComponent(Component: SvelteComponent, target: HTMLElement, props: Record<string, unknown> = {}): Promise<boolean> {
		for (const strategy of this.strategies) {
			try {
				this.ensureCleanTarget(target);
				strategy.fn(Component, target, props);
				console.log(`${strategy.name} succeeded`);
				return true;
			} catch (error) {
				console.error(`${strategy.name} failed:`, error);
			}
		}
		return false;
	}

	private ensureCleanTarget(target: HTMLElement) {
		if (target) target.innerHTML = '';
	}
}