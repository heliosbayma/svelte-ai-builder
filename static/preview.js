// Preview runtime (iframe):
// - Purpose: safely run untrusted, compiled Svelte in a sandbox
// - Globals: expose "$" and "svelte_internal" so compiled output can access the runtime
// - Mount order (fallbacks): svelte.mount → svelteClient.mount → function(target, props) → new Component({ target, props })
// - Props: always pass {} to avoid undefined prop lookups
// - Styles: inject provided CSS string into <style> before mounting

let svelteClient = null;
let svelteMount = null;

try {
	// Try Vite dev server paths first
	svelteClient = await import('/@fs/node_modules/svelte/src/internal/client/index.js').catch(() => null);
	if (!svelteClient) {
		svelteClient = await import('/node_modules/svelte/src/internal/client/index.js').catch(() => null);
	}
	svelteMount = await import('/@fs/node_modules/svelte/src/index.js').then((m) => m.mount).catch(() => null);
	if (!svelteMount) {
		svelteMount = await import('/node_modules/svelte/src/index.js').then((m) => m.mount).catch(() => null);
	}
} catch (e) {
	console.warn('[preview] Failed to load Svelte runtime:', e);
}

let appEl = null;

async function mountCompiled(js, css) {
	if (!appEl) {
		console.error('[preview] appEl not available for mounting');
		return;
	}

	// Clear previous content and ensure fresh DOM state
	appEl.innerHTML = '';

	// Force a reflow to ensure DOM is ready
	appEl.getBoundingClientRect();

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
	if (svelteClient) {
		globalThis.$ = svelteClient;
		globalThis.svelte_internal = svelteClient;
	}

	const transformed =
		'const $ = (globalThis).$;\nconst svelte_internal = (globalThis).svelte_internal;\n' +
		js
			// Strip any svelte/internal imports (line-anchored, both quotes)
			.replace(/^import\s+.*?from\s+(["'])svelte\/internal\/.*?\1;?\s*$/gm, '')
			.replace(/^import\s+(["'])svelte\/internal\/.*?\1;?\s*$/gm, '');

	try {
		// Import as a module so top-level ESM syntax is allowed
		const blob = new Blob([transformed], { type: 'text/javascript' });
		const url = URL.createObjectURL(blob);
		const mod = await import(url);
		URL.revokeObjectURL(url);
		const Component = mod?.default ?? mod;

		let mounted = false;
		if (typeof Component === 'function') {
			const defaultProps = {};
			const mountTarget = appEl;

			try {
				if (svelteMount) {
					await new Promise((resolve) => setTimeout(resolve, 0));
					svelteMount(Component, { target: mountTarget, props: defaultProps });
					mounted = true;
				}
			} catch (err) {
				console.warn('[preview] Svelte mount failed:', err);
				try {
					if (svelteClient && svelteClient.mount) {
						await new Promise((resolve) => setTimeout(resolve, 0));
						svelteClient.mount(Component, { target: mountTarget, props: defaultProps });
						mounted = true;
					}
				} catch (err2) {
					console.warn('[preview] Internal mount failed:', err2);
					try {
						Component(mountTarget, defaultProps);
						mounted = true;
					} catch (err3) {
						console.warn('[preview] Function mount failed:', err3);
						try {
							new Component({ target: mountTarget, props: defaultProps });
							mounted = true;
						} catch (err4) {
							console.warn('[preview] Constructor mount failed:', err4);
							try {
								Component({ target: mountTarget, props: defaultProps });
								mounted = true;
							} catch (err5) {
								console.warn('[preview] Object mount failed:', err5);
								try {
									Component({ target: mountTarget });
									mounted = true;
								} catch (err6) {
									console.warn('[preview] Minimal mount failed:', err6);
									try {
										Component(mountTarget);
										mounted = true;
									} catch (eFinal) {
										console.error('[preview] All mount fallbacks failed:', eFinal);
									}
								}
							}
						}
					}
				}
			}
		}

		// Apply image error fallbacks
		try {
			const applyImgFallbacks = (root) => {
				const imgs = root.querySelectorAll('img');
				imgs.forEach((img) => {
					if (img.dataset && img.dataset.fallbackApplied) return;
					img.addEventListener('error', () => {
						const el = img;
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
				'<div style="padding:12px;color:red;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.2);border-radius:6px;">Failed to mount component: no default export/function found.</div>';
		}
	} catch (err) {
		const error = err;
		appEl.innerHTML = `<div style="padding:12px;color:red;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.2);border-radius:6px;">
	<strong>Runtime error</strong><br/>
	${error.message}
</div>`;
		console.error('Preview runtime error:', error);
	}
}

function handleMessage(event) {
	const data = event.data;
	if (!data) return;

	if (data.type === 'ping') {
		try {
			window.parent?.postMessage({ type: 'preview-ready' }, '*');
		} catch {}
		return;
	}

	if (data.type !== 'mount') return;
	if (typeof data.js !== 'string') return;

	try {
		mountCompiled(data.js, data.css);
		window.parent?.postMessage({ type: 'mounted' }, '*');
	} catch (err) {
		console.error('[preview] Mount failed:', err);
		window.parent?.postMessage({ type: 'mount-error', error: err.message }, '*');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	appEl = document.getElementById('app');
	window.addEventListener('message', handleMessage);
	try {
		window.parent?.postMessage({ type: 'preview-ready' }, '*');
	} catch {}
});
