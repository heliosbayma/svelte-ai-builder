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
			const el = img as HTMLImageElement & { dataset: DOMStringMap };
			if (el.dataset.imgHandlerAttached) return;
			el.dataset.imgHandlerAttached = '1';

			const subject = (el.alt && el.alt.trim()) || 'image';
			const candidates = this.createCandidates(subject);
			if (!el.src || el.src.startsWith('data:') || el.src.includes('picsum.photos/seed/')) {
				el.src = candidates[0];
				el.dataset.imgCandidateIndex = '0';
			}

			el.addEventListener('error', () => {
				const i = Number(el.dataset.imgCandidateIndex || '0');
				const next = i + 1;
				if (next < candidates.length) {
					el.dataset.imgCandidateIndex = String(next);
					el.src = candidates[next];
				} else {
					// Final fallback - ensure we show something stable
					el.src = `https://picsum.photos/seed/${encodeURIComponent(subject)}/640/360`;
				}
			});
		});
	}

	private createCandidates(subject: string): string[] {
		const keywords = encodeURIComponent(subject);
		return [
			`https://source.unsplash.com/featured/?${keywords}`,
			`https://source.unsplash.com/random/800x600/?${keywords}`,
			`https://picsum.photos/seed/${keywords}/640/360`
		];
	}
}
