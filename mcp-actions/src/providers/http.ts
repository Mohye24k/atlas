/**
 * Webhook + generic HTTP request.
 */

interface WebhookInput {
    url: string;
    payload?: unknown;
    headers?: Record<string, string>;
}

interface HttpRequestInput {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs: number;
}

const UA = 'Atlas-MCP-Actions/0.1';

export async function fireWebhook(input: WebhookInput) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30_000);

    try {
        const res = await fetch(input.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': UA,
                ...(input.headers || {}),
            },
            body: JSON.stringify(input.payload ?? {}),
            signal: controller.signal,
        });

        const text = await res.text().catch(() => '');
        let parsed: unknown = text;
        try {
            parsed = JSON.parse(text);
        } catch {
            /* keep raw text */
        }

        // eslint-disable-next-line no-console
        console.error(`[atlas-actions] webhook POST ${input.url} -> ${res.status}`);

        return {
            ok: res.ok,
            statusCode: res.status,
            statusText: res.statusText,
            body: parsed,
        };
    } finally {
        clearTimeout(t);
    }
}

export async function httpRequest(input: HttpRequestInput) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), input.timeoutMs);

    const method = input.method.toUpperCase();
    let body: BodyInit | undefined;
    const headers: Record<string, string> = { 'User-Agent': UA, ...(input.headers || {}) };

    if (input.body !== undefined && method !== 'GET' && method !== 'HEAD') {
        if (typeof input.body === 'string') {
            body = input.body;
        } else {
            body = JSON.stringify(input.body);
            if (!headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = 'application/json';
            }
        }
    }

    try {
        const res = await fetch(input.url, {
            method,
            headers,
            body,
            signal: controller.signal,
        });

        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => {
            resHeaders[k] = v;
        });

        const text = await res.text().catch(() => '');
        let parsed: unknown = text;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            try {
                parsed = JSON.parse(text);
            } catch {
                /* keep text */
            }
        }

        // eslint-disable-next-line no-console
        console.error(`[atlas-actions] ${method} ${input.url} -> ${res.status}`);

        return {
            ok: res.ok,
            statusCode: res.status,
            statusText: res.statusText,
            headers: resHeaders,
            body: parsed,
        };
    } finally {
        clearTimeout(t);
    }
}
