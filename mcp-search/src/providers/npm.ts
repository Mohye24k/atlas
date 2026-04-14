/**
 * npm registry search via the official public search endpoint.
 */

export async function searchNpm(query: string, limit: number) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${Math.min(limit, 50)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Atlas-MCP-Search/0.1' } });
    if (!res.ok) throw new Error(`npm search failed: ${res.status}`);

    const data = (await res.json()) as {
        total: number;
        objects: Array<{
            package: {
                name: string;
                version: string;
                description?: string;
                keywords?: string[];
                date?: string;
                links?: { npm?: string; homepage?: string; repository?: string };
                publisher?: { username?: string };
            };
            score?: { final?: number; detail?: { quality?: number; popularity?: number; maintenance?: number } };
        }>;
    };

    return {
        source: 'npm',
        query,
        totalCount: data.total,
        results: data.objects.map((o) => ({
            name: o.package.name,
            version: o.package.version,
            description: o.package.description,
            keywords: o.package.keywords,
            publishedAt: o.package.date,
            publisher: o.package.publisher?.username,
            npmUrl: o.package.links?.npm,
            homepage: o.package.links?.homepage,
            repository: o.package.links?.repository,
            score: o.score?.final,
        })),
    };
}
