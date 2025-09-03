import type { TemplateGenerator, TemplateIntent } from './types';

export class FormTemplate implements TemplateGenerator {
	matches(intent: TemplateIntent): boolean {
		return intent.type === 'form' && !intent.hasValidation;
	}

	generate(intent: TemplateIntent): string {
		return `<script lang="ts">
	let inputValue = $state("");
	let result = $state("");

	function handleSubmit() {
		result = "You entered: " + inputValue;
	}
</script>

<div class="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
	<h2 class="text-xl font-bold mb-4">Input Form</h2>

	<div class="space-y-4">
		<input
			bind:value={inputValue}
			class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Enter something..."
		/>

		<button
			onclick={handleSubmit}
			class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
		>
			Submit
		</button>

		{#if result}
			<div class="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
				{result}
			</div>
		{/if}
	</div>
</div>`;
	}
}