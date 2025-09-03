import type { TemplateGenerator, TemplateIntent } from './types';
import { IntentDetector } from './IntentDetector';
import { SignupTemplate } from './SignupTemplate';
import { LoginTemplate } from './LoginTemplate';
import { FormTemplate } from './FormTemplate';
import { ButtonTemplate } from './ButtonTemplate';
import { DefaultTemplate } from './DefaultTemplate';

export class TemplateRegistry {
	private templates: TemplateGenerator[] = [];
	private intentDetector = new IntentDetector();

	constructor() {
		// Order matters - more specific templates first
		this.templates = [
			new SignupTemplate(),
			new LoginTemplate(),
			new FormTemplate(),
			new ButtonTemplate(),
			new DefaultTemplate() // Always matches, should be last
		];
	}

	generateTemplate(originalSource: string): string {
		const intent = this.intentDetector.detectIntent(originalSource);
		
		for (const template of this.templates) {
			if (template.matches(intent)) {
				return template.generate(intent);
			}
		}
		
		// Fallback (should never reach here due to DefaultTemplate)
		return new DefaultTemplate().generate(intent);
	}
}