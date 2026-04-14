/**
 * PyPI search via the XML-RPC free search endpoint was deprecated; we use the
 * JSON search at https://pypi.org/search/?q=... and parse the simple HTML, or
 * the community mirror at libraries.io. Simplest working path: use the
 * pypi-simple JSON lookup for exact matches and the libraries.io API for
 * fuzzy search.
 *
 * Since libraries.io requires a key, we fall back to the unofficial search
 * endpoint at https://pypi.org/simple/ (too noisy) and instead use the
 * PyPI JSON API for the top match. For a proper fuzzy search with zero deps
 * we scrape the search results HTML — it's public and rate-limit friendly.
 */

export async function searchPypi(query: string, limit: number) {
    const url = `https://pypi.org/search/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Atlas-MCP-Search/0.1',
            Accept: 'text/html',
        },
    });
    if (!res.ok) throw new Error(`PyPI search failed: ${res.status}`);

    const html = await res.text();
    const results: Array<{
        name: string;
        version: string;
        description: string;
        url: string;
    }> = [];

    // Parse the search results via regex (PyPI's search HTML is stable)
    const itemRe =
        /<a class="package-snippet"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span class="package-snippet__name">([^<]+)<\/span>\s*<span class="package-snippet__version">([^<]+)<\/span>[\s\S]*?<p class="package-snippet__description">([^<]*)<\/p>/g;

    let match;
    while ((match = itemRe.exec(html)) !== null && results.length < limit) {
        results.push({
            name: match[2].trim(),
            version: match[3].trim(),
            description: match[4].trim(),
            url: `https://pypi.org${match[1]}`,
        });
    }

    return {
        source: 'pypi',
        query,
        totalCount: results.length,
        results,
    };
}
