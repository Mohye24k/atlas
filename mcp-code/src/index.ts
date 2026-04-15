#!/usr/bin/env node
/**
 * Atlas Code MCP — Repo intelligence for coding agents.
 *
 * Tools:
 *   list_files          List all source files in a repo, grouped by type, with sizes
 *   search_code         Fast grep across the repo with globs, regex, context lines
 *   read_file           Read a file with optional line range
 *   file_outline        Extract top-level functions, classes, imports from a source file
 *   find_symbol         Find where a symbol (function, class, variable) is defined
 *   find_references     Find every place a symbol is used
 *   file_stats          Line counts, language breakdown, largest files, churn metrics
 *
 * Works on any local directory. Respects .gitignore. No external services.
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

import { listFiles } from './tools/listFiles.js';
import { searchCode } from './tools/searchCode.js';
import { readFile } from './tools/readFile.js';
import { fileOutline } from './tools/fileOutline.js';
import { findSymbol, findReferences } from './tools/symbols.js';
import { fileStats } from './tools/fileStats.js';

// ── Input schemas ───────────────────────────────────────────────────────────

const RepoPath = z
    .string()
    .min(1)
    .describe('Absolute path to the repository root. Defaults to current working directory if omitted.');

const ListFilesInput = z.object({
    repoPath: RepoPath.optional(),
    glob: z
        .string()
        .optional()
        .describe('Optional glob pattern to filter files, e.g. "src/**/*.ts"'),
    maxFiles: z.number().int().min(1).max(10_000).default(500),
});

const SearchInput = z.object({
    repoPath: RepoPath.optional(),
    pattern: z.string().min(1).describe('Regular expression to search for'),
    glob: z.string().optional(),
    caseInsensitive: z.boolean().default(true),
    contextLines: z.number().int().min(0).max(10).default(2),
    maxResults: z.number().int().min(1).max(500).default(100),
});

const ReadFileInput = z.object({
    filePath: z.string().min(1),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
});

const OutlineInput = z.object({ filePath: z.string().min(1) });

const SymbolInput = z.object({
    repoPath: RepoPath.optional(),
    symbol: z.string().min(1),
    kind: z.enum(['any', 'function', 'class', 'interface', 'type', 'const']).default('any'),
    maxResults: z.number().int().min(1).max(200).default(50),
});

const StatsInput = z.object({ repoPath: RepoPath.optional() });

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
    {
        name: 'list_files',
        description:
            'List source files in a repository. Respects .gitignore. Returns paths grouped by language/extension with size info. Use this to understand the shape of a codebase before diving in.',
        inputSchema: {
            type: 'object',
            properties: {
                repoPath: { type: 'string', description: 'Absolute path to repo (default: cwd)' },
                glob: { type: 'string', description: 'Optional glob filter like "src/**/*.ts"' },
                maxFiles: { type: 'integer', default: 500 },
            },
        },
    },
    {
        name: 'search_code',
        description:
            'Fast regex search across a repository. Returns matches with file path, line number, and surrounding context. Equivalent to "ripgrep with sensible defaults".',
        inputSchema: {
            type: 'object',
            properties: {
                repoPath: { type: 'string', description: 'Absolute path to repo (default: cwd)' },
                pattern: { type: 'string', description: 'Regex to search for' },
                glob: { type: 'string', description: 'Optional glob filter' },
                caseInsensitive: { type: 'boolean', default: true },
                contextLines: { type: 'integer', default: 2 },
                maxResults: { type: 'integer', default: 100 },
            },
            required: ['pattern'],
        },
    },
    {
        name: 'read_file',
        description:
            'Read a file with optional line range. Use this after search_code or find_symbol when you need to see the actual code.',
        inputSchema: {
            type: 'object',
            properties: {
                filePath: { type: 'string' },
                startLine: { type: 'integer', minimum: 1 },
                endLine: { type: 'integer', minimum: 1 },
            },
            required: ['filePath'],
        },
    },
    {
        name: 'file_outline',
        description:
            'Extract the top-level structure of a source file: imports, exported functions, classes, interfaces, types, and constants. Supports TypeScript, JavaScript, Python, Go, Rust, Java. Perfect for understanding a file without reading the whole thing.',
        inputSchema: {
            type: 'object',
            properties: { filePath: { type: 'string' } },
            required: ['filePath'],
        },
    },
    {
        name: 'find_symbol',
        description:
            'Find where a symbol (function, class, variable, type) is defined in a repository. Returns every definition site with file path, line, and matching declaration line.',
        inputSchema: {
            type: 'object',
            properties: {
                repoPath: { type: 'string' },
                symbol: { type: 'string', description: 'Symbol name to find' },
                kind: {
                    type: 'string',
                    enum: ['any', 'function', 'class', 'interface', 'type', 'const'],
                    default: 'any',
                },
                maxResults: { type: 'integer', default: 50 },
            },
            required: ['symbol'],
        },
    },
    {
        name: 'find_references',
        description:
            'Find every place a symbol is used in a repository. Returns all references with file path, line number, and the surrounding line. Use to understand impact before refactoring.',
        inputSchema: {
            type: 'object',
            properties: {
                repoPath: { type: 'string' },
                symbol: { type: 'string' },
                maxResults: { type: 'integer', default: 100 },
            },
            required: ['symbol'],
        },
    },
    {
        name: 'file_stats',
        description:
            'Return repository statistics: total files, lines of code, language breakdown, largest files, most-edited files. Use for onboarding into a new codebase or reporting.',
        inputSchema: {
            type: 'object',
            properties: { repoPath: { type: 'string' } },
        },
    },
];

// ── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
    { name: 'atlas-code', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'list_files') {
            const input = ListFilesInput.parse(args);
            return toolResult(await listFiles(input));
        }
        if (name === 'search_code') {
            const input = SearchInput.parse(args);
            return toolResult(await searchCode(input));
        }
        if (name === 'read_file') {
            const input = ReadFileInput.parse(args);
            return toolResult(await readFile(input));
        }
        if (name === 'file_outline') {
            const input = OutlineInput.parse(args);
            return toolResult(await fileOutline(input));
        }
        if (name === 'find_symbol') {
            const input = SymbolInput.parse(args);
            return toolResult(await findSymbol(input));
        }
        if (name === 'find_references') {
            const input = z
                .object({
                    repoPath: RepoPath.optional(),
                    symbol: z.string().min(1),
                    maxResults: z.number().int().min(1).max(500).default(100),
                })
                .parse(args);
            return toolResult(await findReferences(input));
        }
        if (name === 'file_stats') {
            const input = StatsInput.parse(args);
            return toolResult(await fileStats(input));
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
    console.error('Atlas Code MCP ready');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal:', err);
    process.exit(1);
});
