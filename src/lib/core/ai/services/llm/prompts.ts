export const SYSTEM_PROMPT = `You are an expert Svelte 5 developer. Output exactly one complete Svelte 5 component. No prose, no markdown fences, no explanations.

DEFINITION OF DONE (must satisfy all):
1) Start with exactly: <script lang="ts">
2) Declare: interface Props { /* props as needed */ }
3) Destructure props: let { ... }: Props = $props();
4) Use Svelte 5 runes only: $state(), $props(), $effect()
5) Event handlers: onclick=, onsubmit= (NOT on:click, NOT inline arrows)
6) Tailwind v4 classes only; no external CDN/scripts; no imports from svelte/internal/*
7) Accessible labels/aria for form inputs; close all tags
8) Images: provide descriptive alt based on the subject; when unsure, use a concise subject phrase.
9) If you render internal nav links, implement simple in-component navigation: use let currentPath = $state('/'); define function nav(e) { const a = e.currentTarget; const href = a && a.getAttribute('href') || '/'; if (href.startsWith('/')) { e.preventDefault && e.preventDefault(); currentPath = href; } }; set anchors to href values and onclick={nav}; render the matching page content when currentPath changes.
10) No comments or text before <script>; output only the component code

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

Ensure images are semantically tied to the subject: when generating hero or cards, pick an imageSubject string (short noun phrase) derived from the user request or the item title, and set <img alt={imageSubject}>. Use the provided safeImage(url, imageSubject, w, h) helper pattern (pass the subject as the seed).
If you include a menu or nav links (e.g., /matches, /standings), implement simple in-component navigation: use let currentPath = $state('/'); define function nav(e) { const a = e.currentTarget as HTMLAnchorElement; const href = (a && a.getAttribute('href')) || '/'; if (href.startsWith('/')) { e.preventDefault && e.preventDefault(); currentPath = href; } }; set anchors to onclick={nav} and render a minimal content section for each linked route.

Generate the complete updated component (start with <script lang="ts">):`;
	}

	return `Create a Svelte 5 component: ${userRequest}

Follow the Definition of Done strictly:
- Start with <script lang="ts">
- Declare interface Props and destructure with $props()
- Use $state(), $effect(); no legacy syntax
- Tailwind v4 classes; accessible form markup
- Images: add descriptive alt, and pass a subject to safeImage as the seed
- If you include nav links, add simple in-component navigation (onclick={nav}) and minimal per-route content
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
    {"type":"Hero","props":{"title":"string","subtitle":"string","primaryCta":"string","secondaryCta?":"string","imageUrl?":"string","imageSubject?":"string"}},
    {"type":"CardGrid","props":{"columns":3,"cards":[{"title":"string","price?":"string","imageUrl?":"string","imageSubject?":"string","badge?":"string"}]}}
  ],
  "routes":[{"path":"/","sections":["TopNav","Hero","CardGrid"]}],
  "theme":{"preset":"Neon|Minimal|Retro","primary":"#hex","radius":"sm|md|lg"}
}
Use defaults if user gave no values. Keep JSON small and valid.`;

