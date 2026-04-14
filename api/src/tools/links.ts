/**
 * Extract and categorize all links from a page.
 */

import type { CheerioAPI } from 'cheerio';

const SOCIAL_HOSTS: Record<string, string> = {
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'linkedin.com': 'linkedin',
    'facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'github.com': 'github',
    'tiktok.com': 'tiktok',
    'reddit.com': 'reddit',
    'threads.net': 'threads',
    'bsky.app': 'bluesky',
    'medium.com': 'medium',
    'discord.gg': 'discord',
    'discord.com': 'discord',
};

export function extractLinks({
    url,
    $,
    sameDomainOnly,
}: {
    url: string;
    $: CheerioAPI;
    sameDomainOnly: boolean;
}) {
    const sourceDomain = safeDomain(url);

    const internal: Array<{ href: string; text: string }> = [];
    const external: Array<{ href: string; text: string }> = [];
    const social: Array<{ platform: string; href: string; text: string }> = [];
    const email: string[] = [];
    const phone: string[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
        const rawHref = ($(el).attr('href') || '').trim();
        if (!rawHref) return;
        const text = ($(el).text() || '').trim().slice(0, 200);

        // mailto:
        if (rawHref.startsWith('mailto:')) {
            const e = rawHref.slice(7).split('?')[0].toLowerCase();
            if (e && !email.includes(e)) email.push(e);
            return;
        }
        // tel:
        if (rawHref.startsWith('tel:')) {
            const p = rawHref.slice(4).replace(/\s+/g, '');
            if (p && !phone.includes(p)) phone.push(p);
            return;
        }
        // Skip anchors and javascript
        if (rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

        const resolved = resolve(rawHref, url);
        if (!resolved) return;
        if (seen.has(resolved)) return;
        seen.add(resolved);

        const host = safeDomain(resolved);
        if (!host) return;

        // Social?
        for (const [socialHost, platform] of Object.entries(SOCIAL_HOSTS)) {
            if (host === socialHost || host.endsWith('.' + socialHost)) {
                social.push({ platform, href: resolved, text });
                return;
            }
        }

        const isInternal = sourceDomain && (host === sourceDomain || host.endsWith('.' + sourceDomain));
        if (isInternal) {
            internal.push({ href: resolved, text });
        } else if (!sameDomainOnly) {
            external.push({ href: resolved, text });
        }
    });

    return {
        url,
        sourceDomain,
        counts: {
            internal: internal.length,
            external: external.length,
            social: social.length,
            email: email.length,
            phone: phone.length,
        },
        internal,
        external,
        social,
        email,
        phone,
    };
}

function safeDomain(u: string): string | null {
    try {
        return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
}

function resolve(href: string, base: string): string | null {
    try {
        return new URL(href, base).toString();
    } catch {
        return null;
    }
}
