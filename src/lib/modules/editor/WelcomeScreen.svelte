<script lang="ts">
	import Logo from '$lib/shared/components/Logo.svelte';
	import { t } from '$lib/shared/i18n';
	import { Code2 } from '@lucide/svelte';

	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<section class="py-6 text-center {className}">
	<div class="flex items-center justify-center gap-2 w-full">
		<Code2 class="text-muted-foreground size-7 sm:size-8 shrink-0" />
		<h2
			class="text-muted-foreground text-xl sm:text-2xl font-medium tracking-tight inline-block whitespace-nowrap"
		>
			{t('loading.welcome')}
		</h2>
		<Logo
			class="inline-block"
			buttonClass="text-muted-foreground text-xl sm:text-2xl -ml-[.1875rem] whitespace-nowrap"
			label={t('header.title')}
			title={t('header.titleTooltip')}
			ariaLabel={t('header.title')}
		/>
	</div>
	<p class="text-muted-foreground/70 mx-auto max-w-md sm:text-base">
		{t('loading.welcomeLong')}
	</p>
</section>
