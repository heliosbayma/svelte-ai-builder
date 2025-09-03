import { get } from 'svelte/store';
import { chatStore, chatComponentVersions } from '$lib/core/stores/chat';
import { apiKeyStore } from '$lib/core/stores/apiKeys';
import { llmClient } from '$lib/core/ai/services';
import type { LLMProviderType } from '$lib/core/ai/services/llm/types';
import { safeJsonParse, getErrorMessage } from '$lib/shared/utils/storage';
import { selectBestProvider } from '$lib/core/ai/utils/providerSelection';

export interface ChatHandlerOptions {
	onCodeGenerated?: (code: string, prompt: string, provider: LLMProviderType) => void;
	onStartGenerating?: () => void;
}

export function createChatHandlers(options: ChatHandlerOptions) {
	const { onCodeGenerated, onStartGenerating } = options;

	async function handleSubmit(prompt: string, modelInput: string, lastProvider: string) {
		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt || get(chatStore).isGenerating) return;

		const apiKeys = get(apiKeyStore);
		const provider = selectBestProvider(apiKeys, lastProvider);

		if (!provider) {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Please configure your API keys in Settings before starting a conversation.',
				error: 'No API keys configured'
			});
			return;
		}

		chatStore.addMessage({ role: 'user', content: trimmedPrompt });

		// Start assistant message
		const assistantMessageId = chatStore.addMessage({
			role: 'assistant',
			content: '',
			streaming: true,
			provider
		});

		const requestId = crypto.randomUUID();
		chatStore.startGeneration(provider, requestId);

		// Notify parent to show preview loading immediately
		onStartGenerating?.();

		try {
			const versions = get(chatComponentVersions);
			const previousCode = versions[versions.length - 1]?.code;

			const controller = new AbortController();
			chatStore.registerRequest(requestId, controller);
			const response = await llmClient.generateComponent(
				trimmedPrompt,
				{
					provider,
					apiKey: apiKeys[provider]!,
					model: modelInput || undefined,
					signal: controller.signal,
					purpose: 'generate'
				},
				previousCode
			);

			// Guard late results for canceled/replaced requests
			if (get(chatStore).currentRequestId !== requestId) return;

			chatStore.updateMessage(assistantMessageId, {
				content: '',
				generatedCode: response.content,
				codeLength: response.content?.length || 0,
				streaming: false
			});
			onCodeGenerated?.(response.content, trimmedPrompt, provider);
			return provider;
		} catch (error) {
			const errorMessage = getErrorMessage(error);
			chatStore.updateMessage(assistantMessageId, {
				content: '',
				streaming: false,
				error: errorMessage
			});
		} finally {
			chatStore.stopGeneration();
		}
	}

	async function handlePlan(prompt: string, modelInput: string, lastProvider: string) {
		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt || get(chatStore).isGenerating) return;

		const apiKeys = get(apiKeyStore);
		const provider = selectBestProvider(apiKeys, lastProvider) || 'openai';

		chatStore.addMessage({ role: 'user', content: `PLAN: ${trimmedPrompt}` });

		try {
			const res = await llmClient.planPage(trimmedPrompt, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				purpose: 'plan'
			});
			let raw = res.content?.trim() || '';
			raw = raw
				.replace(/^```[a-zA-Z]*\n?/, '')
				.replace(/```$/, '')
				.trim();
			// Validate JSON format
			const parseResult = safeJsonParse(raw);
			if (!parseResult.success) {
				throw new Error(`Invalid JSON plan: ${parseResult.error}`);
			}
			chatStore.addMessage({ role: 'assistant', content: raw });
			return { plan: raw, provider };
		} catch {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Plan failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.planPage(trimmedPrompt, {
					provider,
					apiKey: apiKeys[provider]!,
					purpose: 'plan'
				});
				let raw2 = res2.content?.trim() || '';
				raw2 = raw2
					.replace(/^```[a-zA-Z]*\n?/, '')
					.replace(/```$/, '')
					.trim();
				// Validate JSON format
				const parseResult2 = safeJsonParse(raw2);
				if (!parseResult2.success) {
					throw new Error(`Invalid JSON plan: ${parseResult2.error}`);
				}
				chatStore.addMessage({ role: 'assistant', content: raw2 });
				return { plan: raw2, provider };
			} catch {
				chatStore.addMessage({
					role: 'assistant',
					content: 'Plan failed. Please try again or pick another model.'
				});
				return { plan: '', provider };
			}
		}
	}

	async function handleBuildFromPlan(
		pendingPlan: string,
		modelInput: string,
		lastProvider: string
	) {
		if (!pendingPlan) return;

		const apiKeys = get(apiKeyStore);
		const provider = selectBestProvider(apiKeys, lastProvider) || 'openai';

		chatStore.addMessage({ role: 'user', content: 'BUILD FROM PLAN' });

		try {
			// Notify parent to show preview loading for build-from-plan flow
			onStartGenerating?.();
			const res = await llmClient.buildPageFromPlan(pendingPlan, {
				provider,
				apiKey: apiKeys[provider]!,
				model: modelInput || undefined,
				purpose: 'build'
			});
			chatStore.addMessage({
				role: 'assistant',
				content: '',
				generatedCode: res.content,
				codeLength: res.content?.length || 0,
				provider
			});
			onCodeGenerated?.(res.content, 'Build from plan', provider);
			return provider;
		} catch {
			chatStore.addMessage({
				role: 'assistant',
				content: 'Build failed with selected model. Retrying with default model…'
			});
			try {
				const res2 = await llmClient.buildPageFromPlan(pendingPlan, {
					provider,
					apiKey: apiKeys[provider]!,
					purpose: 'build'
				});
				chatStore.addMessage({
					role: 'assistant',
					content: '',
					generatedCode: res2.content,
					codeLength: res2.content?.length || 0,
					provider
				});
				onCodeGenerated?.(res2.content, 'Build from plan', provider);
				return provider;
			} catch {
				chatStore.addMessage({
					role: 'assistant',
					content: 'Build failed. Please try again or pick another model.'
				});
			}
		}
	}

	return {
		handleSubmit,
		handlePlan,
		handleBuildFromPlan
	};
}
