import type { CompileResult, CompilerOptions } from './types';
import { getErrorMessage } from '$lib/shared/utils/storage';
import { warning as toastWarning, error as toastError } from '$lib/core/stores/toast';
import { TemplateRegistry } from './templates';

export class SvelteCompiler {
	private svelteCompiler: typeof import('svelte/compiler') | null = null;
	private initialized = false;
	private templateRegistry = new TemplateRegistry();

	async init(): Promise<void> {
		if (this.initialized) return;

		try {
			// Dynamic import to avoid SSR issues
			const svelte = await import('svelte/compiler');
			this.svelteCompiler = svelte;
			this.initialized = true;
		} catch (error) {
			throw new Error(`Failed to initialize Svelte compiler: ${getErrorMessage(error)}`);
		}
	}

	private preprocessCode(source: string): string {
		// Remove markdown code blocks if LLM included them
		source = source.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');

		// Clean up common LLM formatting issues
		source = source.trim();

		// Check if source looks fundamentally broken - use smart template instead of trying to fix
		const isFundamentallyBroken =
			source.length < 20 ||
			!source.includes('<') ||
			source.startsWith('interface?:') ||
			/^\s*\w+\?:\s*\(/.test(source) ||
			source.includes('onSubmit?: (') ||
			source.includes('interface FormData') ||
			(source.includes('{') && !source.includes('interface')) ||
			source.split('\n').some((line) => /^\w+\?:.*=>/.test(line.trim())) ||
			// New patterns for malformed LLM output
			source.startsWith('onSubmit?:') ||
			(!source.includes('<script') && source.includes('interface')) ||
			/^\s*}\s*$/.test(source) || // Starts with closing brace
			source.startsWith(' Props {') || // Missing interface keyword
			source.startsWith('Props {') ||
			source.includes('password: "", "",') || // Syntax errors like double commas
			source.includes('email: "",\n  password: "",') || // Missing properties in objects
			// Additional broken patterns from recent output
			source.includes('{d: false }') || // Malformed state object
			source.includes('if (value be at least') || // Broken conditional
			(source.includes('{errors') && !source.includes('{errors.')) || // Broken template expression
			(source.includes('touched = $state({') && !source.includes('email:')) || // Incomplete touched state
			// Latest patterns - completely broken output
			source.startsWith('svelte\n<script') || // Wrong prefix
			source.startsWith('svelte') || // Just "svelte" at start
			source.includes('<script\ninterface') || // Missing lang="ts">
			source.includes("'Email is required';") || // Standalone string statements
			source.includes('on:blur={validated-') || // Broken attribute syntax
			source.includes('{errors.password}</p>'); // Incomplete template expression

		if (isFundamentallyBroken) {
			return this.templateRegistry.generateTemplate(source);
		}

		// Fix malformed TypeScript interface syntax
		source = source.replace(/interface\?:/g, 'onSubmit?:');
		source = source.replace(/interface\s*\?\s*:/g, 'onSubmit?:');

		// Fix standalone function type declarations (onSubmit?: (data: FormData) => void;)
		source = source.replace(
			/^\s*(\w+)\?:\s*\([^)]*\)\s*=>\s*\w+;/gm,
			'// removed standalone function type: $1'
		);

