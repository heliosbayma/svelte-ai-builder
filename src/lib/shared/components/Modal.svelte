<script lang="ts">
	import { handleModalKeyboard } from '$lib/shared/utils/keyboard';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/shared/ui/card';

	interface Props {
		isOpen: boolean;
		title: string;
		description?: string;
		onClose: () => void;
		onSave?: () => void;
		children?: any;
	}

	let { isOpen, title, description, onClose, onSave, children }: Props = $props();
	let modalRef = $state<HTMLDivElement>();

	$effect(() => {
		if (isOpen && modalRef) {
			modalRef.focus();
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		handleModalKeyboard(e, {
			onEscape: onClose,
			onMetaEnter: onSave
		});
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
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		onclick={handleBackdropClick}
		onkeydown={handleKeyDown}
		tabindex="-1"
	>
		<Card class="w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
			<CardHeader>
				<CardTitle id="modal-title">{title}</CardTitle>
				{#if description}
					<CardDescription>
						{description}
						<span class="text-xs block mt-1 opacity-70">Press ⌘+Enter to save, Esc to close</span>
					</CardDescription>
				{/if}
			</CardHeader>

			<CardContent class="space-y-4">
				{@render children()}
			</CardContent>
		</Card>
	</div>
{/if}
