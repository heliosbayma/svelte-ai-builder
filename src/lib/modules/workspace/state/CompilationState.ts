import { writable, derived } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { historyPreviousVersion } from '$lib/core/stores/history';

/**
 * Tracks compilation: source code, compiled JS/CSS, preview HTML, and loading.
 * This class is NOT a Svelte store; it exposes Svelte stores via getters.
 * In components, bind to the inner stores, e.g.:
 *   const compiledJs = compilation.compiledJs; // then use $compiledJs
 * We avoid Svelte 5 runes here because this file is .ts (not .svelte).
 */
export class CompilationState {
	private _currentCode = writable('');
	private _previewHtml = writable('');
	private _compiledJs = writable('');
	private _compiledCss = writable('');
	private _loadingMessage = writable('');
	private _previousCode = derived(historyPreviousVersion, (v) => v?.code || '');

	// Reactive properties
	get currentCode(): Readable<string> {
		return this._currentCode;
	}
	get previewHtml(): Readable<string> {
		return this._previewHtml;
	}
	get compiledJs(): Readable<string> {
		return this._compiledJs;
	}
	get compiledCss(): Readable<string> {
		return this._compiledCss;
	}
	get loadingMessage(): Readable<string> {
		return this._loadingMessage;
	}

	// Derived property - automatically updates when history changes
	get previousCode(): Readable<string> {
		return this._previousCode;
	}

	/** Update the current source code being compiled. */
	setCode(code: string) {
		this._currentCode.set(code);
	}

	/** Set the latest compiled outputs and clear any loading state. */
	setCompiled(html: string, js: string, css: string) {
		this._previewHtml.set(html);
		this._compiledJs.set(js);
		this._compiledCss.set(css);
		this._loadingMessage.set('');
	}

	/** Set an HTML preview string (used for back-compat/full document previews). */
	setPreviewHtml(html: string) {
		this._previewHtml.set(html);
	}

	/** Show a loading message in the preview while compiling/mounting. */
	setLoading(message: string) {
		this._loadingMessage.set(message);
	}

	/** Clear any loading message currently displayed. */
	clearLoading() {
		this._loadingMessage.set('');
	}

	/** Reset all compilation outputs and loading state. */
	clearAll() {
		this._currentCode.set('');
		this._previewHtml.set('');
		this._compiledJs.set('');
		this._compiledCss.set('');
		this._loadingMessage.set('');
	}

	/** Display a compile/mount error by setting preview HTML and clearing outputs. */
	setError(html: string) {
		this._previewHtml.set(html);
		this._compiledJs.set('');
		this._compiledCss.set('');
		this._loadingMessage.set('');
	}

	/** Clear compiled JS/CSS while preserving preview HTML. */
	clearCompiled() {
		this._compiledJs.set('');
		this._compiledCss.set('');
	}
}
