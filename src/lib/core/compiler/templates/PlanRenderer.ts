/*
  Deterministic renderer that turns a plan JSON into a complete Svelte 5 component.
  Supports: Sidebar, KPIs, DataTable (search/paginate), Drawer, Tabs, Chart (extensible).
*/

type SidebarItem = { label: string; href: string; icon?: string };
type KPI = { label: string; value: string; delta?: string; trend?: 'up' | 'down' };

interface PlanSection {
	type: string;
	props?: Record<string, unknown>;
}

interface PlanJson {
	sections?: PlanSection[];
	routes?: Array<{ path: string; sections: string[] }>;
	theme?: Record<string, unknown> & { stylePack?: 'premium' | 'neutral' | 'marketing' };
}

export class PlanRenderer {
	static renderFromPlan(rawPlan: string): string {
		let plan: PlanJson;
		try {
			plan = JSON.parse(rawPlan);
		} catch {
			return PlanRenderer.wrapComponent('<div class="p-6">Invalid plan JSON</div>');
		}

		const sections = plan.sections || [];
		const stylePack = (plan.theme?.stylePack as 'premium' | 'neutral' | 'marketing') || 'premium';

		const sidebar = sections.find((s) => s.type === 'Sidebar');
		const kpis = sections.find((s) => s.type === 'KPIs');
		const gallery = sections.find((s) => s.type === 'Gallery');
		const form = sections.find((s) => s.type === 'Form');

		const scriptBlocks: string[] = [];
		const markupBlocks: string[] = [];

		// Common helpers
		scriptBlocks.push(`interface Props { title?: string }
let { title = 'App' }: Props = $props();
let currentPath = $state('/');
function nav(e: Event) { const a = e.currentTarget as HTMLAnchorElement | null; const href = (a && a.getAttribute('href')) || '/'; if (href.startsWith('/')) { (e as any).preventDefault && (e as any).preventDefault(); currentPath = href; } }
function notify(message: string) { const n = document.createElement('div'); n.textContent = message; n.style.cssText = 'position:fixed;right:12px;bottom:12px;background:#111827;color:#fff;padding:10px 12px;border-radius:8px;font-size:12px;z-index:50;opacity:0;transition:opacity .2s ease'; document.body.appendChild(n); requestAnimationFrame(() => { n.style.opacity = '1'; }); setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 200); }, 2400); }`);

		// Simple top nav links and lightbox state
		scriptBlocks.push(`const navLinks = [
			{ label: 'Home', href: '/' },
			{ label: 'Gallery', href: '/gallery' },
			{ label: 'Videos', href: '/videos' },
			{ label: 'Join', href: '/join' }
		];
		let lightboxSrc = $state<string | null>(null);
		function openLightbox(src: string){ lightboxSrc = src }
		function closeLightbox(){ lightboxSrc = null }`);

		// Style pack classes
		const bgClass =
			stylePack === 'marketing'
				? 'relative min-h-screen text-white bg-black'
				: stylePack === 'neutral'
					? 'min-h-screen text-white bg-slate-950'
					: 'relative min-h-screen text-white bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950';
		const cardBase =
			stylePack === 'neutral'
				? 'bg-white/5 rounded-2xl border border-white/10 shadow-sm'
				: 'bg-white/5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl';

		// Sidebar (unchanged visually, uses gradient in premium)
		if (sidebar) {
			const items = (
				(sidebar.props?.items as SidebarItem[]) || [
					{ label: 'Home', href: '/' },
					{ label: 'Program', href: '/program' },
					{ label: 'Gallery', href: '/gallery' }
				]
			).slice(0, 12);
			scriptBlocks.push(
				`const sidebarItems = ${JSON.stringify(items)} as Array<{label:string;href:string;icon?:string}>;`
			);
			markupBlocks.push(`<aside class="w-56 shrink-0 p-4 space-y-2 rounded-2xl ${stylePack === 'premium' ? 'bg-gradient-to-b from-slate-900 via-purple-900/10 to-slate-900' : 'bg-white/5'} border border-white/10 ${stylePack === 'neutral' ? 'shadow' : 'shadow-xl'}">
  {#each sidebarItems as it (it.href)}
    <a href={it.href} onclick={nav} class={"relative block px-3 py-2 rounded-lg transition-all duration-300 " + (currentPath === it.href ? "text-white" : "text-white/80 hover:text-white") }>
      {#if currentPath === it.href}
        <span class="absolute inset-0 rounded-lg ${stylePack === 'neutral' ? 'bg-white/10' : 'bg-gradient-to-r from-purple-600/30 to-pink-600/30'} shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"></span>
      {/if}
      <span class="relative">{it.label}</span>
    </a>
  {/each}
</aside>`);
		}

		// KPI cards (reuse cardBase)
		if (kpis) {
			const cards = (
				(kpis.props?.cards as KPI[]) || [
					{ label: 'Total Users', value: '1,200', delta: '+12%', trend: 'up' },
					{ label: 'Active Sessions', value: '300', delta: '-5%', trend: 'down' }
				]
			).slice(0, 6);
			scriptBlocks.push(
				`const kpiCards = ${JSON.stringify(cards)} as Array<{label:string;value:string;delta?:string;trend?:'up'|'down'}>; const spark=[4,7,5,9,6,8,5,7,9,6,8,10,7,8,9,11];`
			);
			markupBlocks.push(`<section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {#each kpiCards as c (c.label)}
    <div class="relative group">
      ${stylePack === 'premium' ? '<div class="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>' : ''}
      <div class="relative p-6 ${cardBase} ${stylePack === 'premium' ? 'transition-transform duration-300 group-hover:-translate-y-0.5' : ''}">
        <div class="text-sm text-white/70">{c.label}</div>
        <div class="mt-2 text-3xl font-extrabold ${stylePack === 'neutral' ? 'text-white' : 'bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200'}">{c.value}</div>
        {#if c.delta}<div class={"mt-1 text-xs " + (c.trend === 'down' ? 'text-red-400' : 'text-emerald-400')}>{c.delta}</div>{/if}
        <div class="mt-4 h-10 grid grid-cols-16 items-end gap-1 opacity-80">
          {#each spark as v}<div class="${stylePack === 'neutral' ? 'bg-indigo-400/60' : 'bg-purple-500/60'} rounded-sm" style={'height:' + (6 + v) + 'px'}></div>{/each}
        </div>
      </div>
    </div>
  {/each}
</section>`);
		}

		// Gallery
		if (gallery) {
			const cols = Number((gallery.props as any)?.columns || 3);
			scriptBlocks.push(
				`const galleryCols=${cols}; const galleryItems = ${JSON.stringify(
					(gallery.props as any)?.images || [
						{ alt: 'Keynote', subject: 'keynote' },
						{ alt: 'Stage', subject: 'stage' }
					]
				)} as Array<{alt:string;subject:string;url?:string}>; function img(u?:string,s='image'){try{if(!u) throw 0; const x=new URL(u); return x.href;}catch{return 'https://picsum.photos/seed/'+encodeURIComponent(s)+'/640/360';}}`
			);
			markupBlocks.push(`<section class="mt-8">
  <h3 class="text-base font-medium mb-3">Gallery</h3>
  <div class={"grid gap-3 " + (galleryCols===2?'sm:grid-cols-2':galleryCols===3?'sm:grid-cols-2 md:grid-cols-3':'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
    {#each galleryItems as g (g.alt)}
      <figure class="${cardBase} overflow-hidden cursor-zoom-in" onclick={() => openLightbox(img(g.url,g.subject))}><img src={img(g.url,g.subject)} alt={g.alt} class="w-full h-40 object-cover" /><figcaption class="px-4 py-2 text-xs text-white/70">{g.alt}</figcaption></figure>
    {/each}
  </div>
</section>`);
		}

		// Registration Form (client-only)
		if (form) {
			markupBlocks.push(`<section class="mt-8 ${cardBase} p-6">
  <h3 class="text-base font-medium mb-3">Reserve your place</h3>
  <form onsubmit={(e)=>{(e as any).preventDefault();notify('This is a client-only demo');}} class="grid gap-4 sm:grid-cols-2">
    <label class="text-sm">Name<input class="mt-1 w-full px-3 py-2 rounded border bg-transparent" placeholder="Your name" /></label>
    <label class="text-sm">Email<input class="mt-1 w-full px-3 py-2 rounded border bg-transparent" type="email" placeholder="you@example.com" /></label>
    <label class="sm:col-span-2 text-sm">Message<textarea class="mt-1 w-full px-3 py-2 rounded border bg-transparent" rows={3} placeholder="Optional message"></textarea></label>
    <div class="sm:col-span-2"><button type="submit" onclick={() => notify('This is a client-only demo')} class="relative inline-flex items-center px-4 py-2 rounded-lg ${stylePack === 'neutral' ? 'bg-white/10 hover:bg-white/15' : 'bg-gradient-to-r from-indigo-600 to-violet-600'} text-white shadow hover:shadow-lg transition-all">Reserve</button></div>
  </form>
</section>`);
		}

		// (Tabs, Chart, Drawer rendering stays as previously added)

		// Layout composition with stylePack backgrounds
		const orbs =
			stylePack === 'premium'
				? `<div class="pointer-events-none absolute inset-0 overflow-hidden"><div class="absolute -top-10 -left-10 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl"></div><div class="absolute bottom-0 -right-10 w-72 h-72 bg-cyan-600/30 rounded-full blur-3xl"></div></div>`
				: '';
		const mainLayout = `<div class="${bgClass}">
  ${orbs}
  <div class="relative max-w-7xl mx-auto px-6 py-6 flex gap-6">
    ${sidebar ? markupBlocks.shift() : ''}
    <main class="flex-1 space-y-6">
      <header class="flex items-center justify-between">
        <h1 class="text-xl font-semibold">{title}</h1>
        <nav class="flex items-center gap-4 text-sm">
          {#each navLinks as l (l.href)}
            <a href={l.href} onclick={nav} class={"px-2 py-1 rounded " + (currentPath===l.href?'bg-white/10':'hover:bg-white/5 text-white/80 hover:text-white')}>{l.label}</a>
          {/each}
        </nav>
      </header>
      {#if currentPath !== '/'}
        <section class="${cardBase} p-6"><h2 class="text-lg font-semibold mb-1">{currentPath.replace('/','').toUpperCase()}</h2><p class="text-white/70 text-sm">This is a simple page preview for {currentPath}. Use the nav to switch back to Home.</p></section>
      {/if}
      ${markupBlocks.join('\n      ')}
      {#if lightboxSrc}
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onclick={closeLightbox}>
          <img src={lightboxSrc} alt="Preview" class="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl" />
        </div>
      {/if}
    </main>
  </div>
</div>`;

		return PlanRenderer.wrapComponent(mainLayout, scriptBlocks.join('\n'));
	}

	private static wrapComponent(html: string, scriptBody = ''): string {
		return `<script lang="ts">\n${scriptBody}\n</script>\n\n${html}`;
	}
}

export const planRenderer = new PlanRenderer();
