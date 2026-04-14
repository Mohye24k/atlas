/**
 * Extract contact information from a page: emails, phones, social handles.
 */

import type { CheerioAPI } from 'cheerio';

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// Simple international phone regex — at least 7 digits, optional + prefix, spaces/dashes/parens allowed
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;

const SOCIAL_PATTERNS: Array<{ platform: string; re: RegExp }> = [
    { platform: 'twitter', re: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})/g },
    { platform: 'linkedin', re: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/([A-Za-z0-9-_%]+)/g },
    { platform: 'instagram', re: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/g },
    { platform: 'facebook', re: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([A-Za-z0-9.-]+)/g },
    { platform: 'youtube', re: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9._-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_-]+)/g },
    { platform: 'github', re: /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]+)(?:\/[A-Za-z0-9_.-]+)?/g },
    { platform: 'tiktok', re: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)/g },
];

// Exclude common false positive domains for emails
const EMAIL_NOISE = [
    'example.com',
    'domain.com',
    'email.com',
    'sentry.io',
    'wixpress.com',
    'w3.org',
    'schema.org',
];

export function extractContact({
    url,
    $,
    html,
}: {
    url: string;
    $: CheerioAPI;
    html: string;
}) {
    // Strip script/style content for email/phone scanning to avoid tracking noise
    const $clone = $.root().clone();
    $clone.find('script, style, noscript').remove();
    const text = $clone.text();

    // Emails from text
    const emailSet = new Set<string>();
    for (const m of text.matchAll(EMAIL_RE)) {
        const e = m[0].toLowerCase();
        if (!EMAIL_NOISE.some((noise) => e.includes(noise))) emailSet.add(e);
    }
    // Emails from mailto: links
    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const e = href.slice(7).split('?')[0].toLowerCase();
        if (e) emailSet.add(e);
    });

    // Phones from text
    const phoneSet = new Set<string>();
    for (const m of text.matchAll(PHONE_RE)) {
        const normalized = m[0].replace(/\s+/g, ' ').trim();
        const digitCount = (normalized.match(/\d/g) || []).length;
        if (digitCount >= 7 && digitCount <= 15) phoneSet.add(normalized);
    }
    // Phones from tel: links (more reliable)
    $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const p = href.slice(4).trim();
        if (p) phoneSet.add(p);
    });

    // Social handles from the full HTML (more reliable source)
    const socials: Record<string, Set<string>> = {};
    for (const { platform, re } of SOCIAL_PATTERNS) {
        const set = new Set<string>();
        for (const m of html.matchAll(re)) {
            set.add(m[0].replace(/^https?:\/\//, '').replace(/^www\./, ''));
        }
        if (set.size > 0) socials[platform] = set;
    }

    const socialOut: Record<string, string[]> = {};
    for (const [platform, set] of Object.entries(socials)) {
        socialOut[platform] = Array.from(set).slice(0, 20);
    }

    return {
        url,
        emails: Array.from(emailSet).slice(0, 50),
        phones: Array.from(phoneSet).slice(0, 20),
        socials: socialOut,
        counts: {
            emails: emailSet.size,
            phones: phoneSet.size,
            socialProfiles: Object.values(socials).reduce((sum, s) => sum + s.size, 0),
        },
    };
}
