/**
 * HTTP fetch with polite defaults, redirect following, and Cheerio parsing.
 */

import { load, type CheerioAPI } from 'cheerio';

const USER_AGENT =
    'Mozilla/5.0 (compatible; Cortex-MCP/0.1; +https://atlas-agent.dev/bot)';

export interface FetchResult {
    $: CheerioAPI;
    html: string;
    finalUrl: string;
    headers: Record<string, string>;
    statusCode: number;
}

export async function fetchHtml(url: string, timeoutMs = 20000): Promise<FetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept':
                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText} when fetching ${url}`,
            );
        }

        const html = await response.text();
        const $ = load(html);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });

        return {
            $,
            html,
            finalUrl: response.url,
            headers,
            statusCode: response.status,
        };
    } finally {
        clearTimeout(timeout);
    }
}
