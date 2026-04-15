#!/usr/bin/env node
/**
 * Deploy the Atlas landing page and API to Vercel.
 *
 * Prerequisites:
 *   - Vercel CLI installed: `npm i -g vercel`
 *   - `vercel login` completed
 *
 * Usage:
 *   node scripts/deploy-vercel.mjs               # deploy landing + api
 *   node scripts/deploy-vercel.mjs --prod        # production deploy
 *   node scripts/deploy-vercel.mjs landing       # deploy only landing
 *   node scripts/deploy-vercel.mjs api --prod    # production deploy of api only
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const prod = args.includes('--prod');
const only = args.find((a) => !a.startsWith('--'));

const TARGETS = only ? [only] : ['landing', 'api'];

console.log(`Atlas Vercel deploy ${prod ? '(production)' : '(preview)'}\n`);

try {
    execSync('vercel --version', { stdio: 'ignore' });
} catch {
    console.error('ERROR: Vercel CLI not installed. Run: npm i -g vercel');
    process.exit(1);
}

for (const target of TARGETS) {
    const cwd = join(ROOT, target);
    if (!existsSync(cwd)) {
        console.error(`[skip] ${target} — directory missing`);
        continue;
    }
    console.log(`\n=== Deploying ${target} ===`);
    try {
        const cmd = prod ? 'vercel --prod --yes' : 'vercel --yes';
        execSync(cmd, { cwd, stdio: 'inherit' });
    } catch (err) {
        console.error(`[FAIL] ${target}: ${err.message}`);
        process.exit(1);
    }
}

console.log('\nDeployed. Check https://vercel.com/dashboard for URLs.');
