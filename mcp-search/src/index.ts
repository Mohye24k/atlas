#!/usr/bin/env node
/**
 * Atlas Search MCP — Unified search across 7 sources for AI agents.
 *
 * Tools:
 *   search_web        DuckDuckGo Instant Answer + HTML scraping fallback
 *   search_github     GitHub repos and code via public search API
 *   search_npm        npm registry search
 *   search_pypi       PyPI package search
 *   search_stackoverflow  Stack Overflow questions via StackExchange API
 *   search_wikipedia  Wikipedia article search via MediaWiki API
 *   search_hackernews Hacker News stories via Algolia HN search
 *
 * All endpoints are free and require no API keys.
 *
 * Part of Atlas — infrastructure for AI agents.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { searchWeb } from './providers/web.js';
import { searchGithub } from './providers/github.js';
import { searchNpm } from './providers/npm.js';
import { searchPypi } from './providers/pypi.js';
import { searchStackOverflow } from './providers/stackoverflow.js';
import { searchWikipedia } from './providers/wikipedia.js';
import { searchHackerNews } from './providers/hackernews.js';

const QueryInput = z.object({
    query: z.string().min(1).max(500),
    limit: z.number().int().min(1).max(50).optional().default(10),
});

const GithubInput = QueryInput.extend({
    kind: z.enum(['repositories', 'code', 'users']).optional().default('repositories'),
});

const TOOLS = [
    {
        name: 'search_web',
        description:
            "General web search via DuckDuckGo. Returns titles, URLs and snippets. Use when you need broad context from the public web and aren't targeting a specific site.",
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_github',
        description:
            'Search GitHub for repositories, code snippets or users. Uses the public GitHub search API (rate limited but no auth required). Perfect for finding libraries, example code, or maintainers.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'GitHub search query (supports GitHub search qualifiers)' },
                kind: {
                    type: 'string',
                    enum: ['repositories', 'code', 'users'],
                    default: 'repositories',
                },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_npm',
        description:
            'Search the npm registry for JavaScript/TypeScript packages. Returns names, versions, descriptions, maintainers, and weekly download counts. Use when your agent needs to find a library.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Package name or keyword' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_pypi',
        description:
            'Search PyPI for Python packages. Returns name, summary, version, and project URL.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Package name or keyword' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_stackoverflow',
        description:
            'Search Stack Overflow questions via the StackExchange API. Returns question titles, tags, scores, answer counts, and URLs. Perfect for debugging with historical context.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Question text or keyword' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_wikipedia',
        description:
            'Search Wikipedia articles via the MediaWiki API. Returns titles, snippets, and article URLs. Use for factual background knowledge.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Topic or search term' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'search_hackernews',
        description:
            'Search Hacker News stories and comments via Algolia HN Search. Great for tech news, Show HN posts, and discussion history.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'HN search query' },
                limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
            },
            required: ['query'],
        },
    },
];

const server = new Server(
    { name: 'atlas-search', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'search_web') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchWeb(query, limit));
        }
        if (name === 'search_github') {
            const { query, limit, kind } = GithubInput.parse(args);
            return toolResult(await searchGithub(query, kind, limit));
        }
        if (name === 'search_npm') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchNpm(query, limit));
        }
        if (name === 'search_pypi') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchPypi(query, limit));
        }
        if (name === 'search_stackoverflow') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchStackOverflow(query, limit));
        }
        if (name === 'search_wikipedia') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchWikipedia(query, limit));
        }
        if (name === 'search_hackernews') {
            const { query, limit } = QueryInput.parse(args);
            return toolResult(await searchHackerNews(query, limit));
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

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // eslint-disable-next-line no-console
    console.error('Atlas Search MCP ready');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal:', err);
    process.exit(1);
});
