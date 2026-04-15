#!/usr/bin/env node
/**
 * Atlas research agent — a live demo that chains every MCP server.
 *
 * Given a research question (topic), the script:
 *   1. search_hackernews   — find recent HN discussion about the topic
 *   2. search_npm          — find npm packages related to the topic
 *   3. extract_article     — pull clean article bodies from the top HN submissions
 *   4. remember            — store the key findings in Atlas Memory
 *   5. create_ics          — schedule a "review this research" calendar event
 *
 * The result is a single markdown report printed to stdout and saved to
 * ./reports/<slug>.md, plus a calendar event as a .ics file next to it.
 *
 * Usage:
 *   node examples/research-agent/research.mjs "model context protocol"
 *   node examples/research-agent/research.mjs "local-first AI agents" --limit 10
 *
 * No API keys required — every provider used here is free and public.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPORTS_DIR = resolve(ROOT, 'reports');
const MEMORY_DB = process.env.ATLAS_MEMORY_DB || resolve(ROOT, '.atlas-research.db');

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const topic = args.find((a) => !a.startsWith('--')) || 'model context protocol';
const limitFlag = args.indexOf('--limit');
const limit = limitFlag >= 0 ? parseInt(args[limitFlag + 1], 10) : 5;

// ── MCP stdio client ─────────────────────────────────────────────────────────

class McpClient {
    constructor(name, command, argsList, env = {}) {
        this.name = name;
        this.child = spawn(command, argsList, {
            cwd: ROOT,
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
        });
        this.child.stdout.setEncoding('utf-8');
        this.buffer = '';
        this.nextId = 1;
        this.pending = new Map();
        this.child.stdout.on('data', (chunk) => this.#onData(chunk));
        this.child.stderr.on('data', () => {}); // ignore stderr logs
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
                    if (msg.error) reject(new Error(msg.error.message));
                    else resolve(msg.result);
                }
            } catch {
                /* skip */
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
                    reject(new Error(`${this.name} ${method} timed out`));
                }
            }, 30_000);
        });
    }

    async init() {
        await this.rpc('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'atlas-research-agent', version: '0.1' },
        });
    }

    async callTool(name, args) {
        const result = await this.rpc('tools/call', { name, arguments: args });
        if (result?.isError) throw new Error(result.content?.[0]?.text || 'error');
        return JSON.parse(result.content[0].text);
    }

    stop() {
        if (this.child && !this.child.killed) {
            this.child.stdin.end();
            this.child.kill();
        }
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

function section(title) {
    console.log('\n' + '='.repeat(60));
    console.log('  ' + title);
    console.log('='.repeat(60));
}

// ── Main research flow ──────────────────────────────────────────────────────

async function main() {
    console.log(`\nAtlas Research Agent`);
    console.log(`Topic:  ${topic}`);
    console.log(`Limit:  ${limit}`);
    console.log(`Report: ${REPORTS_DIR}/${slugify(topic)}.md`);

    // Clean any stale memory db for this demo
    if (existsSync(MEMORY_DB)) {
        try { unlinkSync(MEMORY_DB); } catch { /* ignore */ }
    }

    mkdirSync(REPORTS_DIR, { recursive: true });

    // Spawn all 4 MCP servers we need
    const searchClient = new McpClient(
        'atlas-search',
        'node',
        ['mcp-search/dist/index.js'],
    );
    const webClient = new McpClient(
        'atlas-web',
        'node',
        ['mcp-web/dist/index.js'],
    );
    const memoryClient = new McpClient(
        'atlas-memory',
        'node',
        ['--experimental-sqlite', 'mcp-memory/dist/index.js'],
        { ATLAS_MEMORY_DB: MEMORY_DB },
    );
    const actionsClient = new McpClient(
        'atlas-actions',
        'node',
        ['mcp-actions/dist/index.js'],
    );

    await Promise.all([
        searchClient.init(),
        webClient.init(),
        memoryClient.init(),
        actionsClient.init(),
    ]);

    // ── Step 1: search HN for recent discussion ──────────────────────────────
    section('1. Searching Hacker News');
    const hnResults = await searchClient.callTool('search_hackernews', { query: topic, limit });
    console.log(`Found ${hnResults.results?.length ?? 0} HN stories`);
    const hnStories = hnResults.results ?? [];
    for (const story of hnStories.slice(0, limit)) {
        console.log(`  • [${story.points}↑ ${story.commentCount}💬] ${story.title}`);
    }

    // ── Step 2: search npm for packages ──────────────────────────────────────
    section('2. Searching npm for related packages');
    const npmResults = await searchClient.callTool('search_npm', { query: topic, limit });
    const packages = npmResults.results ?? [];
    console.log(`Found ${packages.length} packages`);
    for (const pkg of packages.slice(0, limit)) {
        const desc = (pkg.description || '').slice(0, 60);
        console.log(`  • ${pkg.name}@${pkg.version}  —  ${desc}`);
    }

    // ── Step 3: extract articles for the top HN stories ──────────────────────
    section('3. Extracting article content');
    const articles = [];
    for (const story of hnStories.slice(0, Math.min(3, limit))) {
        if (!story.url) continue;
        try {
            const article = await webClient.callTool('extract_article', { url: story.url });
            articles.push({
                title: article.title,
                authors: article.authors,
                wordCount: article.wordCount,
                readingTimeMinutes: article.readingTimeMinutes,
                url: story.url,
                hnUrl: story.hnUrl,
                excerpt: (article.content || '').slice(0, 500),
            });
            console.log(`  ✓ ${article.title?.slice(0, 60) || story.title} (${article.wordCount} words)`);
        } catch (err) {
            console.log(`  ✗ ${story.url}: ${err.message}`);
        }
    }

    // ── Step 4: remember the key findings ────────────────────────────────────
    section('4. Storing findings in Atlas Memory');
    const namespace = `research-${slugify(topic)}`;
    const memoriesStored = [];

    const topStory = hnStories[0];
    if (topStory) {
        const stored = await memoryClient.callTool('remember', {
            content: `Top HN story on "${topic}": "${topStory.title}" (${topStory.points} points, ${topStory.commentCount} comments) at ${topStory.hnUrl}`,
            tags: ['research', 'hn-top', slugify(topic)],
            importance: 4,
            namespace,
        });
        memoriesStored.push(stored.memory);
        console.log(`  ✓ stored top HN story (id: ${stored.memory.id.slice(0, 8)})`);
    }

    if (packages.length > 0) {
        const stored = await memoryClient.callTool('remember', {
            content: `Top npm packages for "${topic}": ${packages.slice(0, 5).map((p) => `${p.name}@${p.version}`).join(', ')}`,
            tags: ['research', 'npm', slugify(topic)],
            importance: 4,
            namespace,
        });
        memoriesStored.push(stored.memory);
        console.log(`  ✓ stored package list (id: ${stored.memory.id.slice(0, 8)})`);
    }

    for (const article of articles) {
        const stored = await memoryClient.callTool('remember', {
            content: `Article: "${article.title}" by ${(article.authors || []).join(', ') || 'unknown'} — ${article.wordCount} words. URL: ${article.url}. Summary: ${article.excerpt.slice(0, 300)}`,
            tags: ['research', 'article', slugify(topic)],
            importance: 3,
            namespace,
        });
        memoriesStored.push(stored.memory);
    }
    console.log(`  Stored ${memoriesStored.length} memories in namespace "${namespace}"`);

    // ── Step 5: schedule a review ────────────────────────────────────────────
    section('5. Scheduling a calendar review');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setUTCHours(15, 0, 0, 0);
    const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);

    const ics = await actionsClient.callTool('create_ics', {
        title: `Research review: ${topic}`,
        description: `Follow up on Atlas research agent findings for "${topic}". Top story: ${topStory?.title || 'n/a'}. ${packages.length} npm packages found. ${articles.length} articles summarized.`,
        start: tomorrow.toISOString(),
        end: endTime.toISOString(),
    });

    const icsPath = join(REPORTS_DIR, `${slugify(topic)}.ics`);
    writeFileSync(icsPath, ics.content, 'utf-8');
    console.log(`  ✓ .ics created at ${icsPath}`);
    console.log(`  Event time: ${tomorrow.toISOString()}`);

    // ── Step 6: write the markdown report ────────────────────────────────────
    section('6. Generating research report');
    const report = buildReport({ topic, hnStories, packages, articles, memoriesStored, icsPath, tomorrow });
    const reportPath = join(REPORTS_DIR, `${slugify(topic)}.md`);
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`  ✓ markdown report at ${reportPath}`);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    searchClient.stop();
    webClient.stop();
    memoryClient.stop();
    actionsClient.stop();

    console.log('\nDone.');
    console.log(`Open the report: ${reportPath}`);
    console.log('');
}

