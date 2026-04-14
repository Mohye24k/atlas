/**
 * GitHub search via the public REST API.
 * Rate limited to 10/min unauthenticated, 30/min with a token — no token required.
 */

const UA = 'Atlas-MCP-Search/0.1';

export async function searchGithub(
    query: string,
    kind: 'repositories' | 'code' | 'users',
    limit: number,
) {
    const url = `https://api.github.com/search/${kind}?q=${encodeURIComponent(query)}&per_page=${Math.min(limit, 50)}`;
    const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
    });

    if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
            throw new Error(
                'GitHub rate limit exceeded (unauthenticated limit is 10 req/min). Try again in a minute or provide a GITHUB_TOKEN env var.',
            );
        }
        throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
        total_count: number;
        items: Array<Record<string, unknown>>;
    };

    if (kind === 'repositories') {
        return {
            source: 'github',
            kind,
            query,
            totalCount: data.total_count,
            results: data.items.map((r) => ({
                name: r.full_name,
                url: r.html_url,
                description: r.description,
                stars: r.stargazers_count,
                forks: r.forks_count,
                language: r.language,
                topics: r.topics,
                updatedAt: r.updated_at,
                owner: (r.owner as { login?: string })?.login,
            })),
        };
    }

    if (kind === 'code') {
        return {
            source: 'github',
            kind,
            query,
            totalCount: data.total_count,
            results: data.items.map((r) => ({
                name: r.name,
                path: r.path,
                url: r.html_url,
                repository: (r.repository as { full_name?: string })?.full_name,
            })),
        };
    }

    // users
    return {
        source: 'github',
        kind,
        query,
        totalCount: data.total_count,
        results: data.items.map((r) => ({
            login: r.login,
            url: r.html_url,
            avatarUrl: r.avatar_url,
            type: r.type,
        })),
    };
}
