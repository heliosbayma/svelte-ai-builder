export interface DiffOp {
	type: 'equal' | 'add' | 'remove';
	a?: string;
	b?: string;
}

/**
 * Computes line-by-line diff operations using Longest Common Subsequence (LCS)
 * algorithm. Optimized for readability over performance.
 */
export function diffLines(a: string, b: string): DiffOp[] {
	const aLines = a.split('\n');
	const bLines = b.split('\n');
	const m = aLines.length;
	const n = bLines.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	
	for (let i = m - 1; i >= 0; i--) {
		for (let j = n - 1; j >= 0; j--) {
			dp[i][j] =
				aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	
	const ops: DiffOp[] = [];
	let i = 0,
		j = 0;
	while (i < m && j < n) {
		if (aLines[i] === bLines[j]) {
			ops.push({ type: 'equal', a: aLines[i], b: bLines[j] });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			ops.push({ type: 'remove', a: aLines[i] });
			i++;
		} else {
			ops.push({ type: 'add', b: bLines[j] });
			j++;
		}
	}
	while (i < m) {
		ops.push({ type: 'remove', a: aLines[i++] });
	}
	while (j < n) {
		ops.push({ type: 'add', b: bLines[j++] });
	}
	return ops;
}