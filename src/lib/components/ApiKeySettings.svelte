<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		apiKeyStore,
		validateApiKey,
		getKeyErrorMessage,
		type ApiKeys
	} from '$lib/stores/apiKeys';
	import { LLM_PROVIDERS } from '$lib/constants/providers';
	import { handleModalKeyboard } from '$lib/utils/keyboard';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let keys = $state<ApiKeys>({ openai: null, anthropic: null, gemini: null });
	let errors = $state<Record<keyof ApiKeys, string>>({ openai: '', anthropic: '', gemini: '' });
	let modalRef = $state<HTMLDivElement>();
	let storageMode = $state<'local' | 'session'>('local');

	// Load keys when modal opens
	$effect(() => {
		if (isOpen && modalRef) {
			keys = { ...$apiKeyStore };
			errors = { openai: '', anthropic: '', gemini: '' };
			try {
				storageMode = apiKeyStore.getStorageMode();
			} catch {}
			// Focus the modal for keyboard events
			modalRef.focus();
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

	function handleKeyDown(e: KeyboardEvent) {
		handleModalKeyboard(e, {
			onEscape: onClose,
			onMetaEnter: saveKeys
		});
	}

	function createInputHandler(provider: keyof ApiKeys) {
		return (e: Event) => {
			if (e.currentTarget instanceof HTMLInputElement) {
				handleInput(provider, e.currentTarget.value);
			}
		};
	}

	function saveKeys() {
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
		if (!keys.openai && !keys.anthropic && !keys.gemini) {
			errors.openai = 'Add at least one API key';
			return;
		}

		apiKeyStore.set(keys);
		onClose();
	}

	function clearAllKeys() {
		if (!confirm('Remove all API keys? This cannot be undone.')) return;

		keys = { openai: null, anthropic: null, gemini: null };
		errors = { openai: '', anthropic: '', gemini: '' };
		apiKeyStore.clear();
	}

	function handleStorageChange(mode: 'local' | 'session') {
		storageMode = mode;
		apiKeyStore.setStorageMode(mode);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		bind:this={modalRef}
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		onclick={handleBackdropClick}
		onkeydown={handleKeyDown}
		tabindex="-1"
	>
		<Card class="w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
			<CardHeader>
				<CardTitle id="modal-title">API Key Settings</CardTitle>
				<CardDescription>
					Your keys are stored locally and never sent to any server.
					<span class="text-xs block mt-1 opacity-70">Press ⌘+Enter to save, Esc to close</span>
				</CardDescription>
			</CardHeader>

			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<Label class="text-sm">Storage mode</Label>
					<div class="flex items-center gap-2">
						<label class="text-xs flex items-center gap-1">
							<input
								type="radio"
								name="storage"
								value="local"
								checked={storageMode === 'local'}
								onchange={() => handleStorageChange('local')}
							/>
							Local (persists across tabs)
						</label>
						<label class="text-xs flex items-center gap-1">
							<input
								type="radio"
								name="storage"
								value="session"
								checked={storageMode === 'session'}
								onchange={() => handleStorageChange('session')}
							/>
							Session-only
						</label>
					</div>
				</div>

				{#each LLM_PROVIDERS as provider (provider.key)}
					<div class="space-y-2">
						<Label for={provider.key + '-key'} class="flex items-center gap-2">
							{provider.label}
							<a
								href={`https://${provider.hint}`}
								target="_blank"
								rel="noopener"
								class="text-xs text-muted-foreground hover:underline ml-auto"
							>
								Get key →
							</a>
						</Label>
						<Input
							id={provider.key + '-key'}
							type="password"
							placeholder={provider.placeholder}
							value={keys[provider.key] || ''}
							oninput={createInputHandler(provider.key)}
							autocomplete="off"
							autocapitalize="off"
							spellcheck={false}
							inputmode="text"
							aria-invalid={!!errors[provider.key]}
							aria-describedby={provider.key + '-key-error'}
							class={errors[provider.key] ? 'border-red-500 focus:ring-red-500' : ''}
						/>
						{#if errors[provider.key]}
							<p id={provider.key + '-key-error'} class="text-xs text-red-500 animate-in fade-in">
								{errors[provider.key]}
							</p>
						{/if}
					</div>
				{/each}

				<div class="flex items-center justify-between pt-4 border-t">
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
				</div>
			</CardContent>
		</Card>
	</div>
{/if}
