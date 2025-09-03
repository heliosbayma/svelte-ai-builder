export interface TemplateIntent {
	type: 'signup' | 'login' | 'dashboard' | 'blog' | 'form' | 'button' | 'default';
	hasButton: boolean;
	hasInput: boolean;
	hasForm: boolean;
	hasValidation: boolean;
	originalSource: string;
}

export interface TemplateGenerator {
	matches(intent: TemplateIntent): boolean;
	generate(intent: TemplateIntent): string;
}