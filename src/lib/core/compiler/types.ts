export interface CompileResult {
	js: string;
	css?: string;
	warnings: CompileWarning[];
	error?: CompileError;
	/** True when primary compile failed but a simplified fallback compiled successfully. */
	usedFallback?: boolean;
	/** Original error message when usedFallback is true. */
	originalErrorMessage?: string;
}

export interface CompileWarning {
	code: string;
	message: string;
	filename?: string;
	pos?: number;
	start?: { line: number; column: number };
	end?: { line: number; column: number };
}

export interface CompileError extends Error {
	code?: string;
	filename?: string;
	pos?: number;
	start?: { line: number; column: number };
	end?: { line: number; column: number };
}

export interface CompilerOptions {
	filename?: string;
	css?: 'injected' | 'external' | 'none';
	generate?: 'dom' | 'ssr' | false;
	hydratable?: boolean;
	immutable?: boolean;
}
