/**
 * Hacker News search via Algolia HN Search API (no auth, free).
 */

export async function searchHackerNews(query: string, limit: number) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=${Math.min(limit, 50)}&tags=story`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Atlas-MCP-Search/0.1' } });
    if (!res.ok) throw new Error(`HN search failed: ${res.status}`);

    const data = (await res.json()) as {
        hits: Array<{
            objectID: string;
            title?: string;
            url?: string;
            author?: string;
            points?: number;
            num_comments?: number;
            created_at?: string;
            story_text?: string;
        }>;
        nbHits: number;
    };

    return {
        source: 'hackernews',
        query,
        totalCount: data.nbHits,
        results: data.hits.map((h) => ({
            id: h.objectID,
            title: h.title,
            url: h.url,
            hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
            author: h.author,
            points: h.points,
            commentCount: h.num_comments,
            createdAt: h.created_at,
        })),
    };
}
