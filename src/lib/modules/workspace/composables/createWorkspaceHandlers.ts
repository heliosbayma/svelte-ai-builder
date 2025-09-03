import { get } from 'svelte/store';
import type { LLMProviderType } from '$lib/core/ai/services/llm';
import { svelteCompiler } from '$lib/core/compiler';
import { llmClient } from '$lib/core/ai/services/llm';
import { apiKeyStore } from '$lib/core/stores/apiKeys';
import { historyStore, historyCurrentVersion } from '$lib/core/stores/history';
import { chatStore } from '$lib/core/stores/chat';
import { compiledCache, renderCompileErrorHtml, renderGenericErrorHtml } from '$lib/shared/utils';
import { t } from '$lib/shared/i18n';
import { getErrorMessage } from '$lib/shared/utils/storage';
import type { CompilationState, LayoutState } from '$lib/modules/workspace/state';

interface CreateWorkspaceHandlersProps {
	compilation: CompilationState;
	layout: LayoutState;
}

export function createWorkspaceHandlers({ compilation, layout }: CreateWorkspaceHandlersProps) {
	async function handleCodeGenerated(
		code: string,
		prompt: string = '',
		provider: LLMProviderType = 'anthropic'
	): Promise<void> {
		compilation.setCode(code);

		try {
			compilation.setLoading(t('loading.default'));
			const result = await svelteCompiler.compile(code);

			let generatedPreviewHtml = '';

			if (result.error && !result.usedFallback) {
				console.error('Compilation error details:', {
					message: result.error.message,
					filename: result.error.filename,
					start: result.error.start,
					end: result.error.end,
					pos: result.error.pos,
					toString: result.error.toString()
				});

				// Attempt up to two repair rounds using the LLM with compiler error context
				try {
					const keys = get(apiKeyStore);
					const apiKey = (keys as unknown as Record<string, string | null>)[provider] || null;

					if (!apiKey) return;

					const repair = await llmClient.repairComponent(
						provider as typeof provider,
						apiKey,
						prompt,
						code,
						result.error.toString?.() ?? result.error.message
					);

					if (!repair?.content) return;

					const repaired = await svelteCompiler.compile(repair.content);

					if (repaired.error) {
						// Second repair pass with diff-guided instruction
						try {
							const previousAttempt = repair.content;
							const diffSummary = 'Second pass';
							const repair2 = await llmClient.repairComponentWithDiff(
								provider as typeof provider,
								apiKey,
								prompt,
								code,
								previousAttempt,
								result.error.toString?.() ?? result.error.message,
								diffSummary
							);
							if (!repair2?.content) return;
							const repaired2 = await svelteCompiler.compile(repair2.content);
							if (repaired2.error) return;
							// Apply second-pass fix
							compilation.setCode(repair2.content);
							compilation.setCompiled('', repaired2.js, repaired2.css || '');
							const vid2 = historyStore.addVersion({
								prompt: `${prompt} ${t('history.repairedSuffix')}`,
								code: repair2.content,
								provider
							});
							compiledCache.set(vid2, {
								js: get(compilation.compiledJs),
								css: get(compilation.compiledCss),
								html: ''
							});
							return;
						} catch (e2) {
							console.warn('Second repair attempt failed:', e2);
						}
						return;
					}

					// Repair successful - apply the fix
					compilation.setCode(repair.content);
					compilation.setCompiled('', repaired.js, repaired.css || '');

					const vid = historyStore.addVersion({
						prompt: `${prompt} ${t('history.repairedSuffix')}`,
						code: repair.content,
						provider
					});
					compiledCache.set(vid, {
						js: get(compilation.compiledJs),
						css: get(compilation.compiledCss),
						html: ''
					});
					return;
				} catch (e) {
					console.warn('Repair attempt failed:', e);
				}

				generatedPreviewHtml = renderCompileErrorHtml(
					result.error.message,
					result.error.filename,
					result.error.start,
					code
				);
				compilation.clearCompiled();
			} else {
				compilation.setCompiled('', result.js, result.css || '');
				// Use runtime preview route; send code via postMessage from PreviewPanel on load
				generatedPreviewHtml = '';
			}

			// If we used a fallback successfully, prefer showing the working preview
			if (result.usedFallback) {
				compilation.setCompiled('', result.js, result.css || '');
				generatedPreviewHtml = '';
			}

			compilation.setPreviewHtml(generatedPreviewHtml);

			const vid = historyStore.addVersion({
				prompt,
				code,
				provider
			});
			compiledCache.set(vid, {
				js: get(compilation.compiledJs),
				css: get(compilation.compiledCss),
				html: generatedPreviewHtml
			});
			// Link the latest assistant message to this version for rehydration
			chatStore.linkLatestAssistantToVersion(
				vid,
				(get(compilation.compiledJs) || get(compilation.currentCode) || '').length
			);
		} catch (error) {
			console.error('Failed to compile:', error);
			const errorMsg = getErrorMessage(error);
			const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

			const errorHtml = renderCompileErrorHtml(errorMsg, undefined, undefined, escapedCode);
			compilation.setError(errorHtml);

			// Still add failed versions to history (persist minimal) and cache error HTML
			const vid = historyStore.addVersion({
				prompt,
				code,
				provider
			});
			compiledCache.set(vid, { js: '', css: '', html: errorHtml });
		} finally {
			compilation.clearLoading();
		}
	}

	function copyCode(): void {
		const code = get(compilation.currentCode);
		if (code) {
			navigator.clipboard.writeText(code);
		}
	}

	function handleUndo(): void {
		historyStore.undo();
		compilation.setLoading(t('loading.undoing'));
		loadCurrentVersion();
	}

	function handleRedo(): void {
		historyStore.redo();
		compilation.setLoading(t('loading.redoing'));
		loadCurrentVersion();
	}

	function loadCurrentVersion(): void {
		const current = get(historyCurrentVersion);
		if (current) {
			compilation.setLoading(t('loading.assemblingLatest'));
			compilation.setCode(current.code);
			const cached = compiledCache.get(current.id);
			if (cached) {
				// Force preview update by clearing first then setting
				compilation.clearCompiled();
				// Use requestAnimationFrame to ensure the clear takes effect
				requestAnimationFrame(() => {
					compilation.setCompiled(cached.html || '', cached.js, cached.css || '');
					compilation.clearLoading();
				});
			} else {
				// Lazy recompile
				svelteCompiler.compile(current.code).then((res) => {
					if (res.error) {
						const errorHtml = renderGenericErrorHtml(res.error.message);
						compilation.setError(errorHtml);
						compiledCache.set(current.id, { js: '', css: '', html: errorHtml });
						compilation.clearLoading();
					} else {
						compilation.setCompiled('', res.js, res.css || '');
						compiledCache.set(current.id, {
							js: res.js,
							css: res.css || '',
							html: ''
						});
						compilation.clearLoading();
					}
				});
			}
		} else {
			// Nothing in history yet
			compilation.clearCompiled();
			compilation.setLoading(t('loading.welcomeLong'));
		}
	}

	function handleSelectVersion(index: number) {
		historyStore.goToVersion(index);
		compilation.setLoading(t('loading.teleporting'));
		loadCurrentVersion();
	}

	function handleCodePanesResize(e: CustomEvent): void {
		const detail = e.detail;
		if (detail && detail.length === 2) {
			layout.setPreviewSize(detail[0].size);
			layout.setCodeSize(detail[1].size);
		}
	}

	function initializeWorkspace() {
		try {
			compilation.setLoading(t('loading.warmingPreview'));
			loadCurrentVersion();
		} catch {}
	}

	return {
		handleCodeGenerated,
		copyCode,
		handleUndo,
		handleRedo,
		loadCurrentVersion,
		handleSelectVersion,
		handleCodePanesResize,
		initializeWorkspace
	};
}
