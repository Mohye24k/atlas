#!/usr/bin/env node
/**
 * Atlas Files MCP — sandboxed filesystem access for AI agents.
 *
 * Every path an agent touches is resolved against an explicit allowlist of
 * root directories. Attempts to escape via "..", symlinks, or absolute paths
 * outside the allowlist are rejected. The agent cannot read, write, or delete
 * anything outside the allowlisted roots.
 *
 * Config:
 *   ATLAS_FILES_ROOTS    Colon- or semicolon-separated list of absolute paths.
 *                        Example: "/Users/me/projects:/Users/me/docs"
 *                        If unset, defaults to the current working directory.
 *   ATLAS_FILES_READONLY Set to "1" to disable write/delete/move tools.
 *
 * Tools:
 *   list_roots         Get the allowlisted roots
 *   list_directory     List the contents of a directory
 *   read_text_file     Read a file as UTF-8 (with line range)
 *   write_text_file    Write (or overwrite) a text file
 *   append_text_file   Append to a text file
 *   delete_path        Delete a file or empty directory
 *   move_path          Rename or move a file/directory
 *   copy_path          Copy a file or directory recursively
 *   create_directory   mkdir -p a directory
 *   stat_path          Get file/dir metadata
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

import {
    listRoots,
    listDirectory,
    readTextFile,
    writeTextFile,
    appendTextFile,
    deletePath,
    movePath,
    copyPath,
    createDirectory,
    statPath,
    isReadOnly,
} from './tools/fs.js';

// ── Zod input schemas ───────────────────────────────────────────────────────

const PathOnly = z.object({ path: z.string().min(1) });

const ListDirInput = z.object({
    path: z.string().min(1),
    includeHidden: z.boolean().optional().default(false),
});

const ReadInput = z.object({
    path: z.string().min(1),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
});

const WriteInput = z.object({
    path: z.string().min(1),
    content: z.string(),
    createParents: z.boolean().optional().default(true),
});

const AppendInput = z.object({
    path: z.string().min(1),
    content: z.string(),
});

const MoveInput = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    overwrite: z.boolean().optional().default(false),
});

const CopyInput = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    overwrite: z.boolean().optional().default(false),
});

const DeleteInput = z.object({
    path: z.string().min(1),
    recursive: z.boolean().optional().default(false),
});

const MkdirInput = z.object({
    path: z.string().min(1),
    recursive: z.boolean().optional().default(true),
});

// ── Tool registry ────────────────────────────────────────────────────────────

const READ_ONLY_TOOLS = [
    {
        name: 'list_roots',
        description:
            'Return the allowlisted root directories this server can access. Use this first to discover what the agent is allowed to touch.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'list_directory',
        description:
            'List the immediate contents of a directory. Each entry reports name, type (file/directory), size, and last modified time. Hidden files are excluded unless includeHidden is true.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Absolute or root-relative directory path' },
                includeHidden: { type: 'boolean', default: false },
            },
            required: ['path'],
        },
    },
    {
        name: 'read_text_file',
        description:
            'Read a UTF-8 text file. Optionally restrict to a line range. Files larger than 10MB are rejected to protect the agent context.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                startLine: { type: 'integer', minimum: 1 },
                endLine: { type: 'integer', minimum: 1 },
            },
            required: ['path'],
        },
    },
    {
        name: 'stat_path',
        description:
            'Return metadata about a file or directory: type, size, created, modified, and permission info.',
        inputSchema: {
            type: 'object',
            properties: { path: { type: 'string' } },
            required: ['path'],
        },
    },
];

const WRITE_TOOLS = [
    {
        name: 'write_text_file',
        description:
            'Create or overwrite a UTF-8 text file. Parent directories are created automatically unless createParents is false.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                content: { type: 'string' },
                createParents: { type: 'boolean', default: true },
            },
            required: ['path', 'content'],
        },
    },
    {
        name: 'append_text_file',
        description: 'Append UTF-8 content to an existing text file. Creates the file if it does not exist.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                content: { type: 'string' },
            },
            required: ['path', 'content'],
        },
    },
    {
        name: 'delete_path',
        description:
            'Delete a file or directory. Directories require recursive=true to protect against accidents.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                recursive: { type: 'boolean', default: false },
            },
            required: ['path'],
        },
    },
    {
        name: 'move_path',
        description:
            'Rename or move a file or directory. If overwrite is false and the destination exists, the call fails safely.',
        inputSchema: {
            type: 'object',
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                overwrite: { type: 'boolean', default: false },
            },
            required: ['from', 'to'],
        },
    },
    {
        name: 'copy_path',
        description:
            'Copy a file or directory (recursive for directories). If overwrite is false and the destination exists, the call fails safely.',
        inputSchema: {
            type: 'object',
            properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                overwrite: { type: 'boolean', default: false },
            },
            required: ['from', 'to'],
        },
    },
    {
        name: 'create_directory',
        description: 'Create a directory. With recursive=true (default) behaves like mkdir -p.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string' },
                recursive: { type: 'boolean', default: true },
            },
            required: ['path'],
        },
    },
];

const TOOLS = isReadOnly() ? READ_ONLY_TOOLS : [...READ_ONLY_TOOLS, ...WRITE_TOOLS];

// ── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
    { name: 'atlas-files', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'list_roots') return toolResult(await listRoots());
        if (name === 'list_directory') {
            const input = ListDirInput.parse(args);
            return toolResult(await listDirectory(input.path, input.includeHidden));
        }
        if (name === 'read_text_file') {
            const input = ReadInput.parse(args);
            return toolResult(await readTextFile(input.path, input.startLine, input.endLine));
        }
        if (name === 'stat_path') {
            const input = PathOnly.parse(args);
            return toolResult(await statPath(input.path));
        }

        if (isReadOnly()) {
            throw new Error(
                'Atlas Files is in read-only mode (ATLAS_FILES_READONLY=1). Write tools are disabled.',
            );
        }

        if (name === 'write_text_file') {
            const input = WriteInput.parse(args);
            return toolResult(await writeTextFile(input.path, input.content, input.createParents));
        }
        if (name === 'append_text_file') {
            const input = AppendInput.parse(args);
            return toolResult(await appendTextFile(input.path, input.content));
        }
        if (name === 'delete_path') {
            const input = DeleteInput.parse(args);
            return toolResult(await deletePath(input.path, input.recursive));
        }
        if (name === 'move_path') {
            const input = MoveInput.parse(args);
            return toolResult(await movePath(input.from, input.to, input.overwrite));
        }
        if (name === 'copy_path') {
            const input = CopyInput.parse(args);
            return toolResult(await copyPath(input.from, input.to, input.overwrite));
        }
        if (name === 'create_directory') {
            const input = MkdirInput.parse(args);
            return toolResult(await createDirectory(input.path, input.recursive));
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
    console.error(`Atlas Files MCP ready (${isReadOnly() ? 'read-only' : 'read-write'})`);
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal:', err);
    process.exit(1);
});
