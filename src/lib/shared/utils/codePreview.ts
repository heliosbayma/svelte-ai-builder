/**
 * Generates a human-readable preview description of generated code
 * by analyzing component names, HTML structure, and common UI patterns
 */
export function getCodePreview(code: string): string {
	if (!code) return 'Generated code';

	// Extract meaningful component/page names, but avoid technical variable names
	const componentMatch = code.match(
		/export\s+default\s+(\w+)|class\s+([A-Z]\w*)|function\s+([A-Z]\w*)/
	);
	if (componentMatch) {
		const name = componentMatch[1] || componentMatch[2] || componentMatch[3];
		// Only use names that look like proper component names (start with capital, not technical vars)
		if (
			name &&
			/^[A-Z][a-zA-Z]*$/.test(name) &&
			!/(path|state|data|config|util|helper)/i.test(name)
		) {
			return `${name}`;
		}
	}

	// Look for main HTML elements to understand the UI type
	const formMatch = code.match(/<form/i);
	const buttonMatch = code.match(/<button/i);
	const inputMatch = code.match(/<input/i);
	const cardMatch = code.match(/<card|class=".*card/i);
	const modalMatch = code.match(/<dialog|class=".*modal|class=".*dialog/i);
	const navMatch = code.match(/<nav|class=".*nav/i);
	const headerMatch = code.match(/<header/i);
	const footerMatch = code.match(/<footer/i);
	const sidebarMatch = code.match(/<aside|class=".*sidebar/i);
	const dashboardMatch = code.match(/dashboard|metric|chart|analytics/i);
	const loginMatch = code.match(/login|signin|auth/i);
	const profileMatch = code.match(/profile|avatar|user.*info/i);
	const settingsMatch = code.match(/settings|config|preferences/i);

	// App-level patterns
	if (loginMatch) return 'Login page';
	if (profileMatch) return 'Profile page';
	if (settingsMatch) return 'Settings page';
	if (dashboardMatch) return 'Dashboard';
	if (navMatch && sidebarMatch) return 'App layout';
	if (navMatch) return 'Navigation';
	if (sidebarMatch) return 'Sidebar';
	if (formMatch && inputMatch) return 'Form';
	if (modalMatch) return 'Modal dialog';
	if (headerMatch) return 'Header';
	if (footerMatch) return 'Footer';
	if (cardMatch) return 'Card UI';
	if (buttonMatch && !formMatch) return 'Button UI';

	// Look for common UI patterns
	const gridMatch = code.match(/grid|flex-.*gap|space-[xy]/);
	const listMatch = code.match(/<ul|<ol|<li/i);
	const tableMatch = code.match(/<table|<thead|<tbody|<tr|<td/i);

	if (tableMatch) return 'Data table';
	if (gridMatch) return 'Layout grid';
	if (listMatch) return 'List view';

	// Fallback based on complexity
	const lines = code.split('\n').filter((line) => line.trim()).length;
	if (lines > 100) return 'Full page';
	if (lines > 50) return 'Complex UI';
	if (lines > 20) return 'Multi-section UI';

	return 'UI element';
}

export function formatProvider(p?: string): string {
	if (!p) return '';
	switch (p) {
		case 'openai':
			return 'OpenAI';
		case 'anthropic':
			return 'Anthropic';
		case 'gemini':
			return 'Gemini';
		default:
			return p;
	}
}

export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit'
	});
}
