#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove WASM rollup override for Vercel build
if (packageJson.pnpm?.overrides?.rollup) {
	delete packageJson.pnpm.overrides.rollup;
	delete packageJson.pnpm.overrides['@rollup/wasm-node'];

	// Write back the modified package.json
	fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

	console.log('Removed Rollup WASM override for production build');
}

// Run the actual build
try {
	execSync('pnpm install --no-frozen-lockfile && vite build', { stdio: 'inherit' });
} catch (error) {
	console.error('Build failed:', error);
	process.exit(1);
}
