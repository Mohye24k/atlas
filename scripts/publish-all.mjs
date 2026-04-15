#!/usr/bin/env node
/**
 * Publish every Atlas MCP package to npm in one command.
 *
 * Prerequisites:
 *   - `npm login` completed (or NPM_TOKEN env var set)
 *   - All packages built (run `node scripts/build-all.mjs` first)
 *
 * Usage:
 *   node scripts/publish-all.mjs              # publish all 5 MCP packages
 *   node scripts/publish-all.mjs --dry-run    # print what would be published
 *
 * The REST API and landing page are NOT published here — they deploy to Vercel.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const PACKAGES = [
    'mcp-web',
    'mcp-memory',
    'mcp-search',
    'mcp-actions',
    'mcp-code',
    'mcp-files',
    'create-atlas-agent',
];

console.log(`Atlas publish-all${dryRun ? ' (dry run)' : ''}\n`);

// Safety check: must be logged in (or dry-run)
if (!dryRun) {
    try {
        const who = execSync('npm whoami', { encoding: 'utf-8' }).trim();
        console.log(`Logged in as: ${who}\n`);
    } catch {
        console.error('ERROR: You are not logged in to npm. Run `npm login` first.');
        process.exit(1);
    }
}

for (const pkg of PACKAGES) {
    const cwd = join(ROOT, pkg);
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) {
        console.error(`[skip] ${pkg} — no package.json`);
        continue;
    }
    const { name, version } = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const distPath = join(cwd, 'dist', 'index.js');
    if (!existsSync(distPath)) {
        console.error(`[FAIL] ${pkg}: dist/index.js missing — run build-all first`);
        process.exit(1);
    }

    console.log(`\n=== ${name}@${version} ===`);

    if (dryRun) {
        execSync('npm publish --access public --dry-run', { cwd, stdio: 'inherit' });
    } else {
        try {
            execSync('npm publish --access public', { cwd, stdio: 'inherit' });
            console.log(`[published] ${name}@${version}`);
        } catch (err) {
            console.error(`[FAIL] ${name}: ${err.message}`);
            console.error('\nOther packages may still have published. Check npm and rerun if needed.');
            process.exit(1);
        }
    }
}

console.log('\nAll Atlas MCP packages published.');
console.log('\nInstall them in any MCP client:');
console.log('');
console.log('  {');
console.log('    "mcpServers": {');
for (const p of PACKAGES) {
    const name = `atlas-${p.replace('mcp-', 'mcp-')}`;
    const short = p.replace('mcp-', '');
    console.log(`      "atlas-${short}": {`);
    console.log(`        "command": "npx",`);
    console.log(`        "args": ["-y", "${name.startsWith('atlas-') ? name : 'atlas-' + p}"]`);
    console.log(`      }${p === PACKAGES[PACKAGES.length - 1] ? '' : ','}`);
}
console.log('    }');
console.log('  }');
