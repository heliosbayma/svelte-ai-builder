<script lang="ts">
	import { Button } from '$lib/shared/ui/button';
	import Modal from '$lib/shared/components/Modal.svelte';
	import ApiKeyInput from './ApiKeyInput.svelte';
	import StorageSelector from './StorageSelector.svelte';
	import {
		apiKeyStore,
		validateApiKey,
		getKeyErrorMessage,
		type ApiKeys
	} from '$lib/core/stores/apiKeys';
	import { LLM_PROVIDERS } from '$lib/shared/constants/providers';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let keys = $state<ApiKeys>({ openai: null, anthropic: null, gemini: null });
	let errors = $state<Record<keyof ApiKeys, string>>({ openai: '', anthropic: '', gemini: '' });
	let storageMode = $state<'local' | 'session'>('local');

	// Load keys when modal opens
	$effect(() => {
		if (isOpen) {
			keys = { ...$apiKeyStore };
			errors = { openai: '', anthropic: '', gemini: '' };
			try {
				storageMode = apiKeyStore.getStorageMode();
			} catch (error) {
				// Fallback to default if storage mode detection fails
				console.warn('Failed to detect storage mode, using default:', error);
				storageMode = 'local';
			}
		}
	});

	// Real-time validation
	function handleInput(provider: keyof ApiKeys, value: string) {
		keys[provider] = value || null;

		// Clear error if user is typing
		if (errors[provider]) {
			errors[provider] = '';
		}

		// Validate on blur or when enough characters
		if (value && value.length > 10) {
			if (!validateApiKey(provider, value)) {
				errors[provider] = getKeyErrorMessage(provider);
			}
		}
	}

	function createInputHandler(provider: keyof ApiKeys) {
		return (value: string) => {
			handleInput(provider, value);
		};
	}

	async function saveKeys() {
		// Validate all non-empty keys
		let hasError = false;
		for (const provider of LLM_PROVIDERS) {
			const key = keys[provider.key];
			if (key && !validateApiKey(provider.key, key)) {
				errors[provider.key] = 'Invalid API key format';
				hasError = true;
			}
		}

		if (hasError) return;

		// At least one key
		const hasAnyKey = keys.openai || keys.anthropic || keys.gemini;
		if (!hasAnyKey) {
			errors.openai = 'Please, add at least one API key.';
			return;
		}

		await apiKeyStore.set(keys);
		onClose();
	}

	function clearAllKeys() {
		if (!confirm('Remove all API keys? This cannot be undone.')) return;

		keys = { openai: null, anthropic: null, gemini: null };
		errors = { openai: '', anthropic: '', gemini: '' };
		apiKeyStore.clear();
	}

	async function handleStorageChange(mode: 'local' | 'session') {
		storageMode = mode;
		await apiKeyStore.setStorageMode(mode);
	}
</script>

<Modal
	{isOpen}
	title="API Key Settings"
	description="Your keys are encrypted and stored locally, never sent to any server."
	showShortcutsHint={true}
	{onClose}
	onSave={saveKeys}
>
	<StorageSelector mode={storageMode} onModeChange={handleStorageChange} />

	{#each LLM_PROVIDERS as provider (provider.key)}
		<ApiKeyInput
			{provider}
			value={keys[provider.key] || ''}
			error={errors[provider.key]}
			onInput={createInputHandler(provider.key)}
		/>
	{/each}

	<footer class="flex items-center justify-between pt-4 border-t">
		<Button
			variant="ghost"
			size="sm"
			onclick={clearAllKeys}
			disabled={!keys.openai && !keys.anthropic && !keys.gemini}
		>
			Clear All
		</Button>

		<div class="flex gap-2">
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button onclick={saveKeys}>Save Keys</Button>
		</div>
	</footer>
</Modal>
