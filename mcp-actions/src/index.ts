#!/usr/bin/env node
/**
 * Atlas Actions MCP — Let your AI agent DO things.
 *
 * Tools:
 *   send_email            Send an email via SMTP (SMTP_URL env var required)
 *   fire_webhook          POST JSON to any URL
 *   http_request          Generic HTTP request (GET/POST/PUT/PATCH/DELETE)
 *   create_ics            Generate an RFC 5545 .ics calendar event
 *   run_shell_command     Run a whitelisted shell command (opt-in via ATLAS_SHELL_ALLOWLIST env)
 *
 * Safety model:
 *   - Every action is explicit and requires matching tool call
 *   - Email needs SMTP_URL env var to function (no silent send)
 *   - Shell commands are disabled by default; opt-in via env var allowlist
 *   - All actions log to stderr for audit
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

import { sendEmail } from './providers/email.js';
import { fireWebhook, httpRequest } from './providers/http.js';
import { createIcs } from './providers/ics.js';
import { runShellCommand } from './providers/shell.js';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const EmailInput = z.object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(500),
    text: z.string().optional(),
    html: z.string().optional(),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    from: z.string().optional().describe('Override the default FROM address'),
});

const WebhookInput = z.object({
    url: z.string().url(),
    payload: z.unknown().optional(),
    headers: z.record(z.string()).optional(),
});

const HttpRequestInput = z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']).default('GET'),
    headers: z.record(z.string()).optional(),
    body: z.unknown().optional(),
    timeoutMs: z.number().int().min(100).max(60_000).default(15_000),
});

const IcsInput = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
    start: z.string().describe('ISO timestamp, e.g. 2026-04-20T15:00:00Z'),
    end: z.string().describe('ISO timestamp'),
    organizer: z.string().email().optional(),
    attendees: z.array(z.string().email()).optional(),
});

const ShellInput = z.object({
    command: z.string().min(1).describe('Shell command to run (must match allowlist)'),
    cwd: z.string().optional(),
    timeoutMs: z.number().int().min(100).max(120_000).default(30_000),
});

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
    {
        name: 'send_email',
        description:
            'Send an email via SMTP. Requires the SMTP_URL environment variable to be set (e.g. "smtps://user:pass@smtp.gmail.com:465"). Supports text, HTML, CC, BCC. Use when the user explicitly asks the agent to send an email.',
        inputSchema: {
            type: 'object',
            properties: {
                to: {
                    description: 'Recipient email or array of emails',
                    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                },
                subject: { type: 'string' },
                text: { type: 'string', description: 'Plain text body' },
                html: { type: 'string', description: 'HTML body (optional)' },
                cc: { description: 'CC recipients (email or array)' },
                bcc: { description: 'BCC recipients (email or array)' },
                from: { type: 'string', description: 'Override FROM address (optional)' },
            },
            required: ['to', 'subject'],
        },
    },
    {
        name: 'fire_webhook',
        description:
            'POST a JSON payload to a webhook URL. Use this to trigger Zapier, Make.com, Discord webhooks, Slack Incoming Webhooks, or any custom endpoint.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                payload: { description: 'JSON body to send' },
                headers: { type: 'object', additionalProperties: { type: 'string' } },
            },
            required: ['url'],
        },
    },
    {
        name: 'http_request',
        description:
            'Generic HTTP request tool. Supports GET, POST, PUT, PATCH, DELETE, HEAD. Returns status code, headers, and body. Use for calling any API that does not require OAuth.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] },
                headers: { type: 'object', additionalProperties: { type: 'string' } },
                body: { description: 'Request body (objects will be JSON-encoded)' },
                timeoutMs: { type: 'integer', default: 15000 },
            },
            required: ['url'],
        },
    },
    {
        name: 'create_ics',
        description:
            'Generate a standards-compliant (RFC 5545) .ics calendar event file. Returns the file contents as a base64 string ready to attach to an email or save to disk. Works with Google Calendar, Apple Calendar, Outlook, and every major calendar client.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                location: { type: 'string' },
                start: { type: 'string', description: 'ISO 8601 timestamp' },
                end: { type: 'string', description: 'ISO 8601 timestamp' },
                organizer: { type: 'string' },
                attendees: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'start', 'end'],
        },
    },
    {
        name: 'run_shell_command',
        description:
            'Run a shell command on the local machine. DISABLED by default for safety. To enable, set the ATLAS_SHELL_ALLOWLIST env var to a comma-separated list of allowed command prefixes (e.g. "git status,npm test,ls"). Only commands that start with an entry in the allowlist will run. Everything else returns an error.',
        inputSchema: {
            type: 'object',
            properties: {
                command: { type: 'string' },
                cwd: { type: 'string' },
                timeoutMs: { type: 'integer', default: 30000 },
            },
            required: ['command'],
        },
    },
];

// ── Server ───────────────────────────────────────────────────────────────────

const server = new Server(
    { name: 'atlas-actions', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'send_email') {
            const input = EmailInput.parse(args);
            return toolResult(await sendEmail(input));
        }
        if (name === 'fire_webhook') {
            const input = WebhookInput.parse(args);
            return toolResult(await fireWebhook(input));
        }
        if (name === 'http_request') {
            const input = HttpRequestInput.parse(args);
            return toolResult(await httpRequest(input));
        }
        if (name === 'create_ics') {
            const input = IcsInput.parse(args);
            return toolResult(createIcs(input));
        }
        if (name === 'run_shell_command') {
            const input = ShellInput.parse(args);
            return toolResult(await runShellCommand(input));
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
    console.error('Atlas Actions MCP ready');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal:', err);
    process.exit(1);
});
