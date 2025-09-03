import { writable, get } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { LAYOUT } from '$lib/shared/constants';

/**
 * Manages UI layout: panel visibility, pane sizes, and diff view.
 * This class is NOT a Svelte store; it exposes Svelte stores via getters.
 * In components, bind to the inner stores, e.g.:
 *   const showCode = layout.showCode; // then use $showCode
 * We avoid Svelte 5 runes here because this file is .ts (not .svelte).
 */
export class LayoutState {
	private _showCode = writable(false);
	private _savedPreviewSize = writable(LAYOUT.PREVIEW_SIZE_DEFAULT);
	private _savedCodeSize = writable(LAYOUT.CODE_SIZE_DEFAULT);
	private _showDiff = writable(false);

	// Reactive properties - subscribe directly to stores
	get showCode(): Readable<boolean> {
		return this._showCode;
	}
	get savedPreviewSize(): Readable<number> {
		return this._savedPreviewSize;
	}
	get savedCodeSize(): Readable<number> {
		return this._savedCodeSize;
	}
	get showDiff(): Readable<boolean> {
		return this._showDiff;
	}

	/** Toggle visibility of the code panel. */
	toggleCode() {
		this._showCode.update((value) => !value);
	}

	/** Toggle the diff view in the code panel. */
	toggleDiff() {
		this._showDiff.update((value) => !value);
	}

	/** Persist the last preview pane size. */
	setPreviewSize(size: number) {
		this._savedPreviewSize.set(size);
	}

	/** Persist the last code pane size. */
	setCodeSize(size: number) {
		this._savedCodeSize.set(size);
	}

	/** Restore persisted UI layout values. */
	restore(data: { showCode: boolean; preview: number; code: number }) {
		this._showCode.set(data.showCode);
		this._savedPreviewSize.set(data.preview);
		this._savedCodeSize.set(data.code);
	}

	/** Serialize UI layout for persistence. */
	toJSON(): { showCode: boolean; preview: number; code: number } {
		return {
			showCode: get(this._showCode),
			preview: get(this._savedPreviewSize),
			code: get(this._savedCodeSize)
		};
	}
}