function buildReport({ topic, hnStories, packages, articles, memoriesStored, icsPath, tomorrow }) {
    const now = new Date().toISOString();
    const parts = [];
    parts.push(`# Research report: ${topic}`);
    parts.push('');
    parts.push(`*Generated by Atlas research agent at ${now}*`);
    parts.push('');
    parts.push(`This report was assembled by chaining five MCP servers:`);
    parts.push(`\`atlas-mcp-search\` → \`atlas-mcp-web\` → \`atlas-mcp-memory\` → \`atlas-mcp-actions\`.`);
    parts.push('');

    parts.push('## Top Hacker News discussion');
    if (!hnStories.length) parts.push('_No results._');
    for (const s of hnStories) {
        parts.push(`- **${s.title}** (${s.points}↑ / ${s.commentCount}💬)`);
        if (s.url) parts.push(`  - Source: ${s.url}`);
        parts.push(`  - HN thread: ${s.hnUrl}`);
    }
    parts.push('');

    parts.push('## Related npm packages');
    if (!packages.length) parts.push('_No packages found._');
    for (const p of packages) {
        parts.push(`- **${p.name}** \`${p.version}\``);
        if (p.description) parts.push(`  - ${p.description}`);
        if (p.npmUrl) parts.push(`  - ${p.npmUrl}`);
    }
    parts.push('');

    parts.push('## Article summaries');
    if (!articles.length) parts.push('_No articles extracted._');
    for (const a of articles) {
        parts.push(`### ${a.title || 'Untitled'}`);
        parts.push('');
        if (a.authors?.length) parts.push(`By ${a.authors.join(', ')}`);
        parts.push(`${a.wordCount} words · ~${a.readingTimeMinutes} min read`);
        parts.push('');
        parts.push('> ' + (a.excerpt || '').replace(/\n/g, '\n> '));
        parts.push('');
        parts.push(`[Source](${a.url}) · [HN discussion](${a.hnUrl})`);
        parts.push('');
    }

    parts.push('## Atlas Memory');
    parts.push(`Stored ${memoriesStored.length} memories in namespace \`research-${slugify(topic)}\`.`);
    parts.push('Your next agent session can recall these automatically:');
    parts.push('');
    parts.push('```');
    parts.push(`recall(text: "${topic}", namespace: "research-${slugify(topic)}")`);
    parts.push('```');
    parts.push('');

    parts.push('## Calendar');
    parts.push(`A follow-up review event has been generated as \`${icsPath}\`.`);
    parts.push(`Scheduled for **${tomorrow.toISOString()}** (30 minutes).`);
    parts.push('Drag the .ics file into Google Calendar, Apple Calendar, or Outlook to import.');
    parts.push('');

    parts.push('---');
    parts.push('*Atlas — infrastructure for AI agents. https://github.com/Mohye24k/atlas*');

    return parts.join('\n');
}

main().catch((err) => {
    console.error('\nFatal:', err.stack || err.message);
    process.exit(1);
});
