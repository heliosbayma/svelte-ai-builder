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
	import { onMount } from 'svelte';
	import { MountManager } from './mountStrategies';
	import { CSSManager } from './cssManager';
	import { ImageManager } from './imageManager';

	let appEl: HTMLDivElement | null = null;
	const mountManager = new MountManager();
	const cssManager = new CSSManager();
	const imageManager = new ImageManager();
	let lastCleanup: (() => void) | null = null;
	let imageCleanup: (() => void) | null = null;
	let mountSeq = 0;
	let allowedParentOrigin: string | null = null;
	let mountDebounceId: ReturnType<typeof setTimeout> | null = null;
	let pendingMount: { js: string; css?: string } | null = null;

	function escapeHtml(input: unknown): string {
		const s = String(input ?? '');
		return s.replace(
			/[&<>"']/g,
			(ch) =>
				(({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as const)[ch] ||
				ch
		);
	}

	async function mountCompiled(js: string, css?: string) {
		const seq = ++mountSeq;
		if (!appEl) return;

		// Cleanup previous content and observers
		try {
			lastCleanup?.();
		} catch {}
		lastCleanup = null;
		try {
			imageCleanup?.();
		} catch {}
		imageCleanup = null;
		appEl.innerHTML = '';

		// Inject CSS if provided
		if (css) cssManager.inject(css);

		// Expose runtime on globals and inject aliases for module scope
		(globalThis as any).$ = svelteClient as unknown as object;
		(globalThis as any).svelte_internal = svelteClient as unknown as object;

		const transformed =
			'const $ = (globalThis).$;\nconst svelte_internal = (globalThis).svelte_internal;\n' +
			js
				// Strip any svelte/internal imports (line-anchored, both quotes)
				.replace(/^import\s+.*?from\s+(['"])svelte\/internal\/.*?\1;?\s*$/gm, '')
				.replace(/^import\s+(['"])svelte\/internal\/.*?\1;?\s*$/gm, '') +
			'\n//# sourceURL=preview://compiled.js';

		let url: string | null = null;
		try {
			const blob = new Blob([transformed], { type: 'text/javascript' });
			url = URL.createObjectURL(blob);
			const mod: any = await import(/* @vite-ignore */ url);
			const Component = mod?.default ?? mod;

			// Ignore stale mount if a newer one started meanwhile
			if (seq !== mountSeq) return;

			if (typeof Component === 'function' && appEl) {
				const result = await mountManager.mountComponent(Component as any, appEl, {});
				if (!result.success) {
					try {
						window.parent?.postMessage(
							{ type: 'mount-error', error: 'All strategies failed' },
							allowedParentOrigin && allowedParentOrigin !== 'null' ? allowedParentOrigin : '*'
						);
					} catch {}
					return;
				}
				lastCleanup = result.cleanup ?? null;
				try {
					imageCleanup = imageManager.setupImageFallbacks(appEl);
				} catch {}
				try {
					window.parent?.postMessage(
						{ type: 'mounted' },
						allowedParentOrigin && allowedParentOrigin !== 'null' ? allowedParentOrigin : '*'
					);
				} catch {}
			}
		} catch (err) {
			const msg = escapeHtml((err as Error)?.message || err);
			if (appEl) {
				appEl.innerHTML = `<div style="padding:12px;color:var(--destructive);background:color-mix(in oklab, var(--destructive) 15%, var(--background));border:1px solid color-mix(in oklab, var(--destructive) 25%, var(--background));border-radius:6px;">
        <strong>Runtime error</strong><br/>
        ${msg}
      </div>`;
			}
			try {
				window.parent?.postMessage(
					{ type: 'mount-error', error: String(msg) },
					allowedParentOrigin && allowedParentOrigin !== 'null' ? allowedParentOrigin : '*'
				);
			} catch {}
		} finally {
			if (url) URL.revokeObjectURL(url);
		}
	}

	function handleMessage(event: MessageEvent) {
		try {
			if (!allowedParentOrigin) allowedParentOrigin = event.origin || null;
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
				window.parent?.postMessage(
					{ type: 'preview-ready' },
					allowedParentOrigin && allowedParentOrigin !== 'null' ? allowedParentOrigin : '*'
				);
			} catch {}
			return;
		}
		if (data.type === 'mount') {
			if (typeof data.js !== 'string') return;
			pendingMount = { js: data.js, css: data.css };
			if (mountDebounceId) clearTimeout(mountDebounceId);
			mountDebounceId = setTimeout(() => {
				mountDebounceId = null;
				const payload = pendingMount;
				pendingMount = null;
				if (payload) mountCompiled(payload.js, payload.css);
			}, 16);
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
			window.parent?.postMessage(
				{ type: 'preview-ready' },
				allowedParentOrigin && allowedParentOrigin !== 'null' ? allowedParentOrigin : '*'
			);
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
