/**
 * Stack Overflow via StackExchange API 2.3. No auth required for basic search
 * (quota of 300 requests/day per IP without a key).
 */

export async function searchStackOverflow(query: string, limit: number) {
    const url =
        `https://api.stackexchange.com/2.3/search/advanced` +
        `?order=desc&sort=relevance&site=stackoverflow&pagesize=${Math.min(limit, 100)}` +
        `&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { headers: { 'User-Agent': 'Atlas-MCP-Search/0.1' } });
    if (!res.ok) throw new Error(`StackOverflow search failed: ${res.status}`);

    const data = (await res.json()) as {
        items: Array<{
            question_id: number;
            title: string;
            link: string;
            tags: string[];
            score: number;
            answer_count: number;
            is_answered: boolean;
            creation_date: number;
            view_count: number;
            owner?: { display_name?: string };
        }>;
        quota_remaining?: number;
    };

    return {
        source: 'stackoverflow',
        query,
        quotaRemaining: data.quota_remaining,
        results: data.items.map((q) => ({
            id: q.question_id,
            title: decode(q.title),
            url: q.link,
            tags: q.tags,
            score: q.score,
            answerCount: q.answer_count,
            isAnswered: q.is_answered,
            viewCount: q.view_count,
            askedAt: new Date(q.creation_date * 1000).toISOString(),
            asker: q.owner?.display_name,
        })),
    };
}

function decode(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
