<script lang="ts">
	import type { ChatMessage } from '$lib/stores/chat';
	import {
		Copy as CopyIcon,
		Code as CodeIcon,
		Wand2 as Wand2Icon,
		Eye as EyeIcon,
		EyeOff as EyeOffIcon
	} from '@lucide/svelte';

	interface Props {
		message: ChatMessage;
		onUseCode?: (code: string) => void;
		onRefine?: (messageId: string) => void;
	}

	let { message, onUseCode, onRefine }: Props = $props();
	let expanded = $state(false);

	function handleCopy() {
		if (message.generatedCode) {
			navigator.clipboard.writeText(message.generatedCode);
		}
	}

	function handleUseCode() {
		if (message.generatedCode) {
			onUseCode?.(message.generatedCode);
		}
	}

	function handleRefine() {
		onRefine?.(message.id);
	}

	function formatProvider(p?: string): string {
		if (!p) return '';
		switch (p) {
			case 'openai':
				return 'OpenAI';
			case 'anthropic':
				return 'Anthropic';
			case 'gemini':
				return 'Gemini';
			default:
				return p;
		}
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}


	function getCodePreview(code: string): string {
		if (!code) return 'Generated code';

		// Extract meaningful component/page names, but avoid technical variable names
		const componentMatch = code.match(
			/export\s+default\s+(\w+)|class\s+([A-Z]\w*)|function\s+([A-Z]\w*)/
		);
		if (componentMatch) {
			const name = componentMatch[1] || componentMatch[2] || componentMatch[3];
			// Only use names that look like proper component names (start with capital, not technical vars)
			if (
				name &&
				/^[A-Z][a-zA-Z]*$/.test(name) &&
				!/(path|state|data|config|util|helper)/i.test(name)
			) {
				return `${name}`;
			}
		}

		// Look for main HTML elements to understand the UI type
		const formMatch = code.match(/<form/i);
		const buttonMatch = code.match(/<button/i);
		const inputMatch = code.match(/<input/i);
		const cardMatch = code.match(/<card|class=".*card/i);
		const modalMatch = code.match(/<dialog|class=".*modal|class=".*dialog/i);
		const navMatch = code.match(/<nav|class=".*nav/i);
		const headerMatch = code.match(/<header/i);
		const footerMatch = code.match(/<footer/i);
		const sidebarMatch = code.match(/<aside|class=".*sidebar/i);
		const dashboardMatch = code.match(/dashboard|metric|chart|analytics/i);
		const loginMatch = code.match(/login|signin|auth/i);
		const profileMatch = code.match(/profile|avatar|user.*info/i);
		const settingsMatch = code.match(/settings|config|preferences/i);

		// App-level patterns
		if (loginMatch) return 'Login page';
		if (profileMatch) return 'Profile page';
		if (settingsMatch) return 'Settings page';
		if (dashboardMatch) return 'Dashboard';
		if (navMatch && sidebarMatch) return 'App layout';
		if (navMatch) return 'Navigation';
		if (sidebarMatch) return 'Sidebar';
		if (formMatch && inputMatch) return 'Form';
		if (modalMatch) return 'Modal dialog';
		if (headerMatch) return 'Header';
		if (footerMatch) return 'Footer';
		if (cardMatch) return 'Card UI';
		if (buttonMatch && !formMatch) return 'Button UI';

		// Look for common UI patterns
		const gridMatch = code.match(/grid|flex-.*gap|space-[xy]/);
		const listMatch = code.match(/<ul|<ol|<li/i);
		const tableMatch = code.match(/<table|<thead|<tbody|<tr|<td/i);

		if (tableMatch) return 'Data table';
		if (gridMatch) return 'Layout grid';
		if (listMatch) return 'List view';

		// Fallback based on complexity
		const lines = code.split('\n').filter((line) => line.trim()).length;
		if (lines > 100) return 'Full page';
		if (lines > 50) return 'Complex UI';
		if (lines > 20) return 'Multi-section UI';

		return 'UI element';
	}

	$effect(() => {
		try {
			const key = `msg_expanded_${message.id}`;
			const saved = sessionStorage.getItem(key);
			if (saved === '1') expanded = true;
		} catch {
			// Ignore localStorage errors
		}
	});

	function toggleExpanded() {
		expanded = !expanded;
		try {
			sessionStorage.setItem(`msg_expanded_${message.id}`, expanded ? '1' : '0');
		} catch {
			// Ignore localStorage errors
		}
	}
</script>

<article
	class="{message.role === 'user' ? 'mb-3' : 'mb-8'} flex {message.role === 'user'
		? 'justify-end'
		: 'justify-start'}"
	aria-label={message.role === 'user' ? 'User message' : 'Assistant message'}
>
	<div class="w-full {message.role === 'user' ? 'order-2' : 'order-1'}" role="group">
		{#if message.role === 'user'}
			<!-- User message: Keep the card/bubble style -->
			<div class="flex justify-end">
				<div
					class="max-w-[80%] p-3 rounded-lg bg-slate-600 dark:bg-slate-700 text-slate-100 shadow-sm"
				>
					<div class="whitespace-pre-wrap text-sm">{message.content}</div>
				</div>
			</div>
		{:else}
			<!-- AI message: More integrated, minimal styling -->
			<div class="w-full">
				{#if message.error}
					<div class="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
						<div class="text-destructive text-sm font-medium mb-2">Error</div>
						<div class="text-destructive text-sm">{message.error}</div>
					</div>
				{:else if message.generatedCode && !message.streaming}
					<!-- Code generation result -->
					<div class="space-y-3">
						<div class="flex items-center justify-between gap-2 text-sm text-muted-foreground">
							<div class="flex items-center gap-2 min-w-0 flex-1">
								<div
									class="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
								>
									<span class="text-xs font-medium">AI</span>
								</div>
							</div>
							<div class="flex items-center gap-2 flex-shrink-0 text-xs">
								<span>{formatTime(message.timestamp)}</span>
								{#if message.provider}
									<span class="px-1.5 py-0.5 rounded bg-muted/60">
										{formatProvider(message.provider)}
									</span>
								{/if}
							</div>
						</div>

						{#if expanded}
							<pre
								id={`code-${message.id}`}
								class="font-mono text-xs whitespace-pre-wrap break-words max-h-96 overflow-auto rounded-lg bg-muted/30 border p-4">{message.generatedCode}</pre>
						{:else}
							<div class="p-4 rounded-lg bg-muted/20 border border-dashed">
								<p class="text-sm text-muted-foreground">
									{getCodePreview(message.generatedCode)} - Click "Show" below to expand.
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Regular AI text response -->
					<div class="space-y-2">
						<div class="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-2">
							<div class="flex items-center gap-2">
								<div
									class="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
								>
									<span class="text-xs font-medium">AI</span>
								</div>
							</div>
							<div class="flex items-center gap-2 flex-shrink-0 text-xs">
								<span>{formatTime(message.timestamp)}</span>
								{#if message.provider}
									<span class="px-1.5 py-0.5 rounded bg-muted/60">
										{formatProvider(message.provider)}
									</span>
								{/if}
							</div>
						</div>
						<div class="whitespace-pre-wrap text-sm leading-relaxed">
							{message.content}
						</div>
						{#if message.streaming}
							<div class="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
								<div class="w-1 h-1 bg-current rounded-full animate-pulse"></div>
								<div class="w-1 h-1 bg-current rounded-full animate-pulse delay-100"></div>
								<div class="w-1 h-1 bg-current rounded-full animate-pulse delay-200"></div>
								<span class="ml-2">Generating...</span>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Simplified action buttons for assistant code -->
		{#if message.role === 'assistant' && message.generatedCode && !message.streaming && !message.error}
			<div
				class="mt-1 flex items-center justify-between text-xs text-muted-foreground"
				aria-label="Message actions"
			>
				<button
					class="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent/50"
					onclick={toggleExpanded}
					aria-expanded={expanded}
					aria-controls={`code-${message.id}`}
					title={expanded ? 'Hide code' : 'Show code'}
				>
					{#if expanded}
						<EyeOffIcon class="w-4 h-4" />
					{:else}
						<EyeIcon class="w-4 h-4" />
					{/if}
					<span>{expanded ? 'Hide' : 'Show'}</span>
				</button>

				<div class="flex items-center gap-1">
					<button
						class="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent/50"
						onclick={handleUseCode}
						aria-label="Use this generated code in the editor"
						title="Use code"
					>
						<CodeIcon class="w-4 h-4" />
					</button>

					<button
						class="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent/50"
						onclick={handleCopy}
						aria-label="Copy code"
						title="Copy code"
					>
						<CopyIcon class="w-4 h-4" />
					</button>

					<button
						class="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent/50"
						onclick={handleRefine}
						aria-label="Refine this generated component"
						title="Refine"
					>
						<Wand2Icon class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</article>
