/**
 * Clean article extraction: title, authors, date, content.
 * JSON-LD first, then OG/meta, then readability heuristics.
 */

import type { CheerioAPI } from 'cheerio';

const MIN_CHARS = 280;

export function extractArticle({
    url,
    $,
}: {
    url: string;
    $: CheerioAPI;
    html: string;
}) {
    const meta = extractMeta($);
    const jsonLd = extractJsonLd($);

    const title =
        jsonLd.headline ||
        meta.ogTitle ||
        meta.twitterTitle ||
        ($('h1').first().text() || '').trim() ||
        ($('title').first().text() || '').trim();

    const description =
        jsonLd.description ||
        meta.ogDescription ||
        meta.twitterDescription ||
        meta.description ||
        '';

    const authors = jsonLd.authors.length
        ? jsonLd.authors
        : extractAuthorsFromMeta($, meta);

    const publishedAt =
        jsonLd.datePublished ||
        meta.articlePublishedTime ||
        $('time[datetime]').first().attr('datetime') ||
        null;

    const image = jsonLd.image || meta.ogImage || meta.twitterImage || null;
    const siteName = meta.ogSiteName || extractDomain(url);
    const language =
        ($('html').attr('lang') || meta.ogLocale || '').split('-')[0].toLowerCase() ||
        null;

    let content = extractContentFromArticle($);
    if (!content || content.length < MIN_CHARS) {
        content = extractContentByReadability($);
    }
    content = cleanText(content);

    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));

    return {
        url,
        title: cleanText(title),
        description: cleanText(description),
        authors,
        publishedAt,
        image,
        siteName,
        language,
        content,
        wordCount,
        readingTimeMinutes,
        keywords: extractKeywords($, meta, jsonLd),
    };
}

function extractMeta($: CheerioAPI) {
    const meta: Record<string, string | string[]> = {};
    $('meta').each((_, el) => {
        const name = ($(el).attr('name') || '').toLowerCase();
        const property = ($(el).attr('property') || '').toLowerCase();
        const content = $(el).attr('content') || '';
        if (!content) return;
        if (name === 'description') meta.description = content;
        if (name === 'keywords') meta.keywords = content;
        if (name === 'author') meta.author = content;
        if (name === 'twitter:title') meta.twitterTitle = content;
        if (name === 'twitter:description') meta.twitterDescription = content;
        if (name === 'twitter:image') meta.twitterImage = content;
        if (property === 'og:title') meta.ogTitle = content;
        if (property === 'og:description') meta.ogDescription = content;
        if (property === 'og:image') meta.ogImage = content;
        if (property === 'og:site_name') meta.ogSiteName = content;
        if (property === 'og:locale') meta.ogLocale = content;
        if (property === 'article:published_time') meta.articlePublishedTime = content;
        if (property === 'article:modified_time') meta.articleModifiedTime = content;
        if (property === 'article:author') meta.articleAuthor = content;
        if (property === 'article:tag') {
            if (!Array.isArray(meta.articleTags)) meta.articleTags = [];
            (meta.articleTags as string[]).push(content);
        }
    });
    return meta as Record<string, string> & { articleTags?: string[] };
}

interface JsonLdResult {
    headline: string | null;
    description: string | null;
    authors: string[];
    datePublished: string | null;
    image: string | null;
    keywords: string[];
}

function extractJsonLd($: CheerioAPI): JsonLdResult {
    const out: JsonLdResult = {
        headline: null,
        description: null,
        authors: [],
        datePublished: null,
        image: null,
        keywords: [],
    };

    $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).contents().text();
        if (!raw) return;
        let data: unknown;
        try {
            data = JSON.parse(raw);
        } catch {
            return;
        }
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
            collectJsonLdArticle(item, out);
            if (item && typeof item === 'object' && '@graph' in item) {
                const graph = (item as { '@graph': unknown[] })['@graph'];
                if (Array.isArray(graph)) for (const sub of graph) collectJsonLdArticle(sub, out);
            }
        }
    });

    return out;
}

