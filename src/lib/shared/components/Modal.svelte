<script lang="ts">
	import { handleModalKeyboard } from '$lib/shared/utils/keyboard';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/shared/ui/card';

	interface Props {
		isOpen: boolean;
		title: string;
		description?: string;
		onClose: () => void;
		onSave?: () => void;
		showShortcutsHint?: boolean;
		children?: any;
	}

	let {
		isOpen,
		title,
		description,
		onClose,
		onSave,
		children,
		showShortcutsHint = false
	}: Props = $props();
	let modalRef = $state<HTMLDivElement>();
	let lastActive: HTMLElement | null = null;

	$effect(() => {
		if (isOpen) {
			lastActive = (document.activeElement as HTMLElement) || null;
			if (modalRef) {
				modalRef.focus();
			}
		} else if (!isOpen && lastActive) {
			// Return focus to trigger
			try {
				lastActive.focus();
			} catch {}
		}
	});

	function focusables(): HTMLElement[] {
		const root = modalRef as HTMLElement | null;
		if (!root) return [];
		const selectors = [
			'a[href]',
			'button:not([disabled])',
			'textarea:not([disabled])',
			'input:not([disabled])',
			'select:not([disabled])',
			'[tabindex]:not([tabindex="-1"])'
		];
		return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')));
	}

	function trapTab(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;
		const nodes = focusables();
		if (nodes.length === 0) return;
		const first = nodes[0];
		const last = nodes[nodes.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey) {
			if (active === first || !modalRef?.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (active === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		handleModalKeyboard(e, {
			onEscape: onClose,
			onMetaEnter: onSave
		});
		trapTab(e);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		bind:this={modalRef}
		class="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		onclick={handleBackdropClick}
		onkeydown={handleKeyDown}
		tabindex="-1"
	>
		<Card class="animate-in zoom-in-95 mx-4 w-full max-w-lg duration-200">
			<CardHeader>
				<CardTitle id="modal-title">{title}</CardTitle>
				{#if description}
					<CardDescription>
						{description}
						{#if showShortcutsHint}
							<span class="mt-1 block text-xs opacity-70">Press ⌘+Enter to save, Esc to close</span>
						{/if}
					</CardDescription>
				{/if}
			</CardHeader>

			<CardContent class="space-y-4">
				{@render children()}
			</CardContent>
		</Card>
	</div>
{/if}