export function createBuildFromPlanPrompt(planJson: string): string {
	return `Build one complete Svelte 5 page from this plan. Follow the Definition of Done exactly. Output only the component code.

PLAN JSON:
${planJson}

LAYOUT RULES (must follow):
- Stack sections vertically in this exact order: TopNav -> Hero -> CardGrid. Each section spans full width.
- Wrap each section body with a centered container: max-w-7xl mx-auto px-4.
- Hero uses two columns on md+ (text, image). CardGrid is below Hero.
- Use a responsive grid for cards (no inline styles). See helper gridCols().

MAPPING RULES:
- Map TopNav.logoText/links, Hero.title/subtitle/primaryCta/secondaryCta?/imageUrl?/imageSubject?, and CardGrid.columns/cards exactly.
- For each hero and card, derive imageSubject if missing: a short noun phrase matching the item.
- If the plan has links with paths (e.g., /matches), implement a minimal client-side router using currentPath + nav handler; render a basic placeholder section per path so the user can navigate without leaving the preview.
- Add minimal interactivity: let cartCount = $state(0); function addToCart(){ cartCount += 1 }.
- Named handlers only, Tailwind v4 classes, runes, and Props as per DoD.

SCAFFOLD (adapt; keep concise):
<script lang="ts">
interface Props { title?: string }
let { title = 'Page' }: Props = $props();
let cartCount = $state(0);
function addToCart() { cartCount += 1 }
function handlePrimary() {}
function handleSecondary() {}
const links = [] as Array<{label:string;href:string}>;
const cards = [] as Array<{title:string;price?:string;imageUrl?:string;imageSubject?:string;badge?:string}>;
let columns = 3;
const hero = { title: '', subtitle: '', primaryCta: '', secondaryCta: '', imageUrl: '', imageSubject: '' };
let currentPath = $state('/');
function nav(e: Event) {
  const a = e.currentTarget as HTMLAnchorElement | null;
  const href = (a && a.getAttribute('href')) || '/';
  if (href.startsWith('/')) { (e as any).preventDefault && (e as any).preventDefault(); currentPath = href; }
}
function placeholder(seed: string, w = 640, h = 360) { return 'https://picsum.photos/seed/' + encodeURIComponent(seed) + '/' + w + '/' + h; }
function safeImage(url?: string | null, seed = 'image', w = 640, h = 360) {
  if (!url || /^url_to_/i.test(url)) return placeholder(seed, w, h);
  try { const u = new URL(url); return u.protocol.startsWith('http') ? url : placeholder(seed, w, h); } catch { return placeholder(seed, w, h); }
}
function gridCols(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}
</script>

<header class="sticky top-0 z-50 bg-background/80 backdrop-blur border-b supports-[backdrop-filter]:bg-background/60">
  <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
    <div class="font-bold">{title}</div>
    <nav class="flex items-center gap-6">{#each links as l (l.href)}<a href={l.href} class="text-sm hover:text-primary" onclick={nav}>{l.label}</a>{/each}</nav>
    <div class="text-sm">Cart: {cartCount}</div>
  </div>
</header>

{#if currentPath === '/'}
<section class="w-full pt-12 md:pt-16 bg-gradient-to-b from-muted/30 to-transparent">
  <div class="max-w-7xl mx-auto px-4 grid gap-10 md:grid-cols-[1.2fr_0.8fr] items-center">
    <div>
      <h1 class="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">{hero.title}</h1>
      {#if hero.subtitle}<p class="text-muted-foreground mb-6 max-w-prose">{hero.subtitle}</p>{/if}
      <div class="flex gap-3">
        {#if hero.primaryCta}<button class="px-4 py-2 rounded-md bg-primary text-primary-foreground" onclick={handlePrimary}>{hero.primaryCta}</button>{/if}
        {#if hero.secondaryCta}<button class="px-4 py-2 rounded-md border" onclick={handleSecondary}>{hero.secondaryCta}</button>{/if}
      </div>
    </div>
    <img src={safeImage(hero.imageUrl, hero.imageSubject || hero.title, 960, 540)} alt={hero.imageSubject || hero.title} class="w-full h-[320px] md:h-[420px] object-cover rounded-xl shadow-md" />
  </div>
</section>

<section class="py-12">
  <div class="max-w-7xl mx-auto px-4">
    <div class={"grid gap-8 " + gridCols(columns)}>
      {#each cards as c (c.title)}
        <article class="bg-card text-card-foreground rounded-xl border overflow-hidden shadow-sm">
          <img src={safeImage(c.imageUrl, c.imageSubject || c.title, 640, 360)} alt={c.imageSubject || c.title} class="w-full h-48 object-cover" />
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold">{c.title}</h3>
              {#if c.badge}<span class="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">{c.badge}</span>{/if}
            </div>
            {#if c.price}<p class="text-sm text-muted-foreground">{c.price}</p>{/if}
            <button class="mt-3 px-3 py-1.5 bg-green-600 text-white rounded-md" onclick={addToCart}>Add to Cart</button>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
{:else}
<section class="py-16">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-2xl font-semibold mb-2">{currentPath.replace('/', '').toUpperCase()}</h2>
    <p class="text-muted-foreground">This is a placeholder for {currentPath}.</p>
  </div>
</section>
{/if}`;
}
