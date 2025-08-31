<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	interface Props {
		showCode: boolean;
		onToggleCode: () => void;
	}

	let { showCode, onToggleCode }: Props = $props();
</script>

<header class="border-b bg-card px-6 py-4 flex items-center justify-between">
	<section class="flex items-center gap-4">
		<h1 class="text-2xl font-bold">AI Svelte Builder</h1>
		<span class="text-sm text-muted-foreground">v1.0.0</span>
	</section>
	<nav class="flex items-center gap-2">
		<Button
			variant={showCode ? "default" : "outline"}
			size="sm"
			onclick={onToggleCode}
		>
			{showCode ? "Hide" : "Show"} Code
		</Button>
		<Button variant="ghost" size="sm">API Keys</Button>
		<Button variant="ghost" size="sm">Export</Button>
	</nav>
</header>