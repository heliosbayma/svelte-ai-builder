<script lang="ts">
	// Preview runtime (iframe):
	// - Purpose: safely run untrusted, compiled Svelte in a sandbox
	// - Globals: expose "$" and "svelte_internal" so compiled output can access the runtime
	// - Mount order (fallbacks): svelte.mount → svelteClient.mount → function(target, props) → new Component({ target, props })
	// - Props: always pass {} to avoid undefined prop lookups
	// - Styles: inject provided CSS string into <style> before mounting
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

		// Debug: inspect transformed module
		try {
			console.log('[preview] transformed length', transformed.length);
			console.log('[preview] transformed head', transformed.slice(0, 240));
		} catch {}

		try {
			// Import as a module so top-level ESM syntax is allowed
			const blob = new Blob([transformed], { type: 'text/javascript' });
			const url = URL.createObjectURL(blob);
			const mod: any = await import(/* @vite-ignore */ url);
			URL.revokeObjectURL(url);
			const Component = mod?.default ?? mod;

			let mounted = false;
			if (typeof Component === 'function') {
				const defaultProps = {};

				// Ensure clean slate before each mount attempt
				const ensureCleanTarget = () => {
					if (appEl) appEl.innerHTML = '';
				};

				try {
					ensureCleanTarget();
					// Preferred Svelte 5 runtime mount API (public)
					svelteMount(Component as any, { target: appEl, props: defaultProps });
					mounted = true;
				} catch (_) {
					if (!mounted) {
						try {
							ensureCleanTarget();
							// Internal mount API
							(svelteClient as any).mount(Component, { target: appEl, props: defaultProps });
							mounted = true;
						} catch (_) {
							if (!mounted) {
								try {
									ensureCleanTarget();
									// Function-style: (target, props)
									(Component as any)(appEl, defaultProps);
									mounted = true;
								} catch (_) {
									if (!mounted) {
										try {
											ensureCleanTarget();
											// Constructor style (Svelte 4/compat)
											// @ts-ignore
											new (Component as any)({ target: appEl, props: defaultProps });
											mounted = true;
										} catch (_) {
											if (!mounted) {
												try {
													ensureCleanTarget();
													// Callable with object
													(Component as any)({ target: appEl, props: defaultProps });
													mounted = true;
												} catch (_) {
													if (!mounted) {
														try {
															ensureCleanTarget();
															// Minimal options
															(Component as any)({ target: appEl });
															mounted = true;
														} catch (_) {
															if (!mounted) {
																try {
																	ensureCleanTarget();
																	// Target only
																	(Component as any)(appEl);
																	mounted = true;
																} catch (eFinal) {
																	console.error('Mount fallback failed:', eFinal);
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}

			// Apply image error fallbacks (for broken external URLs)
			try {
				const applyImgFallbacks = (root: HTMLElement | Document) => {
					const imgs = root.querySelectorAll('img');
					imgs.forEach((img) => {
						if ((img as HTMLElement).dataset && (img as HTMLElement).dataset.fallbackApplied)
							return;
						img.addEventListener('error', () => {
							const el = img as HTMLImageElement & { dataset: DOMStringMap };
							if (el.dataset.fallbackApplied) return;
							el.dataset.fallbackApplied = '1';
							const seed = el.alt && el.alt.trim().length > 0 ? el.alt.trim() : 'image';
							el.src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;
						});
					});
				};
				applyImgFallbacks(appEl);
				const mo = new MutationObserver((mutations) => {
					for (const m of mutations) {
						m.addedNodes.forEach((node) => {
							if (node instanceof HTMLElement) {
								if (node.tagName === 'IMG') applyImgFallbacks(node);
								applyImgFallbacks(node);
							}
						});
					}
				});
				mo.observe(appEl, { childList: true, subtree: true });
			} catch {}

			if (!mounted) {
				appEl.innerHTML =
					'<div style="padding:12px;color:var(--destructive);background:color-mix(in oklab, var(--destructive) 15%, var(--background));border:1px solid color-mix(in oklab, var(--destructive) 25%, var(--background));border-radius:6px;">Failed to mount component: no default export/function found.</div>';
			} else {
				try {
					window.parent?.postMessage({ type: 'mounted' }, '*');
				} catch {}
			}
		} catch (err) {
			const error = err as Error;
			appEl.innerHTML = `<div style="padding:12px;color:var(--destructive);background:color-mix(in oklab, var(--destructive) 15%, var(--background));border:1px solid color-mix(in oklab, var(--destructive) 25%, var(--background));border-radius:6px;">
        <strong>Runtime error</strong><br/>
        ${error.message}
      </div>`;
			console.error('Preview runtime error:', error);
		}
	}

	function handleMessage(event: MessageEvent) {
		const data = event.data as { type?: string; js?: string; css?: string; message?: string };
		if (!data || !data.type) return;
		if (data.type === 'ping') {
			try {
				window.parent?.postMessage({ type: 'preview-ready' }, '*');
			} catch {}
			return;
		}
		if (data.type === 'mount') {
			if (typeof data.js !== 'string') return;
			console.log('[preview] received mount message', {
				jsLen: data.js.length,
				hasCss: !!data.css
			});
			mountCompiled(data.js, data.css);
			return;
		}
		if (data.type === 'loading') {
			try {
				if (appEl) {
					appEl.innerHTML = `
						<div style="min-height: 100vh; display: grid; place-items: center; padding: 24px; color: var(--foreground); background: var(--background); font-family: system-ui, -apple-system, sans-serif;">
							<div style="text-align: center; max-width: 640px;">
								<div style="display:inline-block; width: 24px; height: 24px; border: 3px solid color-mix(in oklab, var(--foreground) 30%, transparent); border-top-color: var(--foreground); border-radius: 999px; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
								<div style="opacity: 0.9;">${(data.message || 'Preparing your preview...').replace(/</g, '&lt;')}</div>
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
								${(data.message || 'Awaiting your first creation...').replace(/</g, '&lt;')}
							</div>
						</div>
					`;
				}
			} catch {}
		}
	}

	// Register message handler on client only
	onMount(() => {
		console.log('[preview] ready, waiting for mount message');
		window.addEventListener('message', handleMessage);
		// Notify parent that preview is ready to receive code
		try {
			window.parent?.postMessage({ type: 'preview-ready' }, '*');
		} catch {}
		// Show a default loading prompt until code arrives
		try {
			if (appEl) {
				appEl.innerHTML = `
					<div style="min-height: 100vh; display: grid; place-items: center; padding: 24px; color: var(--foreground); background: var(--background); font-family: system-ui, -apple-system, sans-serif;">
						<div style="text-align: center; max-width: 640px; opacity: 0.9;">
							Calibrating your ideas into work of art.
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

	/* Firefox scrollbar */
	.preview-content {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.15) rgba(255, 255, 255, 0.05);
	}

	/* Apply to any scrollable content inside */
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
