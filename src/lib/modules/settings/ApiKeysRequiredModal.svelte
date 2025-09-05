<script lang="ts">
	import Modal from '$lib/shared/components/Modal.svelte';
	import { Button } from '$lib/shared/ui/button';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onOpenSettings: () => void;
	}

	let { isOpen, onClose, onOpenSettings }: Props = $props();

	function handleAddKeys() {
		onClose();
		onOpenSettings();
	}
</script>

<Modal
	{isOpen}
	title="Add your API keys to start using the builder"
	showShortcutsHint={false}
	{onClose}
>
	<p class="text-muted-foreground text-sm">
		Add at least one API provider key to start generating applications. You can update or remove
		keys anytime in Settings. Your keys remain encrypted on your device.
	</p>

	<footer class="flex items-center justify-end gap-2 border-t pt-4">
		<Button variant="outline" onclick={onClose}>Cancel</Button>
		<Button onclick={handleAddKeys}>Add keys</Button>
	</footer>
</Modal>
