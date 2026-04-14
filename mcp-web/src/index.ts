#!/usr/bin/env node
/**
 * Atlas MCP — Web Extractor for AI Agents
 *
 * A Model Context Protocol server that gives Claude, Cursor, Windsurf and any
 * MCP-compatible AI agent the ability to extract clean, structured data from
 * any web page:
 *
 *   - extract_article     Clean article body for RAG pipelines
 *   - extract_metadata    Open Graph, Twitter Card, JSON-LD
 *   - extract_tables      All HTML tables as structured rows
 *   - extract_links       All links grouped by category
 *   - extract_contact     Emails, phones, social handles
 *   - detect_tech_stack   CMS, framework, CDN, analytics
 *
 * Install:
 *   npx -y atlas-mcp-web
 *
 * Or configure in Claude Desktop / Cursor / Windsurf:
 *   {
 *     "mcpServers": {
 *       "atlas-web": {
 *         "command": "npx",
 *         "args": ["-y", "atlas-mcp-web"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { extractArticle } from './tools/article.js';
import { extractMetadata } from './tools/metadata.js';
import { extractTables } from './tools/tables.js';
import { extractLinks } from './tools/links.js';
import { extractContact } from './tools/contact.js';
import { detectTechStack } from './tools/techstack.js';
import { fetchHtml } from './lib/fetch.js';

const UrlInput = z.object({
    url: z.string().url().describe('The URL to extract data from'),
});

const LinksInput = UrlInput.extend({
    sameDomainOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only return links on the same domain'),
});

const TOOLS = [
    {
        name: 'extract_article',
        description:
            'Extract the main article body from any news article, blog post, or long-form web page. Returns clean, readable text plus title, authors, publish date, word count, and keywords. Strips ads, navigation, comments, and boilerplate. Perfect for feeding content into RAG pipelines, summarization, or analysis.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL of the article to extract' },
            },
            required: ['url'],
        },
    },
    {
        name: 'extract_metadata',
        description:
            'Extract all metadata from any URL: Open Graph tags (title, description, image, site_name), Twitter Card metadata, JSON-LD structured data, canonical URL, favicons, and more. Ideal for building link previews, SEO audits, or enriching bookmarks.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract metadata from' },
            },
            required: ['url'],
        },
    },
    {
        name: 'extract_tables',
        description:
            'Extract all HTML tables from a web page as structured arrays. Each table is returned with its headers and rows, ready for analysis. Perfect for scraping financial data, sports stats, product comparisons, or any tabular content.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL containing the tables to extract' },
            },
            required: ['url'],
        },
    },
    {
        name: 'extract_links',
        description:
            'Extract all links from a web page grouped by category: internal, external, social media, email, and phone. Returns anchor text alongside each URL. Useful for link audits, sitemap generation, and finding contact information.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to extract links from' },
                sameDomainOnly: {
                    type: 'boolean',
                    description:
                        'If true, only return links on the same domain as the source URL',
                    default: false,
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'extract_contact',
        description:
            "Scan a web page for contact information: email addresses, phone numbers, and social media handles (Twitter, LinkedIn, Instagram, Facebook, YouTube, GitHub). Returns normalized, deduplicated results. Perfect for lead generation and sales prospecting.",
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to scan for contact info' },
            },
            required: ['url'],
        },
    },
    {
        name: 'detect_tech_stack',
        description:
            'Detect the technologies powering a website: CMS (WordPress, Shopify, etc), JS frameworks (React, Next.js, Vue), CDN (Cloudflare, Fastly), analytics tools (Google Analytics, Mixpanel), hosting (Vercel, Netlify), ecommerce platform, and more. 70+ technologies supported.',
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL of the website to analyze' },
            },
            required: ['url'],
        },
    },
];

const server = new Server(
    { name: 'atlas-web', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'extract_article') {
            const { url } = UrlInput.parse(args);
            const { $, html, finalUrl } = await fetchHtml(url);
            const result = extractArticle({ url: finalUrl, $, html });
            return toolResult(result);
        }

        if (name === 'extract_metadata') {
            const { url } = UrlInput.parse(args);
            const { $, finalUrl, headers } = await fetchHtml(url);
            const result = extractMetadata({ url: finalUrl, $, headers });
            return toolResult(result);
        }

        if (name === 'extract_tables') {
            const { url } = UrlInput.parse(args);
            const { $, finalUrl } = await fetchHtml(url);
            const result = extractTables({ url: finalUrl, $ });
            return toolResult(result);
        }

        if (name === 'extract_links') {
            const { url, sameDomainOnly } = LinksInput.parse(args);
            const { $, finalUrl } = await fetchHtml(url);
            const result = extractLinks({ url: finalUrl, $, sameDomainOnly });
            return toolResult(result);
        }

        if (name === 'extract_contact') {
            const { url } = UrlInput.parse(args);
            const { $, html, finalUrl } = await fetchHtml(url);
            const result = extractContact({ url: finalUrl, $, html });
            return toolResult(result);
        }

        if (name === 'detect_tech_stack') {
            const { url } = UrlInput.parse(args);
            const { $, html, finalUrl, headers } = await fetchHtml(url);
            const result = detectTechStack({ url: finalUrl, $, html, headers });
            return toolResult(result);
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
    console.error('Atlas MCP Web Extractor ready');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal error:', err);
    process.exit(1);
});
