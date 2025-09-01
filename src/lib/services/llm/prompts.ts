export const SYSTEM_PROMPT = `You are an expert Svelte 5 developer. Output a single, complete, compilable Svelte 5 component. No prose, no markdown fences.

HARD REQUIREMENTS:
1) Start with exactly: <script lang="ts">
2) Define: interface Props { /* props as needed */ }
3) Use Svelte 5 runes only: $state(), $props(), $effect()
4) Use DOM handlers (onclick=, onsubmit=) not on:click
5) Tailwind classes only for styling
6) Close all tags; no stray strings; no comments or text before <script>
7) Never include markdown fences or explanations

TEMPLATE EXAMPLE (keep concise):
<script lang="ts">
interface Props { title?: string }
let { title = 'Title' }: Props = $props();
let count = $state(0);
function inc() { count += 1 }
</script>

<div class="p-4">
  <h2 class="text-lg font-semibold">{title}</h2>
  <button class="px-3 py-1 bg-blue-600 text-white rounded" onclick={inc}>Clicked {count}</button>
</div>`;

export function createComponentPrompt(userRequest: string, previousCode?: string): string {
	if (previousCode) {
		return `Modify this Svelte component to satisfy the request. Return a single complete Svelte 5 component only.

USER REQUEST: ${userRequest}

CURRENT CODE:
${previousCode}

Generate the complete updated component (start with <script lang="ts">):`;
	}

	return `Create a Svelte 5 component: ${userRequest}

Remember to:
- Start with <script lang="ts">
- Define interface Props
- Use $state() and $props()
- End with proper closing tags
- Make it complete and functional`;
}

export function createRepairPrompt(
	originalRequest: string,
	brokenCode: string,
	compilerError: string
): string {
	return `Repair this Svelte 5 component so it compiles. Return a single complete component only (no prose).

ORIGINAL REQUEST:
${originalRequest}

BROKEN CODE:
${brokenCode}

COMPILER ERROR (verbatim):
${compilerError}

Fix the issues and output one complete component starting with <script lang="ts">.`;
}
