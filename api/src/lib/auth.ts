/**
 * Simple in-memory rate limiter and tier management.
 *
 * In production this would be backed by Redis and a real database, but for
 * the MVP this gets us the 80/20: enforce limits by API key, track usage,
 * return rate limit headers.
 */

export type Tier = 'free' | 'pro' | 'enterprise';

export interface ApiKey {
    token: string | null;
    tier: Tier;
}

const LIMITS: Record<Tier, number> = {
    free: 100,
    pro: 10_000,
    enterprise: 1_000_000,
};

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DAY_MS = 24 * 60 * 60 * 1000;

export function rateLimit(
    clientId: string,
    tier: Tier,
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
    const limit = LIMITS[tier];
    const now = Date.now();
    const key = `${tier}:${clientId}`;

    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + DAY_MS };
        buckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
        return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
    }

    bucket.count += 1;
    return {
        allowed: true,
        limit,
        remaining: limit - bucket.count,
        resetAt: bucket.resetAt,
    };
}

export function getUsage(clientId: string, tier: Tier) {
    const limit = LIMITS[tier];
    const bucket = buckets.get(`${tier}:${clientId}`);
    if (!bucket) {
        return { tier, limit, used: 0, remaining: limit, resetAt: null };
    }
    return {
        tier,
        limit,
        used: bucket.count,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: new Date(bucket.resetAt).toISOString(),
    };
}
