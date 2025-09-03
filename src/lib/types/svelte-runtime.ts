// Types for Svelte runtime components
export interface SvelteComponent {
	new (options: { target: HTMLElement; props?: Record<string, unknown> }): unknown;
}

export interface SvelteComponentModule {
	default?: SvelteComponent;
	[key: string]: unknown;
}

export interface MountOptions {
	target: HTMLElement;
	props?: Record<string, unknown>;
}

export interface SvelteInternalClient {
	mount?: (component: SvelteComponent, options: MountOptions) => unknown;
	[key: string]: unknown;
}

// Svelte 5 mount function signature
export interface SvelteMountFunction {
	(component: SvelteComponent, options: MountOptions): unknown;
}