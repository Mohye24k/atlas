/**
 * Atlas REST API — hosted web data extraction for AI agents and developers.
 *
 * Mirrors the six MCP tools as HTTP endpoints. Free tier 100 req/day, Pro
 * $19/month, Enterprise $99/month. Auth via Bearer token.
 *
 * Endpoints:
 *   POST /v1/extract/article    { url }
 *   POST /v1/extract/metadata   { url }
 *   POST /v1/extract/tables     { url }
 *   POST /v1/extract/links      { url, sameDomainOnly? }
 *   POST /v1/extract/contact    { url }
 *   POST /v1/extract/techstack  { url }
 *   GET  /health
 *   GET  /v1/usage              (requires auth)
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { fetchHtml } from './lib/fetch.js';
import { extractArticle } from './tools/article.js';
import { extractMetadata } from './tools/metadata.js';
import { extractTables } from './tools/tables.js';
import { extractLinks } from './tools/links.js';
import { extractContact } from './tools/contact.js';
import { detectTechStack } from './tools/techstack.js';
import { rateLimit, getUsage, type ApiKey } from './lib/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// ── Middleware ───────────────────────────────────────────────────────────────

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
});

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    // For the free tier, no token is required but rate limits are stricter.
    const apiKey: ApiKey = token
        ? { token, tier: token.startsWith('ck_pro_') ? 'pro' : token.startsWith('ck_ent_') ? 'enterprise' : 'free' }
        : { token: null, tier: 'free' };

    const clientId = apiKey.token || (req.headers['x-forwarded-for'] as string) || req.ip || 'anonymous';
    const limit = rateLimit(clientId, apiKey.tier);

    res.setHeader('X-RateLimit-Limit', String(limit.limit));
    res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
    res.setHeader('X-RateLimit-Reset', String(limit.resetAt));

    if (!limit.allowed) {
        return res.status(429).json({
            error: 'rate_limit_exceeded',
            message: `Daily limit of ${limit.limit} requests exceeded. Upgrade at https://atlas-agent.dev/pricing`,
            tier: apiKey.tier,
            resetAt: new Date(limit.resetAt).toISOString(),
        });
    }

    (req as Request & { apiKey: ApiKey }).apiKey = apiKey;
    return next();
}

// ── Health + usage ───────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'atlas-api', version: '0.1.0' });
});

app.get('/v1/usage', authMiddleware, (req, res) => {
    const apiKey = (req as Request & { apiKey: ApiKey }).apiKey;
    const clientId = apiKey.token || req.ip || 'anonymous';
    res.json(getUsage(clientId, apiKey.tier));
});

// ── Extraction endpoints ─────────────────────────────────────────────────────

const UrlBody = z.object({ url: z.string().url() });
const LinksBody = UrlBody.extend({ sameDomainOnly: z.boolean().optional().default(false) });

async function handleExtract(
    req: Request,
    res: Response,
    run: (ctx: Awaited<ReturnType<typeof fetchHtml>> & { url: string }) => unknown,
) {
    try {
        const { url } = UrlBody.parse(req.body ?? {});
        const result = await fetchHtml(url);
        const data = run({ ...result, url: result.finalUrl });
        return res.json({ ok: true, data });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ ok: false, error: message });
    }
}

app.post('/v1/extract/article', authMiddleware, (req, res) =>
    handleExtract(req, res, ({ url, $, html }) => extractArticle({ url, $, html })),
);

app.post('/v1/extract/metadata', authMiddleware, (req, res) =>
    handleExtract(req, res, ({ url, $, headers }) => extractMetadata({ url, $, headers })),
);

app.post('/v1/extract/tables', authMiddleware, (req, res) =>
    handleExtract(req, res, ({ url, $ }) => extractTables({ url, $ })),
);

app.post('/v1/extract/links', authMiddleware, async (req, res) => {
    try {
        const { url, sameDomainOnly } = LinksBody.parse(req.body ?? {});
        const result = await fetchHtml(url);
        const data = extractLinks({ url: result.finalUrl, $: result.$, sameDomainOnly });
        return res.json({ ok: true, data });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ ok: false, error: message });
    }
});

app.post('/v1/extract/contact', authMiddleware, (req, res) =>
    handleExtract(req, res, ({ url, $, html }) => extractContact({ url, $, html })),
);

app.post('/v1/extract/techstack', authMiddleware, (req, res) =>
    handleExtract(req, res, ({ url, $, html, headers }) =>
        detectTechStack({ url, $, html, headers }),
    ),
);

// ── Root ─────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
    res.json({
        service: 'atlas-api',
        docs: 'https://atlas-agent.dev/docs',
        endpoints: {
            'POST /v1/extract/article': 'Extract clean article body',
            'POST /v1/extract/metadata': 'Extract Open Graph + Twitter Card + JSON-LD',
            'POST /v1/extract/tables': 'Extract all HTML tables',
            'POST /v1/extract/links': 'Extract and categorize all links',
            'POST /v1/extract/contact': 'Extract emails, phones, social handles',
            'POST /v1/extract/techstack': 'Detect technologies powering a site',
        },
    });
});

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Atlas API listening on :${PORT}`);
});
