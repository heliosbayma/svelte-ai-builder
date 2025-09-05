import type { TemplateGenerator, TemplateIntent } from './types';

export class LoginTemplate implements TemplateGenerator {
	matches(intent: TemplateIntent): boolean {
		return intent.type === 'login' || (intent.hasForm && intent.hasValidation);
	}

	generate(intent: TemplateIntent): string {
		return `<script lang="ts">
	interface Props {
		onSubmit?: (credentials: { email: string; password: string }) => void;
		loading?: boolean;
	}

	let { onSubmit, loading = false }: Props = $props();

	let email = $state("");
	let password = $state("");
	let touched = $state({ email: false, password: false });
	let errors = $state({ email: "", password: "" });

	function validateEmail(value: string): string {
		if (!value) return "Email is required";
		if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) return "Invalid email format";
		return "";
	}

	function validatePassword(value: string): string {
		if (!value) return "Password is required";
		if (value.length < 6) return "Password must be at least 6 characters";
		return "";
	}

	$effect(() => {
		errors.email = touched.email ? validateEmail(email) : "";
		errors.password = touched.password ? validatePassword(password) : "";
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		touched.email = true;
		touched.password = true;

		const emailError = validateEmail(email);
		const passwordError = validatePassword(password);

		if (!emailError && !passwordError) {
			onSubmit?.({ email, password });
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Sign in to your account
			</h2>
		</div>
		<form class="mt-8 space-y-6" onsubmit={handleSubmit}>
			<div class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						bind:value={email}
						onblur={() => touched.email = true}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.email ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="Enter your email"
					/>
					{#if errors.email && touched.email}
						<p class="mt-1 text-sm text-red-600">{errors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						bind:value={password}
						onblur={() => touched.password = true}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border {errors.password ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
						placeholder="Enter your password"
					/>
					{#if errors.password && touched.password}
						<p class="mt-1 text-sm text-red-600">{errors.password}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={loading || !!errors.email || !!errors.password}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Signing in...' : 'Sign in'}
				</button>
			</div>
		</form>
	</div>
</div>`;
	}
}
