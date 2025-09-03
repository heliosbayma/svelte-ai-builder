<script lang="ts">
	import { toastStore } from '$lib/core/stores/toast';
	import { fly } from 'svelte/transition';
	import { Check, X, AlertTriangle, Info, AlertCircle } from '@lucide/svelte';

	const { toasts } = $derived($toastStore);

	const iconMap = {
		success: Check,
		error: AlertCircle,
		warning: AlertTriangle,
		info: Info
	};

	const colorMap = {
		success: {
			container: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
			icon: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50',
			text: 'text-green-900 dark:text-green-100',
			title: 'text-green-800 dark:text-green-200'
		},
		error: {
			container: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
			icon: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
			text: 'text-red-900 dark:text-red-100',
			title: 'text-red-800 dark:text-red-200'
		},
		warning: {
			container: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
			icon: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50',
			text: 'text-yellow-900 dark:text-yellow-100',
			title: 'text-yellow-800 dark:text-yellow-200'
		},
		info: {
			container: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
			icon: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
			text: 'text-blue-900 dark:text-blue-100',
			title: 'text-blue-800 dark:text-blue-200'
		}
	};

	function handleDismiss(toastId: string) {
		toastStore.removeToast(toastId);
	}

	function handleAction(toast: any) {
		toast.action?.handler();
		handleDismiss(toast.id);
	}
</script>

<!-- Toast Container -->
<section
	class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
	aria-live="polite"
	aria-label="Notifications"
>
	{#each toasts as toast (toast.id)}
		{@const IconComponent = iconMap[toast.type]}
		<article
			class="pointer-events-auto rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-200 {colorMap[
				toast.type
			].container}"
			role="alert"
			transition:fly={{ x: 320, duration: 300 }}
		>
			<div class="flex items-start gap-3">
				<!-- Icon -->
				<div
					class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center {colorMap[
						toast.type
					].icon}"
				>
					<IconComponent class="w-4 h-4" />
				</div>

				<!-- Content -->
				<div class="flex-1 min-w-0">
					{#if toast.title}
						<h4 class="text-sm font-medium mb-1 {colorMap[toast.type].title}">
							{toast.title}
						</h4>
					{/if}
					<p class="text-sm leading-relaxed {colorMap[toast.type].text}">
						{toast.message}
					</p>

					<!-- Action Button -->
					{#if toast.action}
						<button
							class="mt-3 text-xs font-medium underline hover:no-underline transition-all {colorMap[
								toast.type
							].title}"
							onclick={() => handleAction(toast)}
						>
							{toast.action.label}
						</button>
					{/if}
				</div>

				<!-- Dismiss Button -->
				{#if toast.dismissible}
					<button
						class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors {colorMap[
							toast.type
						].text}"
						onclick={() => handleDismiss(toast.id)}
						aria-label="Dismiss notification"
					>
						<X class="w-4 h-4" />
					</button>
				{/if}
			</div>

			<!-- Progress Bar (for timed toasts) -->
			{#if toast.duration && toast.duration > 0}
				<div
					class="absolute bottom-0 left-0 h-0.5 bg-current opacity-20 rounded-b-lg animate-shrink-width"
					style="animation-duration: {toast.duration}ms"
				></div>
			{/if}
		</article>
	{/each}
</section>

<style>
	@keyframes shrink-width {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	.animate-shrink-width {
		animation: shrink-width linear forwards;
	}
</style>