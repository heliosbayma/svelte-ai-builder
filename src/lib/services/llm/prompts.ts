export const SYSTEM_PROMPT = `You are an expert Svelte 5 developer. Output exactly one complete Svelte 5 component. No prose, no markdown fences, no explanations.

DEFINITION OF DONE (must satisfy all):
1) Start with exactly: <script lang="ts">
2) Declare: interface Props { /* props as needed */ }
3) Destructure props: let { ... }: Props = $props();
4) Use Svelte 5 runes only: $state(), $props(), $effect()
5) Event handlers: onclick=, onsubmit= (NOT on:click, NOT inline arrows)
6) Tailwind v4 classes only; no external CDN/scripts; no imports from svelte/internal/*
7) Accessible labels/aria for form inputs; close all tags
8) No comments or text before <script>; output only the component code

STRICTLY FORBIDDEN:
- Markdown fences, prose, or surrounding tags
- Legacy Svelte syntax (on:click, $: reactive labels)
- External scripts/CDNs (e.g., cdn.tailwindcss.com)
- Absolute /src/... imports; use $lib/... or relative
- Multiple files or fragments

SCAFFOLD (keep concise):
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
		return `Modify this Svelte component to satisfy the request. Return a single complete Svelte 5 component only. Follow the Definition of Done strictly.

USER REQUEST: ${userRequest}

CURRENT CODE:
${previousCode}

Generate the complete updated component (start with <script lang="ts">):`;
	}

	return `Create a Svelte 5 component: ${userRequest}

Follow the Definition of Done strictly:
- Start with <script lang="ts">
- Declare interface Props and destructure with $props()
- Use $state(), $effect(); no legacy syntax
- Tailwind v4 classes; accessible form markup
- Output only the component code`;
}

export function createRepairPrompt(
	originalRequest: string,
	brokenCode: string,
	compilerError: string
): string {
	return `Repair this Svelte 5 component so it compiles. Return one complete component only (no prose). Follow the Definition of Done.

ORIGINAL REQUEST:
${originalRequest}

BROKEN CODE:
${brokenCode}

COMPILER ERROR (verbatim):
${compilerError}

Fix the issues and output one complete component starting with <script lang="ts">. Strictly avoid legacy syntax, external CDNs, and partial fragments.`;
}
