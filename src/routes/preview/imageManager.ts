export class ImageManager {
	setupImageFallbacks(root: HTMLElement): () => void {
		try {
			this.applyImgFallbacks(root);
			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLElement) {
							if (node.tagName === 'IMG') this.applyImgFallbacks(node);
							this.applyImgFallbacks(node);
						}
					});
				}
			});
			observer.observe(root, { childList: true, subtree: true });
			return () => {
				try {
					observer.disconnect();
				} catch {}
			};
		} catch (error) {
			console.warn('Failed to setup image fallbacks:', error);
			return () => {};
		}
	}

	private applyImgFallbacks(root: HTMLElement | Document) {
		const imgs = root.querySelectorAll('img');
		imgs.forEach((img) => {
			if ((img as HTMLElement).dataset && (img as HTMLElement).dataset.fallbackApplied) return;
			img.addEventListener('error', () => {
				const el = img as HTMLImageElement & { dataset: DOMStringMap };
				if (el.dataset.fallbackApplied) return;
				el.dataset.fallbackApplied = '1';
				const seed = el.alt && el.alt.trim().length > 0 ? el.alt.trim() : 'image';
				el.src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/360`;
			});
		});
	}
}
