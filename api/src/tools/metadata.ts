/**
 * Complete URL metadata: Open Graph, Twitter Card, JSON-LD, favicons.
 */

import type { CheerioAPI } from 'cheerio';

export function extractMetadata({
    url,
    $,
    headers,
}: {
    url: string;
    $: CheerioAPI;
    headers: Record<string, string>;
}) {
    const pageTitle = ($('title').first().text() || '').trim();
    const lang = ($('html').attr('lang') || '').trim() || null;
    const canonical = $('link[rel="canonical"]').attr('href') || url;

    const metaName: Record<string, string> = {};
    $('meta[name]').each((_, el) => {
        const name = ($(el).attr('name') || '').toLowerCase();
        const content = $(el).attr('content');
        if (name && content) metaName[name] = content;
    });

    const og: Record<string, string> = {};
    const twitter: Record<string, string> = {};
    $('meta[property], meta[name^="twitter:"]').each((_, el) => {
        const key = ($(el).attr('property') || $(el).attr('name') || '').toLowerCase();
        const content = $(el).attr('content');
        if (!key || !content) return;
        if (key.startsWith('og:')) og[key.slice(3)] = content;
        else if (key.startsWith('twitter:')) twitter[key.slice(8)] = content;
    });

    const favicons: Array<{ rel: string; href: string; sizes: string | null; type: string | null }> = [];
    $('link').each((_, el) => {
        const rel = ($(el).attr('rel') || '').toLowerCase();
        const href = $(el).attr('href');
        if (!href) return;
        if (rel.includes('icon') || rel === 'apple-touch-icon' || rel === 'mask-icon') {
            favicons.push({
                rel,
                href: resolveUrl(href, url),
                sizes: $(el).attr('sizes') || null,
                type: $(el).attr('type') || null,
            });
        }
    });

    const jsonLd: unknown[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).contents().text();
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) jsonLd.push(...parsed);
            else jsonLd.push(parsed);
        } catch {
            // ignore malformed JSON-LD
        }
    });

    const structuredTypes = new Set<string>();
    for (const item of jsonLd) collectTypes(item, structuredTypes);

    return {
        url,
        title: og.title || twitter.title || pageTitle,
        description: og.description || twitter.description || metaName.description || null,
        image: og.image ? resolveUrl(og.image, url) : twitter.image ? resolveUrl(twitter.image, url) : null,
        siteName: og.site_name || null,
        type: og.type || null,
        author: metaName.author || null,
        language: lang,
        canonicalUrl: resolveUrl(canonical, url),
        keywords: metaName.keywords
            ? metaName.keywords.split(',').map((k) => k.trim()).filter(Boolean)
            : [],
        themeColor: metaName['theme-color'] || null,
        openGraph: og,
        twitterCard: twitter,
        favicons,
        jsonLd,
        structuredDataTypes: Array.from(structuredTypes),
        contentType: headers['content-type'] || null,
    };
}

function collectTypes(node: unknown, set: Set<string>) {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const t = obj['@type'];
    if (typeof t === 'string') set.add(t);
    else if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') set.add(v);
    for (const key of Object.keys(obj)) {
        if (key === '@type') continue;
        const v = obj[key];
        if (Array.isArray(v)) for (const item of v) collectTypes(item, set);
        else if (v && typeof v === 'object') collectTypes(v, set);
    }
}

function resolveUrl(href: string, base: string): string {
    try {
        return new URL(href, base).toString();
    } catch {
        return href;
    }
}
