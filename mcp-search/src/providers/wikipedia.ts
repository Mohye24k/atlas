/**
 * Wikipedia search via the MediaWiki API (no auth required).
 */

export async function searchWikipedia(query: string, limit: number) {
    const url =
        `https://en.wikipedia.org/w/api.php` +
        `?action=query&format=json&origin=*&list=search` +
        `&srsearch=${encodeURIComponent(query)}&srlimit=${Math.min(limit, 50)}&srprop=snippet|titlesnippet|size`;

    const res = await fetch(url, { headers: { 'User-Agent': 'Atlas-MCP-Search/0.1' } });
    if (!res.ok) throw new Error(`Wikipedia search failed: ${res.status}`);

    const data = (await res.json()) as {
        query?: {
            search?: Array<{
                title: string;
                snippet: string;
                size: number;
                pageid: number;
                timestamp: string;
            }>;
            searchinfo?: { totalhits?: number };
        };
    };

    const items = data.query?.search || [];
    return {
        source: 'wikipedia',
        query,
        totalCount: data.query?.searchinfo?.totalhits ?? items.length,
        results: items.map((item) => ({
            title: item.title,
            pageId: item.pageid,
            snippet: stripHtml(item.snippet),
            sizeBytes: item.size,
            updatedAt: item.timestamp,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        })),
    };
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
}
