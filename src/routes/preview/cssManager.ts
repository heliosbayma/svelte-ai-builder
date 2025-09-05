export class CSSManager {
	inject(css: string) {
		if (!css) return;

		const existing = document.getElementById('preview-inline-style');
		if (existing) existing.remove();

		const style = document.createElement('style');
		style.id = 'preview-inline-style';
		style.textContent = css;
		document.head.appendChild(style);
	}
}
