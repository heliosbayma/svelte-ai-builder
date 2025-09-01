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

// -------- Plan/Build flow additions --------
export const PLAN_PROMPT = `You are a product UI planner. Produce a minimal JSON plan for a single Svelte 5 page.
Output ONLY compact JSON (no prose, no markdown):
{
  "sections": [
    {"type":"TopNav","props":{"logoText":"string","links":[{"label":"string","href":"string"}]}},
    {"type":"Hero","props":{"title":"string","subtitle":"string","primaryCta":"string","secondaryCta?":"string","imageUrl?":"string"}},
    {"type":"CardGrid","props":{"columns":3,"cards":[{"title":"string","price?":"string","imageUrl?":"string","badge?":"string"}]}}
  ],
  "theme":{"preset":"Neon|Minimal|Retro","primary":"#hex","radius":"sm|md|lg"}
}
Use defaults if user gave no values. Keep JSON small and valid.`;

export function createBuildFromPlanPrompt(planJson: string): string {
	return `Build one complete Svelte 5 page from this plan. Follow the Definition of Done exactly. Output only the component code.

PLAN JSON:
${planJson}

SECTION CATALOG (examples to adapt):
// TopNav
<nav class="flex items-center justify-between px-4 h-14 bg-background text-foreground">
  <div class="font-bold">{logoText}</div>
  <div class="flex items-center gap-4">{#each links as l (l.href)}<a href={l.href} class="text-sm hover:text-primary">{l.label}</a>{/each}</div>
</nav>

// Hero
<section class="relative overflow-hidden py-16 bg-gradient-to-br from-primary/10 to-blue-500/10">
  <div class="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
    <div>
      <h1 class="text-4xl md:text-5xl font-extrabold mb-4">{title}</h1>
      <p class="text-muted-foreground mb-6">{subtitle}</p>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-md bg-primary text-primary-foreground" onclick={handlePrimary}>{primaryCta}</button>
        {#if secondaryCta}<button class="px-4 py-2 rounded-md border" onclick={handleSecondary}>{secondaryCta}</button>{/if}
      </div>
    </div>
    {#if imageUrl}<img src={imageUrl} alt="" class="rounded-lg shadow-md" />{/if}
  </div>
</section>

// CardGrid
<section class="container mx-auto px-4 py-12">
  <div class="grid gap-6" style={\`grid-template-columns: repeat(\${columns}, minmax(0,1fr));\`}>
    {#each cards as c (c.title)}
      <article class="bg-card text-card-foreground rounded-lg border overflow-hidden">
        {#if c.imageUrl}<img src={c.imageUrl} alt="" class="w-full h-40 object-cover" />{/if}
        <div class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">{c.title}</h3>
            {#if c.badge}<span class="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">{c.badge}</span>{/if}
          </div>
          {#if c.price}<p class="text-sm text-muted-foreground">{c.price}</p>{/if}
        </div>
      </article>
    {/each}
  </div>
</section>`;
}
