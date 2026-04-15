#!/usr/bin/env node
/**
 * Atlas smoke test harness.
 *
 * Spawns each MCP server via stdio, runs a representative tool call against
 * each one, and prints a pass/fail report. Meant to be run as part of CI and
 * also before any launch to prove "it all actually works."
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *
 * Environment:
 *   ATLAS_SMOKE_TARGET_URL    URL to use for web extraction tests (default: https://apify.com)
 *   ATLAS_SMOKE_SEARCH_QUERY  Query to use for search tests      (default: "model context protocol")
 *   ATLAS_SMOKE_REPO_PATH     Repo path for code tests           (default: this repo root)
 *   ATLAS_MEMORY_DB           SQLite db path for memory tests    (default: /tmp/atlas-smoke.db)
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlinkSync, existsSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_URL = process.env.ATLAS_SMOKE_TARGET_URL || 'https://apify.com';
const SEARCH_QUERY = process.env.ATLAS_SMOKE_SEARCH_QUERY || 'model context protocol';
const REPO_PATH = process.env.ATLAS_SMOKE_REPO_PATH || ROOT;
const MEMORY_DB = process.env.ATLAS_MEMORY_DB || '/tmp/atlas-smoke.db';

const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(color, label, msg) {
    console.log(`${ANSI[color]}${label}${ANSI.reset} ${msg}`);
}

// ── MCP client over stdio ───────────────────────────────────────────────────

class McpClient {
    constructor(name, command, args, env = {}) {
        this.name = name;
        this.command = command;
        this.args = args;
        this.env = env;
        this.child = null;
        this.buffer = '';
        this.nextId = 1;
        this.pending = new Map();
    }

    async start() {
        this.child = spawn(this.command, this.args, {
            cwd: ROOT,
            env: { ...process.env, ...this.env },
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
        });
        this.child.stdout.setEncoding('utf-8');
        this.child.stdout.on('data', (chunk) => this.#onData(chunk));
        this.child.stderr.on('data', () => {}); // ignore stderr logs

        await this.rpc('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'atlas-smoke', version: '0.1' },
        });
    }

    #onData(chunk) {
        this.buffer += chunk;
        let newline;
        while ((newline = this.buffer.indexOf('\n')) !== -1) {
            const line = this.buffer.slice(0, newline).trim();
            this.buffer = this.buffer.slice(newline + 1);
            if (!line) continue;
            try {
                const msg = JSON.parse(line);
                if (msg.id && this.pending.has(msg.id)) {
                    const { resolve, reject } = this.pending.get(msg.id);
                    this.pending.delete(msg.id);
                    if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
                    else resolve(msg.result);
                }
            } catch {
                /* not JSON, skip */
            }
        }
    }

    rpc(method, params) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
            setTimeout(() => {
                if (this.pending.has(id)) {
                    this.pending.delete(id);
                    reject(new Error(`${this.name} ${method} timed out after 30s`));
                }
            }, 30_000);
        });
    }

    async callTool(name, args) {
        const result = await this.rpc('tools/call', { name, arguments: args });
        if (result?.isError) {
            const text = result.content?.[0]?.text || 'unknown error';
            throw new Error(text);
        }
        return JSON.parse(result.content[0].text);
    }

    stop() {
        if (this.child && !this.child.killed) {
            this.child.stdin.end();
            this.child.kill();
        }
    }
}

// ── Test cases ───────────────────────────────────────────────────────────────

const tests = [];

function test(name, server, commandArgs, env, run) {
    tests.push({ name, server, commandArgs, env, run });
}

test(
    'atlas-mcp-web: extract_metadata',
    'mcp-web',
    ['node', 'mcp-web/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('extract_metadata', { url: TARGET_URL });
        return {
            ok: Boolean(data?.title),
            summary: `title="${String(data?.title ?? '').slice(0, 60)}" site=${data?.siteName ?? 'n/a'}`,
        };
    },
);

test(
    'atlas-mcp-web: detect_tech_stack',
    'mcp-web',
    ['node', 'mcp-web/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('detect_tech_stack', { url: TARGET_URL });
        return {
            ok: data?.technologyCount > 0,
            summary: `${data?.technologyCount ?? 0} technologies detected`,
        };
    },
);

test(
    'atlas-mcp-search: search_hackernews',
    'mcp-search',
    ['node', 'mcp-search/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('search_hackernews', { query: SEARCH_QUERY, limit: 5 });
        return {
            ok: (data?.results?.length ?? 0) > 0,
            summary: `${data?.results?.length ?? 0} HN stories`,
        };
    },
);

test(
    'atlas-mcp-search: search_npm',
    'mcp-search',
    ['node', 'mcp-search/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('search_npm', { query: SEARCH_QUERY, limit: 5 });
        return {
            ok: (data?.results?.length ?? 0) > 0,
            summary: `${data?.results?.length ?? 0} npm packages`,
        };
    },
);

test(
    'atlas-mcp-search: search_wikipedia',
    'mcp-search',
    ['node', 'mcp-search/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('search_wikipedia', { query: 'Atlas mythology', limit: 3 });
        return {
            ok: (data?.results?.length ?? 0) > 0,
            summary: `${data?.results?.length ?? 0} wiki pages`,
        };
    },
);

