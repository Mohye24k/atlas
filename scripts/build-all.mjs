#!/usr/bin/env node
/**
 * Build every Atlas package in one command.
 *
 * Usage:
 *   node scripts/build-all.mjs
 *
 * Runs `npm install` (if needed) and `npm run build` in each package
 * sequentially. Aborts on first failure.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGES = [
    'mcp-web',
    'mcp-memory',
    'mcp-search',
    'mcp-actions',
    'mcp-code',
    'mcp-files',
    'create-atlas-agent',
    'api',
    'landing',
];

for (const pkg of PACKAGES) {
    const cwd = join(ROOT, pkg);
    if (!existsSync(join(cwd, 'package.json'))) {
        console.error(`[skip] ${pkg} — no package.json`);
        continue;
    }

    console.log(`\n=== Building ${pkg} ===`);

    if (!existsSync(join(cwd, 'node_modules'))) {
        console.log(`[install] ${pkg}`);
        execSync('npm install', { cwd, stdio: 'inherit' });
    }

    try {
        execSync('npm run build', { cwd, stdio: 'inherit' });
        console.log(`[done] ${pkg}`);
    } catch (err) {
        console.error(`[FAIL] ${pkg}: ${err.message}`);
        process.exit(1);
    }
}

console.log('\nAll packages built successfully.');
