#!/usr/bin/env node
/**
 * create-atlas-mcp — one command installer for Atlas MCP servers.
 *
 *   npx create-atlas-mcp
 *
 * Detects Claude Desktop, Cursor, and Windsurf config locations on
 * Windows/macOS/Linux, shows the user which ones were found, and adds
 * the 5 Atlas MCP servers (memory, web, search, actions, code) to
 * each config. Safely merges with existing MCP servers. Creates a
 * .bak backup before writing.
 *
 * Supports flags:
 *   --target claude|cursor|windsurf|all   (default: all detected)
 *   --dry-run                              (print the diff, don't write)
 *   --only memory,web,search,actions,code  (subset of servers)
 *   --yes                                  (skip all prompts)
 *
 * Part of Atlas — infrastructure for AI agents.
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

// ── Constants ────────────────────────────────────────────────────────────────

const VERSION = '0.1.0';

const ATLAS_SERVERS: Record<string, { name: string; pkg: string; env?: Record<string, string> }> = {
    memory: {
        name: 'atlas-memory',
        pkg: 'atlas-mcp-memory',
    },
    web: {
        name: 'atlas-web',
        pkg: 'atlas-mcp-web',
    },
    search: {
        name: 'atlas-search',
        pkg: 'atlas-mcp-search',
    },
    actions: {
        name: 'atlas-actions',
        pkg: 'atlas-mcp-actions',
        env: {
            // Placeholder — the user should fill in their SMTP URL manually
            SMTP_URL: '',
        },
    },
    code: {
        name: 'atlas-code',
        pkg: 'atlas-mcp-code',
    },
    files: {
        name: 'atlas-files',
        pkg: 'atlas-mcp-files',
        env: {
            // User should set this to an absolute, allowlisted path
            ATLAS_FILES_ROOTS: '',
        },
    },
};

type Target = 'claude' | 'cursor' | 'windsurf';

interface TargetConfig {
    id: Target;
    displayName: string;
    configPath: string;
    detected: boolean;
}

// ── Config path detection ───────────────────────────────────────────────────

function getTargets(): TargetConfig[] {
    const plat = platform();
    const home = homedir();
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');

    const claudePath =
        plat === 'darwin'
            ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
            : plat === 'win32'
              ? join(appData, 'Claude', 'claude_desktop_config.json')
              : join(home, '.config', 'Claude', 'claude_desktop_config.json');

    // Cursor stores MCP config at ~/.cursor/mcp.json (cross-platform in the user home)
    const cursorPath = join(home, '.cursor', 'mcp.json');

    // Windsurf uses ~/.codeium/windsurf/mcp_config.json
    const windsurfPath = join(home, '.codeium', 'windsurf', 'mcp_config.json');

    return [
        {
            id: 'claude',
            displayName: 'Claude Desktop',
            configPath: claudePath,
            detected: existsSync(claudePath) || existsSync(dirname(claudePath)),
        },
        {
            id: 'cursor',
            displayName: 'Cursor',
            configPath: cursorPath,
            detected: existsSync(cursorPath) || existsSync(dirname(cursorPath)),
        },
        {
            id: 'windsurf',
            displayName: 'Windsurf',
            configPath: windsurfPath,
            detected: existsSync(windsurfPath) || existsSync(dirname(windsurfPath)),
        },
    ];
}

// ── Arg parsing ──────────────────────────────────────────────────────────────

interface Args {
    target: Target | 'all' | null;
    only: string[] | null;
    dryRun: boolean;
    yes: boolean;
    help: boolean;
}

function parseArgs(argv: string[]): Args {
    const args: Args = { target: null, only: null, dryRun: false, yes: false, help: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--dry-run') args.dryRun = true;
        else if (a === '--yes' || a === '-y') args.yes = true;
        else if (a === '--target') {
            const value = argv[++i];
            if (value === 'claude' || value === 'cursor' || value === 'windsurf' || value === 'all') {
                args.target = value;
            }
        } else if (a === '--only') {
            args.only = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return args;
}

// ── Config merging ───────────────────────────────────────────────────────────

interface McpConfig {
    mcpServers?: Record<string, {
        command: string;
        args: string[];
        env?: Record<string, string>;
    }>;
    [key: string]: unknown;
}

function loadConfig(path: string): McpConfig {
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (err) {
        throw new Error(`Failed to parse existing config at ${path}: ${(err as Error).message}`);
    }
}

function buildServerEntry(pkg: string, env?: Record<string, string>) {
    const nodeFlags = pkg === 'atlas-mcp-memory' ? ['--experimental-sqlite'] : [];
    const entry: { command: string; args: string[]; env?: Record<string, string> } = {
        command: 'npx',
        args: ['-y', pkg, ...nodeFlags],
    };
    // Actually, better to pass node flags via the package's own shebang. Use plain npx.
    entry.args = ['-y', pkg];
    if (env && Object.keys(env).length > 0) {
        entry.env = { ...env };
    }
    return entry;
}

function mergeConfig(existing: McpConfig, servers: string[]): { updated: McpConfig; added: string[]; replaced: string[] } {
    const updated: McpConfig = { ...existing };
    updated.mcpServers = { ...(existing.mcpServers ?? {}) };

    const added: string[] = [];
    const replaced: string[] = [];

    for (const key of servers) {
        const server = ATLAS_SERVERS[key];
        if (!server) continue;
        const entry = buildServerEntry(server.pkg, server.env);
        if (updated.mcpServers![server.name]) {
            replaced.push(server.name);
        } else {
            added.push(server.name);
        }
        updated.mcpServers![server.name] = entry;
    }

    return { updated, added, replaced };
}

// ── Writing ──────────────────────────────────────────────────────────────────

function writeConfig(path: string, config: McpConfig) {
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
        copyFileSync(path, path + '.bak');
    }
    writeFileSync(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ── CLI flow ─────────────────────────────────────────────────────────────────

const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function color(name: keyof typeof ANSI, text: string): string {
    return ANSI[name] + text + ANSI.reset;
}

function printBanner() {
    const lines = [
        '',
        color('bold', color('cyan', 'create-atlas-mcp')) + color('dim', ` v${VERSION}`),
        color('dim', 'Infrastructure for AI agents. One command install.'),
        color('dim', 'https://atlas-agent.dev'),
        '',
    ];
    for (const l of lines) console.log(l);
}

function printHelp() {
    printBanner();
    console.log(`Usage:
  npx create-atlas-mcp [flags]

Flags:
  --target claude|cursor|windsurf|all         Install into a specific MCP client (default: all detected)
  --only memory,web,search,actions,code,files Only install the listed servers (default: all 6)
  --dry-run                                    Print the diff without writing any files
  --yes, -y                                    Skip confirmation prompts
  --help, -h                                   Show this help

Examples:
  npx create-atlas-mcp
  npx create-atlas-mcp --dry-run
  npx create-atlas-mcp --target claude --only memory,web,files
  npx create-atlas-mcp --yes
`);
}

async function confirm(question: string, defaultYes = true): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const hint = defaultYes ? color('dim', '[Y/n]') : color('dim', '[y/N]');
    const answer = (await rl.question(`${question} ${hint} `)).trim().toLowerCase();
    rl.close();
    if (!answer) return defaultYes;
    return answer.startsWith('y');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    printBanner();

    const targets = getTargets();
    const detected = targets.filter((t) => t.detected);

    if (detected.length === 0) {
        console.log(color('yellow', '⚠  No MCP clients detected.'));
        console.log('  Looked for:');
        for (const t of targets) {
            console.log(`    ${color('dim', t.configPath)}`);
        }
        console.log('');
        console.log('Install Claude Desktop, Cursor, or Windsurf first, then rerun this command.');
        process.exit(1);
    }

    // Filter targets by --target flag
    let selected = detected;
    if (args.target && args.target !== 'all') {
        selected = detected.filter((t) => t.id === args.target);
        if (selected.length === 0) {
            console.log(color('red', `✗ Target ${args.target} not detected`));
            process.exit(1);
        }
    }

    console.log(color('bold', 'Detected clients:'));
    for (const t of detected) {
        const bullet = selected.includes(t) ? color('green', '✓') : color('dim', '·');
        console.log(`  ${bullet} ${t.displayName} ${color('dim', t.configPath)}`);
    }
    console.log('');

    // Decide which servers to install
    const validServers = Object.keys(ATLAS_SERVERS);
    let servers = validServers;
    if (args.only && args.only.length > 0) {
        const invalid = args.only.filter((s) => !validServers.includes(s));
        if (invalid.length > 0) {
            console.log(color('red', `✗ Unknown servers: ${invalid.join(', ')}`));
            console.log(`  Valid: ${validServers.join(', ')}`);
            process.exit(1);
        }
        servers = args.only;
    }

    console.log(color('bold', 'Atlas servers to install:'));
    for (const key of servers) {
        const srv = ATLAS_SERVERS[key];
        console.log(`  ${color('cyan', '•')} ${color('bold', srv.name)} ${color('dim', `→ ${srv.pkg}`)}`);
    }
    console.log('');

    if (args.dryRun) {
        console.log(color('yellow', 'DRY RUN — no files will be modified.'));
        console.log('');
        for (const target of selected) {
            console.log(color('bold', `--- ${target.displayName} ---`));
            const existing = loadConfig(target.configPath);
            const { updated, added, replaced } = mergeConfig(existing, servers);
            console.log(`  Path: ${target.configPath}`);
            console.log(`  Added: ${added.length ? added.join(', ') : color('dim', 'none')}`);
            console.log(`  Replaced: ${replaced.length ? replaced.join(', ') : color('dim', 'none')}`);
            console.log('  Resulting mcpServers:');
            console.log(
                color('dim', JSON.stringify(updated.mcpServers, null, 2).split('\n').map((l) => '    ' + l).join('\n')),
            );
            console.log('');
        }
        return;
    }

    if (!args.yes) {
        const proceed = await confirm(
            `Install ${servers.length} Atlas servers into ${selected.length} client${selected.length === 1 ? '' : 's'}?`,
            true,
        );
        if (!proceed) {
            console.log(color('dim', 'Aborted.'));
            return;
        }
    }

    console.log('');
    let anyFailed = false;

    for (const target of selected) {
        try {
            const existing = loadConfig(target.configPath);
            const { updated, added, replaced } = mergeConfig(existing, servers);
            writeConfig(target.configPath, updated);
            const parts: string[] = [];
            if (added.length) parts.push(color('green', `+${added.length} added`));
            if (replaced.length) parts.push(color('yellow', `~${replaced.length} replaced`));
            console.log(
                `  ${color('green', '✓')} ${target.displayName}: ${parts.join(', ') || 'no change'} ${color('dim', target.configPath)}`,
            );
        } catch (err) {
            anyFailed = true;
            console.log(`  ${color('red', '✗')} ${target.displayName}: ${(err as Error).message}`);
        }
    }

    console.log('');
    console.log(color('bold', 'Next steps:'));
    console.log(`  1. ${color('cyan', 'Restart your MCP client')} so it picks up the new servers.`);
    if (servers.includes('actions')) {
        console.log(
            `  2. ${color('yellow', 'Optional:')} set ${color('bold', 'SMTP_URL')} in the atlas-actions env if you want send_email to work.`,
        );
    }
    console.log(`  3. Ask your agent: ${color('cyan', '"what Atlas tools do you have?"')} — it should list all ${servers.length * 6} of them.`);
    console.log('');
    console.log(color('dim', 'Docs: https://atlas-agent.dev'));
    console.log(color('dim', 'Report issues: https://github.com/Mohye24k/atlas/issues'));

    if (anyFailed) process.exit(1);
}

main().catch((err) => {
    console.error(color('red', 'Fatal:'), err.stack || err.message);
    process.exit(1);
});
