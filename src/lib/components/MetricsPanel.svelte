<script lang="ts">
	import { telemetryStore, summarize } from '$lib/stores/telemetry';
	let open = $state(true);
	const telemetry = telemetryStore;
	let stats = $state({ count: 0, avgMs: 0, totalTokens: 0 });
	$effect(() => {
		stats = summarize($telemetry.events);
	});
</script>

<div class="fixed bottom-4 right-4 z-50">
	<div class="bg-card border rounded-md shadow-md w-[360px] overflow-hidden">
		<header class="px-3 py-2 flex items-center justify-between border-b">
			<h3 class="text-sm font-semibold">Metrics</h3>
			<button class="text-xs px-2 py-1 border rounded" onclick={() => (open = !open)}
				>{open ? 'Hide' : 'Show'}</button
			>
		</header>
		{#if open}
			<div class="p-3 text-xs">
				<div class="flex items-center gap-4 mb-2 text-muted-foreground">
					<div>runs: <span class="text-foreground font-medium">{stats.count}</span></div>
					<div>avg ms: <span class="text-foreground font-medium">{stats.avgMs}</span></div>
					<div>tokens: <span class="text-foreground font-medium">{stats.totalTokens}</span></div>
				</div>
				<div class="max-h-56 overflow-auto">
					<table class="w-full">
						<thead class="text-[10px] text-muted-foreground">
							<tr>
								<th class="text-left pr-2">when</th>
								<th class="text-left pr-2">purpose</th>
								<th class="text-left pr-2">model</th>
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
			</div>
		{/if}
	</div>
</div>
