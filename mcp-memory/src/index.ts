#!/usr/bin/env -S node --experimental-sqlite
/**
 * Atlas Memory MCP — Persistent memory for AI agents.
 *
 * Claude, Cursor, Windsurf and any MCP-compatible AI agent finally get a
 * real memory: remember what you told them, across sessions, across projects,
 * across weeks. SQLite-backed, local-first, private.
 *
 * Tools:
 *   remember         Store a memory (with tags and importance)
 *   recall           Search memories by text, tags, importance, namespace
 *   update_memory    Update content / tags / importance of an existing memory
 *   forget           Delete a memory by id
 *   list_memories    List all memories in a namespace
 *   memory_stats     Total count, per-namespace counts, top tags
 *   list_namespaces  Get all namespaces in use
 *
 * Install:
 *   npx -y atlas-mcp-memory
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "atlas-memory": {
 *         "command": "npx",
 *         "args": ["-y", "atlas-mcp-memory"]
 *       }
 *     }
 *   }
 *
 * Optional env var:
 *   ATLAS_MEMORY_DB   Custom path to SQLite file (default: ~/.atlas/memory.db)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { MemoryStore } from './lib/store.js';

const DEFAULT_DB_PATH = join(homedir(), '.cortex', 'memory.db');
const dbPath = process.env.ATLAS_MEMORY_DB || DEFAULT_DB_PATH;
const store = new MemoryStore(dbPath);

// ── Zod schemas for tool inputs ──────────────────────────────────────────────

const RememberInput = z.object({
    content: z.string().min(1).max(10_000).describe('The memory content — what to remember'),
    tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
    importance: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('1 (trivia) to 5 (critical). Default 3.'),
    namespace: z
        .string()
        .optional()
        .describe("Optional namespace (e.g. 'work', 'personal', 'project-x'). Default 'default'."),
});

const RecallInput = z.object({
    text: z.string().optional().describe('Full-text search query'),
    tags: z.array(z.string()).optional().describe('Filter by tags (any match)'),
    minImportance: z.number().int().min(1).max(5).optional().describe('Only return memories at or above this importance'),
    namespace: z.string().optional().describe('Namespace to search. Default "default".'),
    limit: z.number().int().min(1).max(200).optional().describe('Max results. Default 20.'),
});

const UpdateInput = z.object({
    id: z.string().min(1).describe('Memory id to update'),
    content: z.string().optional(),
    tags: z.array(z.string()).optional(),
    importance: z.number().int().min(1).max(5).optional(),
});

const ForgetInput = z.object({ id: z.string().min(1).describe('Memory id to delete') });

const ListInput = z.object({
    namespace: z.string().optional().describe('Namespace to list. Default "default".'),
    limit: z.number().int().min(1).max(500).optional().describe('Max results. Default 50.'),
});

const TOOLS = [
    {
        name: 'remember',
        description:
            'Store a new memory. The agent should call this whenever the user shares something worth remembering across sessions: preferences, facts, ongoing projects, important context. Tag liberally and set importance (1-5) based on how critical the memory is.',
        inputSchema: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'What to remember' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
                importance: { type: 'integer', minimum: 1, maximum: 5, description: '1 (trivia) to 5 (critical). Default 3.' },
                namespace: { type: 'string', description: 'Namespace to store in (default, work, personal, etc)' },
            },
            required: ['content'],
        },
    },
    {
        name: 'recall',
        description:
            "Search memories. Use this at the start of every conversation to load relevant context. Can search by free text, filter by tags, minimum importance, or namespace. Results are ordered by importance then recency. Most agents should call this with a broad query on every turn to keep context fresh.",
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Full-text search query' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (any match)' },
                minImportance: { type: 'integer', minimum: 1, maximum: 5 },
                namespace: { type: 'string' },
                limit: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
            },
        },
    },
    {
        name: 'update_memory',
        description:
            'Update an existing memory by id. You can change the content, tags, or importance. Use this when the user corrects something you remembered, or when new information supersedes old context.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Memory id' },
                content: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                importance: { type: 'integer', minimum: 1, maximum: 5 },
            },
            required: ['id'],
        },
    },
    {
        name: 'forget',
        description:
            'Delete a memory by id. Use this when the user explicitly asks to forget something, or when a memory is wrong and has no useful content to keep.',
        inputSchema: {
            type: 'object',
            properties: { id: { type: 'string', description: 'Memory id to delete' } },
            required: ['id'],
        },
    },
    {
        name: 'list_memories',
        description:
            'List all memories in a namespace ordered by importance. Useful for reviewing what the agent knows about a topic, project, or person.',
        inputSchema: {
            type: 'object',
            properties: {
                namespace: { type: 'string', description: "Namespace. Default 'default'." },
                limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
            },
        },
    },
    {
        name: 'memory_stats',
        description:
            'Get statistics about stored memories: total count, count per namespace, most-used tags. Useful for understanding the memory state.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_namespaces',
        description: 'List every namespace that has at least one memory stored in it.',
        inputSchema: { type: 'object', properties: {} },
    },
];

// ── Server setup ─────────────────────────────────────────────────────────────

const server = new Server(
    { name: 'atlas-memory', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'remember') {
            const input = RememberInput.parse(args);
            const memory = store.remember(input);
            return toolResult({ ok: true, memory });
        }

        if (name === 'recall') {
            const input = RecallInput.parse(args);
            const memories = store.recall(input);
            return toolResult({ ok: true, count: memories.length, memories });
        }

        if (name === 'update_memory') {
            const { id, ...patch } = UpdateInput.parse(args);
            const memory = store.update(id, patch);
            if (!memory) return toolResult({ ok: false, error: 'memory not found' });
            return toolResult({ ok: true, memory });
        }

        if (name === 'forget') {
            const { id } = ForgetInput.parse(args);
            const removed = store.forget(id);
            return toolResult({ ok: removed, error: removed ? undefined : 'memory not found' });
        }

        if (name === 'list_memories') {
            const input = ListInput.parse(args);
            const memories = store.list(input.namespace, input.limit);
            return toolResult({ ok: true, count: memories.length, memories });
        }

        if (name === 'memory_stats') {
            return toolResult({ ok: true, stats: store.stats(), dbPath });
        }

        if (name === 'list_namespaces') {
            return toolResult({ ok: true, namespaces: store.namespaces() });
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
        };
    }
});

function toolResult(data: unknown) {
    return {
        content: [
            {
                type: 'text' as const,
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // eslint-disable-next-line no-console
    console.error(`Atlas Memory ready (db: ${dbPath})`);
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal:', err);
    process.exit(1);
});

// Clean shutdown
process.on('SIGINT', () => {
    store.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    store.close();
    process.exit(0);
});
