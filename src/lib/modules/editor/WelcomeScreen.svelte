<script lang="ts">
	import { t } from '$lib/shared/i18n';

	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<section class="p-6 text-center {className}">
	<div class="space-y-3">
		<h2 class="text-2xl sm:text-3xl font-semibold tracking-tight">
			{t('loading.welcome')}
		</h2>
		<p class="text-sm text-muted-foreground max-w-md mx-auto">
			{t('loading.welcomeLong')}
		</p>
	</div>
</section>
