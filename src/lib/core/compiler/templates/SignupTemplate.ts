import type { TemplateGenerator, TemplateIntent } from './types';

export class SignupTemplate implements TemplateGenerator {
	matches(intent: TemplateIntent): boolean {
		return intent.type === 'signup';
	}

	generate(intent: TemplateIntent): string {
		return `<script lang="ts">
	interface Props {
		onSubmit?: (formData: FormData) => void;
	}

	interface FormData {
		email: string;
		password: string;
		confirmPassword: string;
		name: string;
	}

	let { onSubmit }: Props = $props();

	let formData = $state({
		email: "",
		password: "",
		confirmPassword: "",
		name: ""
	});

	let errors = $state({
		email: "",
		password: "",
		confirmPassword: "",
		name: ""
	});

	function validateForm(): boolean {
		let isValid = true;
		errors.email = "";
		errors.password = "";
		errors.confirmPassword = "";
		errors.name = "";

		if (!formData.email) {
			errors.email = "Email is required";
			isValid = false;
		} else if (!/\\S+@\\S+\\.\\S+/.test(formData.email)) {
			errors.email = "Please enter a valid email";
			isValid = false;
		}

		if (!formData.password) {
			errors.password = "Password is required";
			isValid = false;
		} else if (formData.password.length < 8) {
			errors.password = "Password must be at least 8 characters";
			isValid = false;
		}

		if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = "Passwords do not match";
			isValid = false;
		}

		if (!formData.name) {
			errors.name = "Name is required";
			isValid = false;
		}

		return isValid;
	}

	function handleSubmit() {
		if (validateForm()) {
			onSubmit?.(formData);
		}
	}
</script>

<div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
	<h2 class="text-2xl font-bold mb-6 text-gray-800 text-center">Sign Up</h2>

	<div class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
			<input
				id="name"
				type="text"
				bind:value={formData.name}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="John Doe"
			/>
			{#if errors.name}
				<p class="mt-1 text-sm text-red-600">{errors.name}</p>
			{/if}
		</div>

		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
			<input
				id="email"
				type="email"
				bind:value={formData.email}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="you@example.com"
			/>
			{#if errors.email}
				<p class="mt-1 text-sm text-red-600">{errors.email}</p>
			{/if}
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
			<input
				id="password"
				type="password"
				bind:value={formData.password}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="••••••••"
			/>
			{#if errors.password}
				<p class="mt-1 text-sm text-red-600">{errors.password}</p>
			{/if}
		</div>

		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
			<input
				id="confirmPassword"
				type="password"
				bind:value={formData.confirmPassword}
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				placeholder="••••••••"
			/>
			{#if errors.confirmPassword}
				<p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
			{/if}
		</div>

		<button
			onclick={handleSubmit}
			class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
		>
			Create Account
		</button>
	</div>
</div>`;
	}
}
