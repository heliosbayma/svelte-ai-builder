<script lang="ts">
	function enterApp() {
		window.location.href = '/app';
	}
</script>

<svelte:head>
	<title>AI Svelte Builder - Create Beautiful UIs with AI</title>
	<meta
		name="description"
		content="Transform your ideas into polished Svelte applications using the power of AI. No complex setup, just pure creativity."
	/>
</svelte:head>

<main class="min-h-screen bg-background text-foreground flex items-center justify-center">
	<div class="text-center max-w-2xl mx-auto px-6">
		<h1 class="text-2xl font-bold mb-6">AI Svelte Builder</h1>

		<h2 class="text-4xl font-bold mb-6">Transform Ideas into Beautiful UIs</h2>

		<p class="text-lg text-muted-foreground mb-8 leading-relaxed">
			Harness the power of AI to create stunning Svelte applications. Just describe what you want,
			and watch your vision come to life.
		</p>

		<button
			onclick={enterApp}
			class="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-md transition-colors"
		>
			Start Building
		</button>
	</div>
</main>
