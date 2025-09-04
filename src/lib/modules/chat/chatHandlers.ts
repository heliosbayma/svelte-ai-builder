import { get } from 'svelte/store';
import { chatStore, chatComponentVersions } from '$lib/core/stores/chat';
import { apiKeyStore } from '$lib/core/stores/apiKeys';
import { modalStore } from '$lib/core/stores/modals';
import { llmClient } from '$lib/core/ai/services';
import type { LLMProviderType } from '$lib/core/ai/services/llm/types';
import { safeJsonParse, getErrorMessage } from '$lib/shared/utils/storage';
import { selectBestProvider } from '$lib/core/ai/utils/providerSelection';
import { info as toastInfo, warning as toastWarning } from '$lib/core/stores/toast';
import { chatSessionsStore } from '$lib/core/stores/chatSessions';

export interface ChatHandlerOptions {
	onCodeGenerated?: (code: string, prompt: string, provider: LLMProviderType) => void;
	onStartGenerating?: () => void;
	onProviderChange?: (provider: LLMProviderType) => void;
}

export function createChatHandlers(options: ChatHandlerOptions) {
	const { onCodeGenerated, onStartGenerating, onProviderChange } = options;

	function detectProviderFromModel(model?: string): LLMProviderType | null {
		if (!model) return null;
		const m = model.toLowerCase();
		if (m.startsWith('gpt-')) return 'openai';
		if (m.startsWith('claude-')) return 'anthropic';
		if (m.startsWith('gemini-')) return 'gemini';
		return null;
	}

	async function handleSubmit(prompt: string, modelInput: string, lastProvider: string) {
		const trimmedPrompt = prompt.trim();
		if (!trimmedPrompt || get(chatStore).isGenerating) return;

		// If this is the first message of a brand-new session, auto-name it from the prompt
		try {
			const sessions = get(chatSessionsStore);
			const currentId = sessions.currentId;
			if (currentId) {
				const meta = sessions.sessions.find((m) => m.id === currentId);
				const hasAnyMsg = (sessions.messagesById[currentId] || []).length > 0;
				const looksDefault = !meta?.title || /^new chat$/i.test(meta.title);
				const isBrandNewMeta = !!meta && meta.createdAt === meta.updatedAt;
				if (!hasAnyMsg && looksDefault && isBrandNewMeta) {
					const raw = trimmedPrompt
						.replace(/["'`]+/g, '')
						.replace(/\s+/g, ' ') // normalize spaces
						.trim();
					const words = raw.split(' ').slice(0, 7);
					let title = words.join(' ');
					if (title.length > 60) title = title.slice(0, 57).trimEnd() + '…';
					// Capitalize first letter
					title = title.charAt(0).toUpperCase() + title.slice(1);
					chatSessionsStore.renameSession(currentId, title);
				}
			}
		} catch {
			// best effort; ignore failures
		}

		const apiKeys = get(apiKeyStore);
		let provider = selectBestProvider(apiKeys, lastProvider);

		// If user specified a model explicitly, prefer the provider inferred from it (when key exists)
		const inferred = detectProviderFromModel(modelInput);
		if (inferred && apiKeys[inferred]) {
			provider = inferred;
		}

		if (!provider) {
			// Open informative modal (only for this send attempt) and clear conversation
			modalStore.open('apiKeysRequired');
			chatStore.clear();
			return;
		}

		// Notify UI which provider will be used (pre-request)
		onProviderChange?.(provider);

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
			// Heuristic: only use plan->build when starting fresh or explicitly asked.
			const hasExisting = !!(previousCode && previousCode.trim());
			const wantsFresh =
				/\b(start over|from scratch|new (app|project|page|dashboard)|rebuild|reset|scaffold|plan)\b/i.test(
					trimmedPrompt
				);
			const complexUiKeywords =
				/dashboard|sidebar|drawer|modal|sheet|tabs|accordion|stepper|wizard|toast|tooltip|popover|menu|breadcrumb|header|footer|navbar|table|datagrid|list|grid|card|cards|hero|pricing|settings|profile|auth|login|signup|form|filters?|chart|graphs?|sparkline|kpi|metrics|gallery|carousel|map|calendar|kanban|inbox|chat|feed|activity|notifications?|search|results?|pagination|infinite|routes?/i;
			const shouldPlan = (!hasExisting && complexUiKeywords.test(trimmedPrompt)) || wantsFresh;
			let response;
			// Ensure model is compatible with chosen provider; otherwise unset to use default
			const modelForRequest = (() => {
				const inferred2 = detectProviderFromModel(modelInput);
				return inferred2 && inferred2 === provider ? modelInput : '';
			})();
			if (shouldPlan) {
				try {
					const planRes = await llmClient.planPage(trimmedPrompt, {
						provider,
						apiKey: apiKeys[provider]!,
						model: modelForRequest || undefined,
						purpose: 'plan'
					});
					let plan = planRes.content?.trim() || '';
					plan = plan
						.replace(/^```[a-zA-Z]*\n?/, '')
						.replace(/```$/, '')
						.trim();

					// Inject stylePack based on prompt keywords
					try {
						const lower = trimmedPrompt.toLowerCase();
						let pack: 'premium' | 'neutral' | 'marketing' | undefined;
						if (/minimal|neutral|agency|clean|linear|stripe|vercel/.test(lower)) pack = 'neutral';
						else if (/marketing|hero|landing|promo|event/.test(lower)) pack = 'marketing';
						else pack = 'premium';
						const planJson = JSON.parse(plan || '{}');
						planJson.theme = planJson.theme || {};
						planJson.theme.stylePack = pack;
						plan = JSON.stringify(planJson);
					} catch {}

					// Try using deterministic plan renderer locally to avoid LLM variance
					try {
						const { PlanRenderer } = await import('$lib/core/compiler/templates/PlanRenderer');
						const component = PlanRenderer.renderFromPlan(plan);
						response = { content: component } as any;
					} catch {
						response = await llmClient.buildPageFromPlan(plan, {
							provider,
							apiKey: apiKeys[provider]!,
							model: modelForRequest || undefined,
							purpose: 'build'
						});
					}
				} catch {
					// If planning fails (e.g., provider/model incompatibility), fall back to direct generate
					response = await llmClient.generateComponent(
						trimmedPrompt,
						{
							provider,
							apiKey: apiKeys[provider]!,
							model: modelForRequest || undefined,
							signal: controller.signal,
							purpose: 'generate'
						},
						previousCode
					);
				}
			} else {
				response = await llmClient.generateComponent(
					trimmedPrompt,
					{
						provider,
						apiKey: apiKeys[provider]!,
						model: modelForRequest || undefined,
						signal: controller.signal,
						purpose: 'generate'
					},
					previousCode
				);
			}

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
			// Immediately stop current visual streaming/loading before any other work
			chatStore.updateMessage(assistantMessageId, { streaming: false });
			chatStore.stopGeneration();
			// First failure: attempt a single fallback to OpenAI if available and not already used
			try {
				if (provider !== 'openai' && apiKeys.openai) {
					// Show actionable notice for provider-specific limits
					if (provider === 'anthropic') {
						toastWarning('Anthropic billing required. Falling back to OpenAI.', {
							title: 'Anthropic unavailable',
							action: {
								label: 'Manage billing',
								handler: () => window.open('https://console.anthropic.com/settings/plans', '_blank')
							}
						});
					} else if (provider === 'gemini') {
						toastInfo('Gemini quota exhausted. Falling back to OpenAI.', {
							title: 'Gemini rate limit',
							action: {
								label: 'View quotas',
								handler: () =>
									window.open('https://ai.google.dev/gemini-api/docs/rate-limits', '_blank')
							}
						});
					}
					// Mark provider switch in the message and notify UI immediately
					chatStore.updateMessage(assistantMessageId, { provider: 'openai', content: '' });
					// Inform UI to switch model/provider immediately
					onProviderChange?.('openai');
					const versions2 = get(chatComponentVersions);
					const previousCode2 = versions2[versions2.length - 1]?.code;
					const fallbackRes = await llmClient.generateComponent(
						trimmedPrompt,
						{
							provider: 'openai',
							apiKey: apiKeys.openai!,
							model: undefined,
							purpose: 'generate'
						},
						previousCode2
					);
					chatStore.updateMessage(assistantMessageId, {
						content: '',
						generatedCode: fallbackRes.content,
						codeLength: fallbackRes.content?.length || 0,
						streaming: false,
						provider: 'openai'
					});
					onCodeGenerated?.(fallbackRes.content, trimmedPrompt, 'openai');
					return 'openai';
				}
			} catch {
				// ignore and fall through to surface original error
			}

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
