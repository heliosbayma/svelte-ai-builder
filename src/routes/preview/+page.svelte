<script lang="ts">
	// Preview runtime (iframe):
	// - Purpose: safely run untrusted, compiled Svelte in a sandbox
	// - Globals: expose "$" and "svelte_internal" so compiled output can access the runtime
	// - Mount order (fallbacks): svelte.mount → svelteClient.mount → function(target, props) → new Component({ target, props })
	// - Props: always pass {} to avoid undefined prop lookups
	// - Styles: inject provided CSS string into <style> before mounting
	//
	// @ts-ignore - internal client has no public types
	import * as svelteClient from 'svelte/internal/client';
	import { onMount, mount as svelteMount } from 'svelte';

	let appEl: HTMLDivElement | null = null;

	async function mountCompiled(js: string, css?: string) {
		if (!appEl) return;

		// Clear previous content
		appEl.innerHTML = '';

		// Inject CSS if provided
		if (css) {
			const existing = document.getElementById('preview-inline-style');
			if (existing) existing.remove();
			const style = document.createElement('style');
			style.id = 'preview-inline-style';
			style.textContent = css;
			document.head.appendChild(style);
		}

		// Expose runtime on globals and inject aliases for module scope
		(globalThis as any).$ = svelteClient as unknown as object;
		(globalThis as any).svelte_internal = svelteClient as unknown as object;

		const transformed =
			'const $ = (globalThis).$;\nconst svelte_internal = (globalThis).svelte_internal;\n' +
			js
				// Strip any svelte/internal imports (line-anchored, both quotes)
				.replace(/^import\s+.*?from\s+(['"])svelte\/internal\/.*?\1;?\s*$/gm, '')
				.replace(/^import\s+(['"])svelte\/internal\/.*?\1;?\s*$/gm, '');

		try {
			const blob = new Blob([transformed], { type: 'text/javascript' });
			const url = URL.createObjectURL(blob);
			const mod: any = await import(/* @vite-ignore */ url);
			URL.revokeObjectURL(url);
			const Component = mod?.default ?? mod;

			let mounted = false;
			if (typeof Component === 'function') {
				const defaultProps = {};

				const ensureCleanTarget = () => {
					if (appEl) appEl.innerHTML = '';
				};

				const mountStrategies = [
					{
						name: 'Svelte 5 runtime mount API',
						fn: () => {
							if (!appEl) throw new Error('Target element not found');
							return svelteMount(Component as any, { target: appEl, props: defaultProps });
						}
					},
					{
						name: 'Internal mount API',
						fn: () =>
							(svelteClient as any).mount?.(Component, { target: appEl, props: defaultProps })
					},
					{
						name: 'Constructor style (Svelte 4/compat)',
						fn: () => new (Component as any)({ target: appEl, props: defaultProps })
					}
				];

				for (const strategy of mountStrategies) {
					try {
						ensureCleanTarget();
						strategy.fn();
						mounted = true;
						break;
					} catch (error) {
						console.error(`${strategy.name} failed:`, error);
					}
				}

				if (!mounted) {
					console.error('All mount strategies failed');
					try {
						window.parent?.postMessage(
							{ type: 'mount-error', error: 'All strategies failed' },
							'*'
						);
					} catch {}
				} else {
					try {
						window.parent?.postMessage({ type: 'mounted' }, '*');
					} catch {}
				}
			}
		} catch (err) {
			const error = err as Error;
			appEl.innerHTML = `<div style="padding:12px;color:var(--destructive);background:color-mix(in oklab, var(--destructive) 15%, var(--background));border:1px solid color-mix(in oklab, var(--destructive) 25%, var(--background));border-radius:6px;">
        <strong>Runtime error</strong><br/>
        ${error.message}
      </div>`;
			console.error('Preview runtime error:', error);
			try {
				window.parent?.postMessage({ type: 'mount-error', error: error.message }, '*');
			} catch {}
		}
	}

	function handleMessage(event: MessageEvent) {
		try {
			if (event.origin && event.origin !== window.origin && event.origin !== 'null') return;
		} catch {}
		const data = event.data as {
			type?: string;
			js?: string;
			css?: string;
			message?: string;
			dark?: boolean;
		};
		if (!data || !data.type) return;
		if (data.type === 'ping') {
			try {
				window.parent?.postMessage({ type: 'preview-ready' }, '*');
			} catch {}
			return;
		}
		if (data.type === 'mount') {
			if (typeof data.js !== 'string') return;
			mountCompiled(data.js, data.css);
			return;
		}
		if (data.type === 'apply-theme') {
			try {
				document.documentElement.classList.toggle('dark', !!data.dark);
			} catch {}
			return;
		}
		if (data.type === 'loading') {
			try {
				if (appEl) {
					appEl.innerHTML = `
						<div style="min-height: 100vh; display: grid; place-items: center; padding: 24px; color: var(--foreground); background: var(--background); font-family: system-ui, -apple-system, sans-serif;">
							<div style="text-align: center; max-width: 640px;">
								<div style="display:inline-block; width: 24px; height: 24px; border: 3px solid color-mix(in oklab, var(--foreground) 30%, transparent); border-top-color: var(--foreground); border-radius: 999px; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
								<div style="opacity: 0.9;">${(data.message || 'Preparing your preview…').replace(/</g, '&lt;')}</div>
							</div>
						</div>
						<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
					`;
				}
			} catch {}
		}
		if (data.type === 'welcome') {
			try {
				if (appEl) {
					appEl.innerHTML = `
						<div style="min-height: 100vh; display: grid; place-items: center; padding: 24px; color: var(--foreground); background: var(--background); font-family: system-ui, -apple-system, sans-serif;">
							<div style="text-align: center; max-width: 640px; opacity: 0.9;">
								${(data.message || 'Awaiting your first creation…').replace(/</g, '&lt;')}
							</div>
						</div>
					`;
				}
			} catch {}
		}
	}

	// Register message handler on client only
	onMount(() => {
		// Initialize theme from localStorage / media query on first paint
		try {
			const saved = localStorage.getItem('theme');
			const prefersDark =
				window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
			document.documentElement.classList.toggle('dark', saved ? saved === 'dark' : prefersDark);
		} catch {}

		window.addEventListener('message', handleMessage);
		try {
			window.parent?.postMessage({ type: 'preview-ready' }, '*');
		} catch {}
		try {
			if (appEl) {
				appEl.innerHTML = `
					<div style="min-height: 100vh; display: grid; place-items: center; padding: 24px; color: var(--foreground); background: var(--background); font-family: system-ui, -apple-system, sans-serif;">
						<div style="text-align: center; max-width: 640px; opacity: 0.9;">
							Calibrating your ideas into a work of art…
						</div>
					</div>`;
			}
		} catch {}
		return () => window.removeEventListener('message', handleMessage);
	});
</script>

<div
	id="app"
	bind:this={appEl}
	style="min-height: 100vh; background: var(--background); color: var(--foreground);"
	class="preview-content"
></div>

<style>
	.preview-content::-webkit-scrollbar {
		width: 8px;
	}
	.preview-content::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}
	.preview-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}
	.preview-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}
	.preview-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
	:global(*::-webkit-scrollbar) {
		width: 8px;
	}
	:global(*::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}
	:global(*::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		transition: background-color 0.2s;
	}
	:global(*::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.25);
	}
	:global(*) {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}
</style>
