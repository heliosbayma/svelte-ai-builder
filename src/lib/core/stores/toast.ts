import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	title?: string;
	message: string;
	duration?: number;
	dismissible?: boolean;
	action?: {
		label: string;
		handler: () => void;
	};
}

interface ToastStore {
	toasts: Toast[];
}

// Default durations by type (in ms)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
	success: 4000,
	info: 5000,
	warning: 6000,
	error: 8000 // Errors stay longer for user to read
};

const createToastStore = () => {
	const { subscribe, update } = writable<ToastStore>({ toasts: [] });

	const addToast = (toast: Omit<Toast, 'id'>) => {
		if (!browser) return;

		const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];
		const dismissible = toast.dismissible ?? true;

		const newToast: Toast = {
			...toast,
			id,
			duration,
			dismissible
		};

		update((state) => ({
			toasts: [...state.toasts, newToast]
		}));

		// Auto-dismiss after duration (unless duration is 0 for permanent toasts)
		if (duration > 0) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}

		return id;
	};

	const removeToast = (id: string) => {
		update((state) => ({
			toasts: state.toasts.filter((toast) => toast.id !== id)
		}));
	};

	const clearAll = () => {
		update(() => ({ toasts: [] }));
	};

	// Convenience methods for different toast types
	const success = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
		addToast({ type: 'success', message, ...options });

	const error = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
		addToast({ type: 'error', message, ...options });

	const warning = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
		addToast({ type: 'warning', message, ...options });

	const info = (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) =>
		addToast({ type: 'info', message, ...options });

	return {
		subscribe,
		addToast,
		removeToast,
		clearAll,
		success,
		error,
		warning,
		info
	};
};

export const toastStore = createToastStore();

// Export individual methods for convenience
export const { success, error, warning, info } = toastStore;
