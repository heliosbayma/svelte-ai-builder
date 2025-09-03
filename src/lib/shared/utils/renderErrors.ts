export function renderCompileErrorHtml(
	message: string,
	filename?: string,
	start?: { line: number; column: number },
	code?: string
): string {
	const errorFile = filename
		? `<div style="margin-bottom: 8px;"><strong>File:</strong> ${filename}</div>`
		: '';
	const errorLocation = start
		? `<div style="margin-bottom: 8px;"><strong>Line:</strong> ${start.line}, <strong>Column:</strong> ${start.column}</div>`
		: '';
	const escapedCode = (code || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `
        <div style="padding: 20px; color: var(--destructive); background: var(--muted); border: 1px solid var(--border); border-radius: 4px; font-family: system-ui;">
            <h3 style="margin: 0 0 16px 0; font-size: 18px;">Compilation Error</h3>
            <div style="margin-bottom: 12px;"><strong>Message:</strong> ${message}</div>
            ${errorFile}
            ${errorLocation}
            <details style="margin-top: 16px;">
                <summary style="cursor: pointer; font-weight: bold;">Generated Code</summary>
                <pre style="margin-top: 8px; background: var(--muted); color: var(--muted-foreground); padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; line-height: 1.4;">${escapedCode}</pre>
            </details>
        </div>
    `;
}

export function renderGenericErrorHtml(message: string): string {
	return `<div style="padding: 20px; color: var(--destructive); background: var(--muted); border: 1px solid var(--border); border-radius: 4px; font-family: system-ui;"><h3>Compilation Failed</h3><p><strong>Error:</strong> ${message}</p></div>`;
}
