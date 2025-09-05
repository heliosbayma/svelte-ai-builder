import type { TemplateGenerator, TemplateIntent } from './types';

export class ButtonTemplate implements TemplateGenerator {
	matches(intent: TemplateIntent): boolean {
		return intent.type === 'button';
	}

	generate(intent: TemplateIntent): string {
		return `<script lang="ts">
	let count = $state(0);
	let message = $state("Hello!");

	function handleClick() {
		count += 1;
		message = count === 1 ? "Clicked once!" : "Clicked " + count + " times!";
	}
</script>

<div class="p-6 max-w-sm mx-auto bg-white rounded-lg shadow-md text-center">
	<h2 class="text-xl font-bold mb-4">{message}</h2>

	<button
		onclick={handleClick}
		class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
	>
		Click me ({count})
	</button>
</div>`;
	}
}