function collectJsonLdArticle(item: unknown, out: JsonLdResult) {
    if (!item || typeof item !== 'object') return;
    const obj = item as Record<string, unknown>;
    const type = obj['@type'];
    const isArticle =
        type === 'NewsArticle' ||
        type === 'Article' ||
        type === 'BlogPosting' ||
        type === 'Report' ||
        (Array.isArray(type) && type.some((t) => typeof t === 'string' && /Article|Posting/.test(t)));
    if (!isArticle) return;

    if (!out.headline && typeof obj.headline === 'string') out.headline = obj.headline;
    if (!out.description && typeof obj.description === 'string') out.description = obj.description;
    if (!out.datePublished && typeof obj.datePublished === 'string') out.datePublished = obj.datePublished;

    if (!out.image) {
        const img = obj.image;
        if (typeof img === 'string') out.image = img;
        else if (Array.isArray(img) && img.length) {
            const first = img[0];
            out.image = typeof first === 'string' ? first : (first as { url?: string })?.url || null;
        } else if (img && typeof img === 'object') {
            out.image = (img as { url?: string }).url || null;
        }
    }

    const authors = ([] as unknown[]).concat(obj.author || []).flat();
    for (const a of authors) {
        if (!a) continue;
        const name = typeof a === 'string' ? a : (a as { name?: string })?.name || null;
        if (name && !out.authors.includes(name)) out.authors.push(name);
    }

    if (obj.keywords) {
        const kws = Array.isArray(obj.keywords)
            ? (obj.keywords as string[])
            : String(obj.keywords).split(',').map((k) => k.trim());
        for (const k of kws) if (k && !out.keywords.includes(k)) out.keywords.push(k);
    }
}

function extractAuthorsFromMeta($: CheerioAPI, meta: Record<string, string>) {
    const authors = new Set<string>();
    if (meta.author) authors.add(meta.author);
    if (meta.articleAuthor) authors.add(meta.articleAuthor);
    $('[rel="author"], .author, .byline, .post-author').each((_, el) => {
        const t = $(el).text().trim();
        if (t && t.length < 100) authors.add(t);
    });
    return Array.from(authors).filter(Boolean).slice(0, 10);
}

function extractContentFromArticle($: CheerioAPI): string {
    const noiseSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        '.ad', '.ads', '.advertisement', '.social', '.share', '.newsletter',
        '[class*="subscribe"]', '[class*="paywall"]', '[class*="related"]',
        '[class*="comment"]', '[class*="sidebar"]',
    ];
    const $clone = $.root().clone();
    noiseSelectors.forEach((sel) => $clone.find(sel).remove());

    const selectors = [
        'article',
        '[itemprop="articleBody"]',
        '[role="main"] article',
        'main article',
        '.article-body',
        '.post-content',
        '.entry-content',
        '.story-body',
        'main',
    ];

    for (const sel of selectors) {
        const el = $clone.find(sel).first();
        if (!el.length) continue;
        const text = el.find('p').map((_, p) => $(p).text()).get().join('\n\n').trim();
        if (text.length >= MIN_CHARS) return text;
    }
    return '';
}

function extractContentByReadability($: CheerioAPI): string {
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length >= 40) paragraphs.push(text);
    });
    return paragraphs.join('\n\n');
}

function extractKeywords($: CheerioAPI, meta: Record<string, string> & { articleTags?: string[] }, jsonLd: JsonLdResult) {
    const set = new Set<string>();
    if (meta.keywords) {
        for (const k of String(meta.keywords).split(',')) {
            const trimmed = k.trim();
            if (trimmed) set.add(trimmed);
        }
    }
    if (Array.isArray(meta.articleTags)) for (const t of meta.articleTags) set.add(t);
    for (const k of jsonLd.keywords) set.add(k);
    return Array.from(set).slice(0, 25);
}

function cleanText(text: string): string {
    if (!text) return '';
    return String(text)
        .replace(/\s+/g, ' ')
        .replace(/\s([.,;:!?])/g, '$1')
        .trim();
}

function extractDomain(url: string): string | null {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}
