/**
 * Tech stack detection (reuses the rule engine from the Apify actor).
 */

import type { CheerioAPI } from 'cheerio';

interface Signature {
    name: string;
    category: string;
    rules: string[];
}

const SIGNATURES: Signature[] = [
    { name: 'WordPress', category: 'cms', rules: ['html=/wp-content\\//', 'html=/wp-includes\\//', 'meta:generator=/WordPress/i'] },
    { name: 'Drupal', category: 'cms', rules: ['header:x-generator=/Drupal/i', 'meta:generator=/Drupal/i'] },
    { name: 'Ghost', category: 'cms', rules: ['meta:generator=/Ghost/i', 'html=/ghost-sdk/'] },
    { name: 'Wix', category: 'cms', rules: ['header:x-wix-request-id=/.+/', 'html=/static\\.wixstatic\\.com/'] },
    { name: 'Squarespace', category: 'cms', rules: ['html=/static\\.squarespace\\.com/', 'header:x-contextid=/.+/'] },
    { name: 'Webflow', category: 'cms', rules: ['html=/webflow\\.com/', 'meta:generator=/Webflow/i'] },
    { name: 'Contentful', category: 'cms', rules: ['html=/images\\.ctfassets\\.net/'] },
    { name: 'Sanity', category: 'cms', rules: ['html=/cdn\\.sanity\\.io/'] },
    { name: 'Shopify', category: 'ecommerce', rules: ['header:x-shopify-stage=/.+/', 'html=/cdn\\.shopify\\.com/', 'html=/Shopify\\.theme/'] },
    { name: 'WooCommerce', category: 'ecommerce', rules: ['html=/wp-content\\/plugins\\/woocommerce/', 'html=/woocommerce-/'] },
    { name: 'Magento', category: 'ecommerce', rules: ['cookie=/Mage-/', 'html=/Magento_Ui/'] },
    { name: 'BigCommerce', category: 'ecommerce', rules: ['html=/cdn\\d+\\.bigcommerce\\.com/'] },
    { name: 'PrestaShop', category: 'ecommerce', rules: ['meta:generator=/PrestaShop/i'] },
    { name: 'Next.js', category: 'frameworks', rules: ['header:x-powered-by=/Next\\.js/i', 'html=/_next\\/static/', 'html=/__NEXT_DATA__/'] },
    { name: 'Nuxt.js', category: 'frameworks', rules: ['html=/_nuxt\\//', 'html=/__NUXT__/'] },
    { name: 'React', category: 'frameworks', rules: ['html=/react(?:-dom)?[\\.@][\\d\\.]+/', 'script=/react(?:-dom)?\\..*\\.js/'] },
    { name: 'Vue.js', category: 'frameworks', rules: ['html=/vue(?:-router)?[\\.@][\\d\\.]+/', 'script=/vue[\\.@][\\d\\.]+(?:\\.min)?\\.js/'] },
    { name: 'Angular', category: 'frameworks', rules: ['html=/ng-version=/', 'html=/angular\\.io/'] },
    { name: 'Svelte', category: 'frameworks', rules: ['html=/svelte-[a-z0-9]+/'] },
    { name: 'Gatsby', category: 'frameworks', rules: ['meta:generator=/Gatsby/i', 'html=/gatsby-/'] },
    { name: 'Astro', category: 'frameworks', rules: ['meta:generator=/Astro/i', 'html=/astro-island/'] },
    { name: 'Remix', category: 'frameworks', rules: ['html=/\\/build\\/_shared\\//'] },
    { name: 'nginx', category: 'hosting', rules: ['header:server=/nginx/i'] },
    { name: 'Apache', category: 'hosting', rules: ['header:server=/Apache/i'] },
    { name: 'Microsoft IIS', category: 'hosting', rules: ['header:server=/IIS|Microsoft-IIS/i'] },
    { name: 'LiteSpeed', category: 'hosting', rules: ['header:server=/LiteSpeed/i'] },
    { name: 'Caddy', category: 'hosting', rules: ['header:server=/Caddy/i'] },
    { name: 'Express', category: 'frameworks', rules: ['header:x-powered-by=/Express/i'] },
    { name: 'PHP', category: 'frameworks', rules: ['header:x-powered-by=/PHP/i'] },
    { name: 'ASP.NET', category: 'frameworks', rules: ['header:x-powered-by=/ASP\\.NET/i', 'header:x-aspnet-version=/.+/'] },
    { name: 'Ruby on Rails', category: 'frameworks', rules: ['header:x-powered-by=/Rails/i'] },
    { name: 'Django', category: 'frameworks', rules: ['cookie=/django/i', 'cookie=/csrftoken/i'] },
    { name: 'Laravel', category: 'frameworks', rules: ['cookie=/laravel_session/i', 'cookie=/XSRF-TOKEN/i'] },
    { name: 'Cloudflare', category: 'cdn', rules: ['header:server=/cloudflare/i', 'header:cf-ray=/.+/'] },
    { name: 'Amazon CloudFront', category: 'cdn', rules: ['header:via=/CloudFront/i', 'header:x-amz-cf-id=/.+/'] },
    { name: 'Fastly', category: 'cdn', rules: ['header:x-served-by=/cache-.*/', 'header:x-fastly-request-id=/.+/'] },
    { name: 'Akamai', category: 'cdn', rules: ['header:server=/AkamaiGHost/i', 'header:x-akamai-transformed=/.+/'] },
    { name: 'Vercel', category: 'hosting', rules: ['header:x-vercel-id=/.+/', 'header:server=/Vercel/i'] },
    { name: 'Netlify', category: 'hosting', rules: ['header:x-nf-request-id=/.+/', 'header:server=/Netlify/i'] },
    { name: 'GitHub Pages', category: 'hosting', rules: ['header:server=/GitHub\\.com/i'] },
    { name: 'Google Analytics', category: 'analytics', rules: ['script=/google-analytics\\.com\\/(ga|analytics)\\.js/', 'html=/www\\.google-analytics\\.com/', 'html=/gtag\\(/'] },
    { name: 'Google Tag Manager', category: 'analytics', rules: ['script=/googletagmanager\\.com\\/gtm\\.js/', 'html=/GTM-[A-Z0-9]+/'] },
    { name: 'Plausible', category: 'analytics', rules: ['script=/plausible\\.io\\/js/'] },
    { name: 'Fathom', category: 'analytics', rules: ['script=/cdn\\.usefathom\\.com/'] },
    { name: 'Mixpanel', category: 'analytics', rules: ['html=/mixpanel/i', 'script=/cdn\\.mxpnl\\.com/'] },
    { name: 'Segment', category: 'analytics', rules: ['script=/cdn\\.segment\\.com\\/analytics\\.js/'] },
    { name: 'Hotjar', category: 'analytics', rules: ['script=/static\\.hotjar\\.com/'] },
    { name: 'Amplitude', category: 'analytics', rules: ['script=/cdn\\.amplitude\\.com/'] },
    { name: 'PostHog', category: 'analytics', rules: ['script=/posthog\\.com/', 'html=/posthog\\.init/'] },
    { name: 'HubSpot', category: 'marketing', rules: ['script=/js\\.hs-scripts\\.com/', 'script=/js\\.hubspot\\.com/'] },
    { name: 'Intercom', category: 'marketing', rules: ['script=/widget\\.intercom\\.io/', 'html=/intercomSettings/'] },
    { name: 'Drift', category: 'marketing', rules: ['script=/js\\.driftt\\.com/'] },
    { name: 'Tailwind CSS', category: 'ui', rules: ['html=/tailwind/i', 'script=/cdn\\.tailwindcss\\.com/'] },
    { name: 'Bootstrap', category: 'ui', rules: ['script=/bootstrap(?:\\.min)?\\.(?:js|css)/'] },
    { name: 'jQuery', category: 'frameworks', rules: ['script=/jquery(?:-[\\d\\.]+)?(?:\\.min)?\\.js/'] },
];

