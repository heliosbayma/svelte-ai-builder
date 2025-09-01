<script lang="ts">
	// @ts-ignore - internal client has no public types
	import * as svelteClient from 'svelte/internal/client';
	import { onMount, mount as svelteMount } from 'svelte';

	// Expose Svelte internals to evaluated code
	// The compiled output expects a `$` namespace from svelte/internal/client
	// We keep this page minimal and only handle mounting messages.

	let appEl: HTMLDivElement | null = null;

	async function mountCompiled(js: string, css?: string) {
		if (!appEl) return;

		// Clear previous content
		appEl.innerHTML = '';

		// Inject CSS if provided
		if (css) {
			const style = document.createElement('style');
			style.textContent = css;
			document.head.appendChild(style);
		}

		// Expose runtime on globals and inject aliases for module scope
		(globalThis as any).$ = svelteClient as unknown as object;
		(globalThis as any).svelte_internal = svelteClient as unknown as object;

		const transformed =
			'const $ = (globalThis).$;\nconst svelte_internal = (globalThis).svelte_internal;\n' +
			js
				// Remove any imports from svelte/internal/* with from syntax
				.replace(/import\s+.*?from\s+["']svelte\/internal\/[^"']+["'];?\n?/g, '')
				// Remove bare imports like: import 'svelte/internal/disclose-version'
				.replace(/import\s+["']svelte\/internal\/[^"']+["'];?\n?/g, '')
				// Remove specific "import * as $ from 'svelte/internal/client'"
				.replace(/import\s+\*\s+as\s+\$\s+from\s+["']svelte\/internal\/client["'];?\n?/g, '');

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
				try {
					// Preferred Svelte 5 runtime mount API (public)
					svelteMount(Component as any, { target: appEl, props: defaultProps });
					mounted = true;
				} catch (_) {
					try {
						// Internal mount API
						(svelteClient as any).mount(Component, { target: appEl, props: defaultProps });
						mounted = true;
					} catch (_) {
						try {
							// Function-style: (target, props)
							(Component as any)(appEl, defaultProps);
							mounted = true;
						} catch (_) {
							try {
								// Constructor style (Svelte 4/compat)
								// @ts-ignore
								new (Component as any)({ target: appEl, props: defaultProps });
								mounted = true;
							} catch (_) {
								try {
									// Callable with object
									(Component as any)({ target: appEl, props: defaultProps });
									mounted = true;
								} catch (_) {
									try {
										// Minimal options
										(Component as any)({ target: appEl });
										mounted = true;
									} catch (_) {
										try {
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

			if (!mounted) {
				appEl.innerHTML =
					'<div style="padding:12px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;">Failed to mount component: no default export/function found.</div>';
			}
		} catch (err) {
			const error = err as Error;
			appEl.innerHTML = `<div style="padding:12px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;">
        <strong>Runtime error</strong><br/>
        ${error.message}
      </div>`;
			console.error('Preview runtime error:', error);
		}
	}

	function handleMessage(event: MessageEvent) {
		const data = event.data as { type?: string; js?: string; css?: string };
		if (!data || data.type !== 'mount') return;
		if (typeof data.js !== 'string') return;
		console.log('[preview] received mount message', { jsLen: data.js.length, hasCss: !!data.css });
		mountCompiled(data.js, data.css);
		try {
			window.parent?.postMessage({ type: 'mounted' }, '*');
		} catch {}
	}

	// Register message handler on client only
	onMount(() => {
		console.log('[preview] ready, waiting for mount message');
		window.addEventListener('message', handleMessage);
		// Notify parent that preview is ready to receive code
		try {
			window.parent?.postMessage({ type: 'preview-ready' }, '*');
		} catch {}
		return () => window.removeEventListener('message', handleMessage);
	});
</script>

<div
	id="app"
	bind:this={appEl}
	style="min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: #f9fafb;
"
></div>
