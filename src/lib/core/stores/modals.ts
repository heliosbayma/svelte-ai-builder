import { writable, derived, get } from 'svelte/store';

export type ModalType = 'apiKeys' | 'history' | 'sessionMenu' | 'apiKeysRequired' | null;

interface ModalState {
	activeModal: ModalType;
}

const defaultState: ModalState = {
	activeModal: null
};

/** Manage the currently active top-level modal. */
function createModalStore() {
	const { subscribe, set, update } = writable<ModalState>(defaultState);

	return {
		subscribe,
		open: (modal: ModalType) => set({ activeModal: modal }),
		close: () => set({ activeModal: null }),
		toggle: (modal: ModalType) =>
			update((state) => ({
				activeModal: state.activeModal === modal ? null : modal
			})),
		isOpen: (modal: ModalType) => get({ subscribe }).activeModal === modal
	};
}

export const modalStore = createModalStore();

// Helper derived stores for common modals
export const isApiKeysOpen = derived(modalStore, (s) => s.activeModal === 'apiKeys');
export const isHistoryOpen = derived(modalStore, (s) => s.activeModal === 'history');
export const isSessionMenuOpen = derived(modalStore, (s) => s.activeModal === 'sessionMenu');
export const isApiKeysRequiredOpen = derived(
	modalStore,
	(s) => s.activeModal === 'apiKeysRequired'
);
