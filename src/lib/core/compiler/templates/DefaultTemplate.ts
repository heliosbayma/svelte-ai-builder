import type { TemplateGenerator, TemplateIntent } from './types';

export class DefaultTemplate implements TemplateGenerator {
	matches(intent: TemplateIntent): boolean {
		return intent.type === 'default';
	}

	generate(intent: TemplateIntent): string {
		return `<script lang="ts">
	let message = $state("Welcome to Svelte!");

	function handleClick() {
		message = "Hello, World!";
	}
</script>

<div class="p-8 max-w-lg mx-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-xl text-center">
	<h1 class="text-2xl font-bold mb-6">{message}</h1>
	
	<p class="mb-6 text-blue-100">
		This component was generated from your request. Try modifying your prompt for different results!
	</p>
	
	<button
		onclick={handleClick}
		class="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
	>
		Click me
	</button>
	
	<div class="mt-6 text-xs text-blue-200">
		Original prompt: "${intent.originalSource.slice(0, 100)}${intent.originalSource.length > 100 ? '...' : ''}"
	</div>
</div>`;
	}
}
