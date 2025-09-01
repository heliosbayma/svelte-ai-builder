export type PromptVariant = 'A' | 'B';

import { SYSTEM_PROMPT as BASE_SYSTEM, createBuildFromPlanPrompt } from './prompts';

export function systemPromptByVariant(variant: PromptVariant): string {
	// For now both variants share the same strict DoD system prompt
	return BASE_SYSTEM;
}

export function buildFromPlanByVariant(variant: PromptVariant, planJson: string): string {
	if (variant === 'B') {
		// Variant B: reuse base but nudge visual style slightly (more spacing, card hover)
		const base = createBuildFromPlanPrompt(planJson);
		return base.replace(
			'class={`grid gap-8 ${gridCols(columns)}`}',
			'class={`grid gap-10 ${gridCols(columns)}`}'
		);
	}
	return createBuildFromPlanPrompt(planJson);
}