		// Fix incomplete interface declarations
		source = source.replace(/^interface\s*$/gm, '// interface removed');
		source = source.replace(/interface\s*\{/g, 'interface Props {');
		source = source.replace(/^\s*Props\s*\{/gm, 'interface Props {'); // Fix "Props {" -> "interface Props {"

		// Do not remove closing braces; earlier heuristics caused valid code to break

		// Ensure the code starts with <script> if it has script content
		if (
			source.includes('let ') ||
			source.includes('function ') ||
			source.includes('const ') ||
			source.includes('var ') ||
			source.includes('interface ')
		) {
			if (!source.includes('<script')) {
				// If there's logic but no script tag, wrap it
				const htmlStart = source.indexOf('<');
				if (htmlStart === -1) {
					// Pure JS, wrap it all
					source = `<script lang="ts">\n${source}\n</script>`;
				} else {
					// Mixed content, extract JS and wrap
					const jsContent = source.slice(0, htmlStart).trim();
					const htmlContent = source.slice(htmlStart);
					source = `<script lang="ts">\n${jsContent}\n</script>\n\n${htmlContent}`;
				}
			}
		}

		// Fix common Svelte 5 syntax issues
		source = source.replace(/on:click=/g, 'onclick=');
		source = source.replace(/on:submit=/g, 'onsubmit=');
		source = source.replace(/on:input=/g, 'oninput=');
		source = source.replace(/on:change=/g, 'onchange=');

		// Clean up script tag issues
		source = source.replace(/^<script[^>]*>\s*\n\s*\}/gm, '<script lang="ts">');

		// Preflight: if <script> is clearly unclosed, shortcut to smart template
		const scriptOpenCount = (source.match(/<script\b/gi) || []).length;
		const scriptCloseCount = (source.match(/<\/script>/gi) || []).length;
		if (scriptOpenCount !== scriptCloseCount) {
			return this.templateRegistry.generateTemplate(source);
		}

		return source;
	}


