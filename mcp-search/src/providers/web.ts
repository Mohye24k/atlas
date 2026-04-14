/**
 * Web search via DuckDuckGo's HTML endpoint.
 *
 * DDG doesn't have an open JSON API, but `html.duckduckgo.com` returns a
 * lightweight HTML page we can parse quickly. No auth, no rate limits that
 * kick in before dozens of queries per minute.
 */

const UA =
    'Mozilla/5.0 (compatible; AtlasSearchBot/0.1; +https://atlas-agent.dev/bot)';

export async function searchWeb(query: string, limit: number) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': UA,
            Accept: 'text/html',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });
    if (!res.ok) throw new Error(`DuckDuckGo search failed: ${res.status}`);

    const html = await res.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // DDG HTML structure: <a class="result__a" href="...">title</a>
    //                    <a class="result__snippet">snippet</a>
    const linkRe =
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRe =
        /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    const links: Array<{ title: string; url: string }> = [];
    let m;
    while ((m = linkRe.exec(html)) !== null && links.length < limit) {
        links.push({
            url: decodeDdgRedirect(m[1]),
            title: stripTags(m[2]),
        });
    }

    const snippets: string[] = [];
    while ((m = snippetRe.exec(html)) !== null && snippets.length < limit) {
        snippets.push(stripTags(m[1]));
    }

    for (let i = 0; i < links.length; i++) {
        results.push({
            title: links[i].title,
            url: links[i].url,
            snippet: snippets[i] || '',
        });
    }

    return { source: 'duckduckgo', query, totalCount: results.length, results };
}

function decodeDdgRedirect(href: string): string {
    // DDG wraps links like //duckduckgo.com/l/?uddg=<encoded>
    const match = href.match(/uddg=([^&]+)/);
    if (match) {
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return href;
        }
    }
    if (href.startsWith('//')) return 'https:' + href;
    return href;
}

function stripTags(html: string): string {
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
