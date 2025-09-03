// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Ambient module declarations for PrismJS dynamic imports
declare module 'prismjs';
declare module 'prism-svelte';
declare module 'prismjs/components/prism-markup';
declare module 'prismjs/components/prism-javascript';
declare module 'prismjs/components/prism-css';
declare module 'prismjs/themes/prism-tomorrow.css';

export {};
