<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ApiKeySettings from './ApiKeySettings.svelte';

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
		canUndo?: boolean;
		canRedo?: boolean;
		onUndo?: () => void;
		onRedo?: () => void;
	}

	let { showCode, onToggleCode, canUndo = false, canRedo = false, onUndo, onRedo }: Props = $props();
	let showApiKeySettings = $state(false);

	function openApiKeySettings() {
		showApiKeySettings = true;
	}

	function closeApiKeySettings() {
		showApiKeySettings = false;
	}
</script>

<header class="border-b bg-card px-6 py-4 flex items-center justify-between">
	<section class="flex items-center gap-4">
		<h1 class="text-2xl font-bold">AI Svelte Builder</h1>
		<span class="text-sm text-muted-foreground">v1.0.0</span>
	</section>
	<nav class="flex items-center gap-2">
		<!-- History controls -->
		<div class="flex items-center gap-1 border-r pr-2 mr-2">
			<Button 
				variant="ghost" 
				size="sm" 
				disabled={!canUndo}
				onclick={onUndo}
				aria-label="Undo last change"
				title="Undo (⌘Z)"
			>
				↶
			</Button>
			<Button 
				variant="ghost" 
				size="sm" 
				disabled={!canRedo}
				onclick={onRedo}
				aria-label="Redo last undone change"
				title="Redo (⌘⇧Z)"
			>
				↷
			</Button>
		</div>
		
		<Button variant={showCode ? 'default' : 'outline'} size="sm" onclick={onToggleCode}>
			{showCode ? 'Hide' : 'Show'} Code
		</Button>
		<Button variant="ghost" size="sm" onclick={openApiKeySettings}>API Keys</Button>
		<Button variant="ghost" size="sm">Export</Button>
	</nav>
</header>

<ApiKeySettings isOpen={showApiKeySettings} onClose={closeApiKeySettings} />
