<script lang="ts">
	import {
		telemetryStore,
		telemetrySummary,
		telemetryByProvider
	} from '$lib/core/stores/telemetry';
	let open = $state(true);
	const telemetry = telemetryStore;
	const stats = $derived($telemetrySummary);
	const providerSummary = $derived($telemetryByProvider);
</script>

<div class="fixed right-4 bottom-4 z-50">
	<div class="bg-card w-[360px] overflow-hidden rounded-md border shadow-md">
		<header class="flex items-center justify-between border-b px-3 py-2">
			<h3 class="text-sm font-semibold">Metrics</h3>
			<button class="cursor-pointer rounded border px-2 py-1 text-xs" onclick={() => (open = !open)}
				>{open ? 'Hide' : 'Show'}</button
			>
		</header>
		{#if open}
			<section class="p-3 text-xs">
				<dl class="text-muted-foreground mb-2 flex items-center gap-4">
					<dt class="sr-only">Runs</dt>
					<dd>runs: <span class="text-foreground font-medium">{stats.count}</span></dd>
					<dt class="sr-only">Average milliseconds</dt>
					<dd>avg ms: <span class="text-foreground font-medium">{stats.avgMs}</span></dd>
					<dt class="sr-only">Tokens</dt>
					<dd>tokens: <span class="text-foreground font-medium">{stats.totalTokens}</span></dd>
				</dl>
				<div class="mb-2">
					<table class="w-full">
						<thead class="text-muted-foreground text-[10px]">
							<tr>
								<th class="pr-2 text-left">provider</th>
								<th class="pr-2 text-right">runs</th>
								<th class="pr-2 text-right">avg ms</th>
								<th class="pr-2 text-right">errors</th>
								<th class="text-right">tokens</th>
							</tr>
						</thead>
						<tbody>
							{#each Object.entries(providerSummary) as [provider, g] (provider)}
								<tr class="border-t">
									<td class="py-1 pr-2">{provider}</td>
									<td class="py-1 pr-2 text-right">{g.count}</td>
									<td class="py-1 pr-2 text-right">{g.avgMs}</td>
									<td class="py-1 pr-2 text-right">{Math.round(g.errorRate * 100)}%</td>
									<td class="py-1 text-right">{g.totalTokens}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="max-h-56 overflow-auto">
					<table class="w-full">
						<thead class="text-muted-foreground text-[10px]">
							<tr>
								<th class="pr-2 text-left">when</th>
								<th class="pr-2 text-left">purpose</th>
								<th class="pr-2 text-left">model</th>
								<th class="text-right">ms</th>
							</tr>
						</thead>
						<tbody>
							{#each [...$telemetry.events].slice(-10).reverse() as e (e.id)}
								<tr class="border-t">
									<td class="py-1 pr-2">{new Date(e.timestamp).toLocaleTimeString()}</td>
									<td class="py-1 pr-2">{e.purpose}</td>
									<td class="py-1 pr-2">{e.provider}:{e.model}</td>
									<td class="py-1 text-right">{e.ms}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	</div>
</div>