test(
    'atlas-mcp-memory: remember + recall',
    'mcp-memory',
    ['node', '--experimental-sqlite', 'mcp-memory/dist/index.js'],
    { ATLAS_MEMORY_DB: MEMORY_DB },
    async (client) => {
        const stored = await client.callTool('remember', {
            content: 'Smoke test at ' + new Date().toISOString(),
            tags: ['smoke', 'test'],
            importance: 5,
            namespace: 'smoke',
        });
        if (!stored?.ok) throw new Error('remember failed');
        const recalled = await client.callTool('recall', { text: 'smoke test', namespace: 'smoke', limit: 5 });
        return {
            ok: recalled?.count >= 1,
            summary: `stored id=${stored.memory.id.slice(0, 8)} recall=${recalled.count}`,
        };
    },
);

test(
    'atlas-mcp-actions: create_ics',
    'mcp-actions',
    ['node', 'mcp-actions/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('create_ics', {
            title: 'Atlas smoke test event',
            start: '2026-05-01T15:00:00Z',
            end: '2026-05-01T15:30:00Z',
        });
        return {
            ok: data?.ok && data?.contentBase64?.length > 0,
            summary: `uid=${data?.uid?.slice(0, 8) ?? 'n/a'} bytes=${data?.contentBase64?.length ?? 0}`,
        };
    },
);

test(
    'atlas-mcp-actions: http_request',
    'mcp-actions',
    ['node', 'mcp-actions/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('http_request', {
            url: 'https://httpbin.org/status/200',
            method: 'GET',
        });
        return {
            ok: data?.statusCode === 200,
            summary: `httpbin returned ${data?.statusCode}`,
        };
    },
);

test(
    'atlas-mcp-code: file_stats',
    'mcp-code',
    ['node', 'mcp-code/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('file_stats', { repoPath: REPO_PATH });
        return {
            ok: data?.totalFiles > 0,
            summary: `${data?.totalFiles ?? 0} files / ${data?.totalLines ?? 0} lines`,
        };
    },
);

test(
    'atlas-mcp-code: find_symbol',
    'mcp-code',
    ['node', 'mcp-code/dist/index.js'],
    {},
    async (client) => {
        const data = await client.callTool('find_symbol', {
            repoPath: REPO_PATH,
            symbol: 'MemoryStore',
            kind: 'class',
        });
        return {
            ok: data?.totalHits > 0,
            summary: `${data?.totalHits ?? 0} definitions of MemoryStore`,
        };
    },
);

test(
    'atlas-mcp-files: list_roots',
    'mcp-files',
    ['node', 'mcp-files/dist/index.js'],
    { ATLAS_FILES_ROOTS: REPO_PATH },
    async (client) => {
        const data = await client.callTool('list_roots', {});
        return {
            ok: (data?.roots?.length ?? 0) > 0,
            summary: `${data?.roots?.length ?? 0} root(s), readOnly=${data?.readOnly}`,
        };
    },
);

test(
    'atlas-mcp-files: sandbox escape rejected',
    'mcp-files',
    ['node', 'mcp-files/dist/index.js'],
    { ATLAS_FILES_ROOTS: REPO_PATH },
    async (client) => {
        try {
            await client.callTool('read_text_file', { path: '/etc/passwd' });
            return { ok: false, summary: 'escape NOT blocked' };
        } catch (err) {
            const msg = String(err.message || err);
            return {
                ok: msg.includes('outside the allowlisted roots'),
                summary: 'correctly rejected /etc/passwd',
            };
        }
    },
);

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
    if (existsSync(MEMORY_DB)) {
        try {
            unlinkSync(MEMORY_DB);
        } catch {
            /* ignore */
        }
    }

    console.log(`${ANSI.bold}${ANSI.cyan}Atlas smoke test harness${ANSI.reset}`);
    console.log(`${ANSI.dim}Target URL: ${TARGET_URL}${ANSI.reset}`);
    console.log(`${ANSI.dim}Search query: "${SEARCH_QUERY}"${ANSI.reset}`);
    console.log(`${ANSI.dim}Repo path: ${REPO_PATH}${ANSI.reset}`);
    console.log('');

    let passed = 0;
    let failed = 0;
    const started = Date.now();

    // Group tests by server to reuse one client per server
    const byServer = new Map();
    for (const t of tests) {
        if (!byServer.has(t.server)) byServer.set(t.server, []);
        byServer.get(t.server).push(t);
    }

    for (const [server, serverTests] of byServer) {
        const first = serverTests[0];
        const client = new McpClient(server, first.commandArgs[0], first.commandArgs.slice(1), first.env);
        try {
            await client.start();
        } catch (err) {
            log('red', 'FAIL', `${server} failed to start: ${err.message}`);
            failed += serverTests.length;
            continue;
        }

        for (const t of serverTests) {
            const testStart = Date.now();
            try {
                const { ok, summary } = await t.run(client);
                const ms = Date.now() - testStart;
                if (ok) {
                    log('green', 'PASS', `${t.name} ${ANSI.dim}(${ms}ms) ${summary}${ANSI.reset}`);
                    passed++;
                } else {
                    log('red', 'FAIL', `${t.name} — ${summary}`);
                    failed++;
                }
            } catch (err) {
                log('red', 'FAIL', `${t.name} — ${err.message}`);
                failed++;
            }
        }

        client.stop();
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log('');
    console.log(`${ANSI.bold}${passed} passed, ${failed} failed${ANSI.reset}  ${ANSI.dim}(${elapsed}s total)${ANSI.reset}`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    log('red', 'FATAL', err.stack || err.message);
    process.exit(1);
});
