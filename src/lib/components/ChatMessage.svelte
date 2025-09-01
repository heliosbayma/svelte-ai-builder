<script lang="ts">
	import type { ChatMessage } from '$lib/stores/chat';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';

	interface Props {
		message: ChatMessage;
		onUseCode?: (code: string) => void;
		onRefine?: (messageId: string) => void;
	}

	let { message, onUseCode, onRefine }: Props = $props();

	function handleUseCode() {
		if (message.generatedCode) {
			onUseCode?.(message.generatedCode);
		}
	}

	function handleRefine() {
		onRefine?.(message.id);
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}
</script>

<article class="mb-4 flex {message.role === 'user' ? 'justify-end' : 'justify-start'}" aria-label="{message.role === 'user' ? 'User message' : 'Assistant message'}">
	<div class="max-w-[80%] {message.role === 'user' ? 'order-2' : 'order-1'}" role="group">
		<!-- Message bubble -->
		<Card class={`p-3 ${
			message.role === 'user' 
				? 'bg-primary text-primary-foreground ml-12' 
				: message.error
					? 'bg-destructive/10 border-destructive/20 mr-12'
					: 'bg-muted mr-12'
		}`}>
			{#if message.error}
				<div class="text-destructive text-sm font-medium mb-2">Error</div>
				<div class="text-destructive">{message.error}</div>
			{:else}
				<div class="whitespace-pre-wrap text-sm">{message.content}</div>
				
				{#if message.streaming}
					<div class="flex items-center gap-1 mt-2 text-xs opacity-70">
						<div class="w-1 h-1 bg-current rounded-full animate-pulse"></div>
						<div class="w-1 h-1 bg-current rounded-full animate-pulse delay-100"></div>
						<div class="w-1 h-1 bg-current rounded-full animate-pulse delay-200"></div>
						<span class="ml-2">Generating...</span>
					</div>
				{/if}
			{/if}
		</Card>

		<!-- Actions for assistant messages with code -->
		{#if message.role === 'assistant' && message.generatedCode && !message.streaming && !message.error}
			<footer class="flex items-center gap-2 mt-2 text-xs text-muted-foreground" aria-label="Message metadata and actions">
				<time datetime={new Date(message.timestamp).toISOString()}>
					{formatTime(message.timestamp)}
				</time>
				{#if message.provider}
					<span>via {message.provider}</span>
				{/if}
				<nav class="flex gap-1 ml-auto" aria-label="Message actions">
					<Button
						variant="ghost"
						size="sm" 
						onclick={handleUseCode}
						class="h-6 px-2 text-xs"
						aria-label="Use this generated code in the editor"
					>
						Use Code
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleRefine}
						class="h-6 px-2 text-xs"
						aria-label="Refine this generated component"
					>
						Refine
					</Button>
				</nav>
			</footer>
		{:else if message.role === 'user'}
			<footer class="text-right mt-1" aria-label="Message timestamp">
				<time datetime={new Date(message.timestamp).toISOString()} class="text-xs text-muted-foreground">
					{formatTime(message.timestamp)}
				</time>
			</footer>
		{/if}
	</div>
</article>