	async compile(source: string, options: CompilerOptions = {}): Promise<CompileResult> {
		await this.init();

		if (!this.svelteCompiler) {
			throw new Error('Svelte compiler not initialized');
		}

		try {
			// Preprocess the code to fix common issues
			const cleanSource = this.preprocessCode(source);
			if (import.meta.env?.DEV) {
			}
			const cssMode = options.css === 'none' ? undefined : (options.css ?? 'injected');
			const generateMode =
				options.generate === 'dom'
					? 'client'
					: options.generate === 'ssr'
						? 'server'
						: (options.generate ?? 'client');

			const result = this.svelteCompiler.compile(cleanSource, {
				filename: options.filename || 'Component.svelte',
				css: cssMode,
				generate: generateMode as 'client' | 'server' | false,
				immutable: options.immutable || false
			});

			// Debug: Log the compiled JS structure
			if (import.meta.env?.DEV) {
			}

			return {
				js: result.js.code,
				css: result.css?.code,
				warnings: result.warnings || [],
				error: undefined
			};
		} catch (error) {
			// If compilation fails, try to create a smart template based on user intent
			console.error('Compilation failed, creating smart fallback:', error);

			// Show user-friendly warning about fallback
			toastWarning('Generated code had syntax errors. Using simplified version instead.', {
				title: 'Code Simplified',
				action: {
					label: 'View Error',
					handler: () => console.log('Compilation error:', error)
				}
			});

			try {
				const smartTemplate = this.templateRegistry.generateTemplate(source);
				if (import.meta.env?.DEV) {
				}

				const fallbackResult = this.svelteCompiler!.compile(smartTemplate, {
					filename: options.filename || 'Component.svelte',
					css: 'injected',
					generate: 'client',
					immutable: false
				});

				return {
					js: fallbackResult.js.code,
					css: fallbackResult.css?.code,
					warnings: fallbackResult.warnings || [],
					error: error as unknown as Error // Still return the original error for debugging
				};
			} catch (fallbackError) {
				console.error('Even fallback failed:', fallbackError);
				
				// Critical error - even fallback template failed
				toastError('Unable to compile any version of the component. Please try a different request.', {
					title: 'Compilation Failed',
					duration: 0, // Don't auto-dismiss
					action: {
						label: 'View Details',
						handler: () => {
							console.log('Original error:', error);
							console.log('Fallback error:', fallbackError);
						}
					}
				});
				
				return {
					js: '',
					css: undefined,
					warnings: [],
					error: error as unknown as Error
				};
			}
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
		// Create a standalone HTML that renders the compiled component
		// Since Svelte 5 doesn't have a CDN bundle, we'll use a simpler approach
		// The compiled JS already contains the Svelte runtime code needed
		return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Svelte Component Preview</title>
	${css ? `<style>${css}</style>` : ''}
	<script src="https://cdn.tailwindcss.com"></script>
	<style>
		:root {
			--background: #f9fafb;
			--foreground: #111827;
			--card: #ffffff;
			--card-foreground: #111827;
			--popover: #ffffff;
			--popover-foreground: #111827;
			--primary: #1d4ed8;
			--primary-foreground: #ffffff;
			--secondary: #f3f4f6;
			--secondary-foreground: #1f2937;
			--muted: #f3f4f6;
			--muted-foreground: #6b7280;
			--accent: #f3f4f6;
			--accent-foreground: #1f2937;
			--destructive: #ef4444;
			--border: #e5e7eb;
			--input: #e5e7eb;
			--ring: #94a3b8;
		}
		body {
			margin: 0;
			padding: 20px;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: var(--background);
			min-height: 100vh;
		}
		#app {
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	</style>
</head>
<body>
	<div id="app"></div>
	<script type="module">
		try {
			// Convert the compiled ES module code to work in browser
			const moduleCode = ${JSON.stringify(
				js
					.replace(/import\s+.*?from\s+['"`]svelte\/internal\/disclose-version['"`];?/g, '')
					.replace(/import\s+\*\s+as\s+\$\s+from\s+['"`]svelte\/internal\/client['"`];?/g, '')
					.replace(/\$\./g, 'svelte_internal.')
			)};

			// Mock Svelte internals for the component to work
			window.svelte_internal = {
				get: (state) => state.value,
				set: (state, value) => { state.value = value; },
				from_html: (html) => {
					const div = document.createElement('div');
					div.innerHTML = html;
					return div.firstElementChild || div;
				},
				// Add other necessary Svelte internal functions as needed
				state: (initial) => ({ value: initial }),
				derived: (fn) => ({ value: fn() }),
				effect: (fn) => fn()
			};

			// Create a simple component constructor
			const Component = function(options) {
				const target = options.target;
				if (!target) return;

				// For now, just render a fallback message since ES module execution is complex
				target.innerHTML = \`
					<div style="max-width: 500px; padding: 24px; margin: 20px auto; border: 2px solid var(--primary); background: var(--muted); color: var(--primary-foreground); border-radius: 8px; font-family: system-ui;">
						<h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Component Preview</h3>
						<p style="margin: 0 0 12px 0; font-size: 14px;">Component compiled successfully. Advanced rendering coming soon.</p>
						<details style="margin-top: 16px;">
							<summary style="cursor: pointer; font-weight: 500; margin-bottom: 8px;">Raw Component Code</summary>
							<pre style="margin: 0; padding: 12px; background: var(--accent); color: var(--accent-foreground); border-radius: 4px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;">\${moduleCode.substring(0, 500)}...</pre>
						</details>
					</div>
				\`;
			};

			// Mount the component
			new Component({
				target: document.getElementById('app'),
				props: {}
			});

		} catch (error) {
			console.error('Component mounting error:', error);
			document.getElementById('app').innerHTML = \`
				<div style="max-width: 500px; padding: 24px; margin: 20px auto; border: 2px solid var(--destructive); background: var(--muted); color: var(--destructive); border-radius: 8px; font-family: system-ui;">
					<h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Component Runtime Error</h3>
					<p style="margin: 0 0 12px 0; font-size: 14px;">The compiled component could not be mounted.</p>
					<details style="margin-top: 16px;">
						<summary style="cursor: pointer; font-weight: 500; margin-bottom: 8px;">Error Details</summary>
						<pre style="margin: 0; padding: 12px; background: var(--muted); border-radius: 4px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;">\${(error as any).message}\\n\\nStack: \${(error as any).stack}</pre>
					</details>
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
