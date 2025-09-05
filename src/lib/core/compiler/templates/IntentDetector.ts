import type { TemplateIntent } from './types';

export class IntentDetector {
	detectIntent(originalSource: string): TemplateIntent {
		const source = originalSource.toLowerCase();

		const hasButton = originalSource.includes('button') || originalSource.includes('click');
		const hasInput = originalSource.includes('input') || originalSource.includes('form');
		const hasLogin = source.includes('login') || source.includes('sign in');
		const hasSignup =
			originalSource.includes('sign up') ||
			originalSource.includes('signup') ||
			originalSource.includes('Sign Up') ||
			originalSource.includes('register');
		const hasForm =
			originalSource.includes('email') ||
			originalSource.includes('password') ||
			originalSource.includes('form');
		const hasValidation =
			originalSource.includes('validation') ||
			originalSource.includes('validate') ||
			originalSource.includes('touched');

		let type: TemplateIntent['type'] = 'default';

		if (hasSignup) {
			type = 'signup';
		} else if (hasLogin) {
			type = 'login';
		} else if (hasForm) {
			type = 'form';
		} else if (hasButton) {
			type = 'button';
		}

		return {
			type,
			hasButton,
			hasInput,
			hasForm,
			hasValidation,
			originalSource
		};
	}
}
