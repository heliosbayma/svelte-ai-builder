import type { CompileResult, CompilerOptions } from './types';

export class SvelteCompiler {
	private svelteCompiler: typeof import('svelte/compiler') | null = null;
	private initialized = false;

	async init(): Promise<void> {
		if (this.initialized) return;

		try {
			// Dynamic import to avoid SSR issues
			const svelte = await import('svelte/compiler');
			this.svelteCompiler = svelte;
			this.initialized = true;
		} catch (error) {
			throw new Error(
				`Failed to initialize Svelte compiler: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	async compile(source: string, options: CompilerOptions = {}): Promise<CompileResult> {
		await this.init();

		if (!this.svelteCompiler) {
			throw new Error('Svelte compiler not initialized');
		}

		try {
			const cssMode = options.css === 'none' ? undefined : (options.css ?? 'injected');
			const generateMode =
				options.generate === 'dom'
					? 'client'
					: options.generate === 'ssr'
						? 'server'
						: (options.generate ?? 'client');

			const result = this.svelteCompiler.compile(source, {
				filename: options.filename || 'Component.svelte',
				css: cssMode,
				generate: generateMode as 'client' | 'server' | false,
				immutable: options.immutable || false
			});

			return {
				js: result.js.code,
				css: result.css?.code,
				warnings: result.warnings || [],
				error: undefined
			};
		} catch (error) {
			return {
				js: '',
				css: undefined,
				warnings: [],
				error: error as unknown as Error
			};
		}
	}

	async validate(source: string): Promise<{ valid: boolean; errors: unknown[] }> {
		await this.init();

		try {
			const result = await this.compile(source, { generate: false });
			return {
				valid: !result.error,
				errors: result.error ? [result.error] : []
			};
		} catch (error) {
			return {
				valid: false,
				errors: [error]
			};
		}
	}

	createExecutableComponent(js: string, css?: string): string {
		const componentId = `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Svelte Component Preview</title>
	<script src="https://unpkg.com/svelte@5/index.js"></script>
	${css ? `<style>${css}</style>` : ''}
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: white;
		}
		#app { min-height: 100vh; }
	</style>
</head>
<body>
	<div id="app"></div>
	<script type="module">
		try {
			${js}

			// Get the default export (the Svelte component class)
			const componentModule = window.${componentId} || window.default;
			if (!componentModule) {
				throw new Error('Component not found');
			}

			// Create and mount the component
			const app = new componentModule({
				target: document.getElementById('app')
			});
		} catch (error) {
			console.error('Component error:', error);
			document.getElementById('app').innerHTML = \`
				<div style="padding: 20px; border: 1px solid #f56565; background: #fed7d7; color: #c53030; border-radius: 4px;">
					<h3 style="margin: 0 0 10px 0;">Component Error</h3>
					<pre style="margin: 0; white-space: pre-wrap; font-size: 14px;">\${error.message}</pre>
				</div>
			\`;
		}
	</script>
</body>
</html>`;
	}
}

// Export singleton instance
export const svelteCompiler = new SvelteCompiler();