interface CompiledRule {
    kind: string;
    pattern: RegExp;
}

interface Compiled extends Signature {
    compiled: CompiledRule[];
}

function compileRule(rule: string): CompiledRule {
    const eqIdx = rule.indexOf('=');
    const kind = rule.slice(0, eqIdx);
    const body = rule.slice(eqIdx + 1);
    const match = body.match(/^\/(.+)\/([gimsuy]*)$/);
    const pattern = match ? new RegExp(match[1], match[2]) : new RegExp(body);
    return { kind, pattern };
}

const COMPILED: Compiled[] = SIGNATURES.map((sig) => ({
    ...sig,
    compiled: sig.rules.map(compileRule),
}));

export function detectTechStack({
    url,
    $,
    html,
    headers,
}: {
    url: string;
    $: CheerioAPI;
    html: string;
    headers: Record<string, string>;
}) {
    const normHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers || {})) {
        normHeaders[k.toLowerCase()] = String(v ?? '');
    }
    const cookieBlob = normHeaders['set-cookie'] || '';

    const scriptUrls: string[] = [];
    $('script[src]').each((_, el) => {
        scriptUrls.push($(el).attr('src') || '');
    });
    $('link[href]').each((_, el) => {
        scriptUrls.push($(el).attr('href') || '');
    });
    const scriptBlob = scriptUrls.join('\n');

    const metaByName: Record<string, string> = {};
    $('meta[name]').each((_, el) => {
        const name = ($(el).attr('name') || '').toLowerCase();
        metaByName[name] = $(el).attr('content') || '';
    });

    const detected: Array<{ name: string; category: string; confidence: number }> = [];
    const seen = new Set<string>();

    for (const sig of COMPILED) {
        let matched = 0;
        const total = sig.compiled.length;
        for (const rule of sig.compiled) {
            if (rule.kind === 'html' && rule.pattern.test(html)) matched++;
            else if (rule.kind === 'script' && rule.pattern.test(scriptBlob)) matched++;
            else if (rule.kind === 'cookie' && rule.pattern.test(cookieBlob)) matched++;
            else if (rule.kind.startsWith('header:')) {
                const headerName = rule.kind.slice('header:'.length);
                const value = normHeaders[headerName];
                if (value && rule.pattern.test(value)) matched++;
            } else if (rule.kind.startsWith('meta:')) {
                const metaName = rule.kind.slice('meta:'.length);
                const value = metaByName[metaName];
                if (value && rule.pattern.test(value)) matched++;
            }
        }
        if (matched > 0 && !seen.has(sig.name)) {
            seen.add(sig.name);
            detected.push({
                name: sig.name,
                category: sig.category,
                confidence: Math.min(1, matched / total),
            });
        }
    }

    const categorized: Record<string, string[]> = {};
    for (const tech of detected) {
        if (!categorized[tech.category]) categorized[tech.category] = [];
        categorized[tech.category].push(tech.name);
    }

    return {
        url,
        technologies: detected,
        categorized,
        technologyCount: detected.length,
    };
}
