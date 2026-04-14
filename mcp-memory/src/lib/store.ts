/**
 * Atlas Memory store — SQLite-backed persistent memory for AI agents.
 *
 * Uses Node.js built-in `node:sqlite` (available in Node 22.5+). Zero native
 * compilation needed — SQLite ships with Node itself.
 *
 * Features:
 *   - Each memory has: id, content, tags, importance (1-5), createdAt, updatedAt
 *   - FTS5 virtual table for fast full-text search
 *   - Tag filtering
 *   - Importance-weighted retrieval
 *   - Access tracking (last accessed / access count) for smart pruning
 *   - Namespaces (work / personal / per-project)
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface Memory {
    id: string;
    namespace: string;
    content: string;
    tags: string[];
    importance: number;
    createdAt: string;
    updatedAt: string;
    accessedAt: string | null;
    accessCount: number;
}

export interface NewMemory {
    content: string;
    namespace?: string;
    tags?: string[];
    importance?: number;
}

interface RawMemory {
    id: string;
    namespace: string;
    content: string;
    tags: string;
    importance: number;
    created_at: string;
    updated_at: string;
    accessed_at: string | null;
    access_count: number;
}

export class MemoryStore {
    private db: InstanceType<typeof DatabaseSync>;

    constructor(dbPath: string) {
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new DatabaseSync(dbPath);
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA synchronous = NORMAL;');
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                namespace TEXT NOT NULL DEFAULT 'default',
                content TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '[]',
                importance INTEGER NOT NULL DEFAULT 3,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                accessed_at TEXT,
                access_count INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_memories_namespace ON memories(namespace);
            CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at DESC);

            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
                id UNINDEXED,
                content,
                tags,
                tokenize = 'porter unicode61'
            );

            CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
                INSERT INTO memories_fts(id, content, tags) VALUES (new.id, new.content, new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
                DELETE FROM memories_fts WHERE id = old.id;
            END;

            CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
                UPDATE memories_fts SET content = new.content, tags = new.tags WHERE id = new.id;
            END;
        `);
    }

    remember(input: NewMemory): Memory {
        const id = randomUUID();
        const now = new Date().toISOString();
        const namespace = input.namespace || 'default';
        const tags = Array.isArray(input.tags) ? input.tags : [];
        const importance = clampImportance(input.importance);

        this.db
            .prepare(
                `INSERT INTO memories (id, namespace, content, tags, importance, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(id, namespace, input.content, JSON.stringify(tags), importance, now, now);

        return {
            id,
            namespace,
            content: input.content,
            tags,
            importance,
            createdAt: now,
            updatedAt: now,
            accessedAt: null,
            accessCount: 0,
        };
    }

    recall(query: {
        text?: string;
        tags?: string[];
        namespace?: string;
        minImportance?: number;
        limit?: number;
    }): Memory[] {
        const limit = Math.max(1, Math.min(query.limit ?? 20, 200));
        const namespace = query.namespace || 'default';
        const minImportance = query.minImportance ?? 1;

        let ids: string[] = [];

        if (query.text && query.text.trim()) {
            const sanitized = query.text.trim().replace(/"/g, '""');
            const ftsQuery = sanitized
                .split(/\s+/)
                .filter(Boolean)
                .map((t) => `"${t}"`)
                .join(' OR ');
            const rows = this.db
                .prepare(
                    `SELECT id FROM memories_fts WHERE memories_fts MATCH ? ORDER BY rank LIMIT 500`,
                )
                .all(ftsQuery) as Array<{ id: string }>;
            ids = rows.map((r) => r.id);
            if (ids.length === 0) return [];
        }

        const placeholders = ids.length ? `AND m.id IN (${ids.map(() => '?').join(',')})` : '';
        const sql = `
            SELECT * FROM memories m
            WHERE m.namespace = ?
              AND m.importance >= ?
              ${placeholders}
            ORDER BY m.importance DESC, m.updated_at DESC
            LIMIT ?
        `;
        const params: Array<string | number> = [namespace, minImportance, ...ids, limit];
        const rows = this.db.prepare(sql).all(...params) as unknown as RawMemory[];

        let results = rows.map(rowToMemory);
        if (query.tags && query.tags.length) {
            const wanted = new Set(query.tags.map((t) => t.toLowerCase()));
            results = results.filter((m) => m.tags.some((tag) => wanted.has(tag.toLowerCase())));
        }

        // Mark as accessed
        if (results.length > 0) {
            const now = new Date().toISOString();
            const stmt = this.db.prepare(
                `UPDATE memories SET accessed_at = ?, access_count = access_count + 1 WHERE id = ?`,
            );
            for (const m of results) stmt.run(now, m.id);
        }

        return results;
    }

    update(
        id: string,
        patch: Partial<Pick<Memory, 'content' | 'tags' | 'importance'>>,
    ): Memory | null {
        const existing = this.db.prepare(`SELECT * FROM memories WHERE id = ?`).get(id) as
            | RawMemory
            | undefined;
        if (!existing) return null;

        const content = patch.content ?? existing.content;
        const tags = patch.tags ? JSON.stringify(patch.tags) : existing.tags;
        const importance =
            patch.importance !== undefined ? clampImportance(patch.importance) : existing.importance;
        const now = new Date().toISOString();

        this.db
            .prepare(
                `UPDATE memories SET content = ?, tags = ?, importance = ?, updated_at = ? WHERE id = ?`,
            )
            .run(content, tags, importance, now, id);

        return rowToMemory({ ...existing, content, tags, importance, updated_at: now });
    }

    forget(id: string): boolean {
        const result = this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
        return Number(result.changes) > 0;
    }

    list(namespace: string = 'default', limit: number = 50): Memory[] {
        const rows = this.db
            .prepare(
                `SELECT * FROM memories WHERE namespace = ? ORDER BY importance DESC, updated_at DESC LIMIT ?`,
            )
            .all(namespace, Math.max(1, Math.min(limit, 500))) as unknown as RawMemory[];
        return rows.map(rowToMemory);
    }

    stats(): {
        totalMemories: number;
        namespaces: Array<{ namespace: string; count: number }>;
        topTags: Array<{ tag: string; count: number }>;
    } {
        const total = (this.db.prepare(`SELECT COUNT(*) as c FROM memories`).get() as { c: number }).c;
        const nsRows = this.db
            .prepare(
                `SELECT namespace, COUNT(*) as count FROM memories GROUP BY namespace ORDER BY count DESC`,
            )
            .all() as Array<{ namespace: string; count: number }>;

        const tagCounts = new Map<string, number>();
        const allRows = this.db.prepare(`SELECT tags FROM memories`).all() as Array<{ tags: string }>;
        for (const row of allRows) {
            try {
                const tags = JSON.parse(row.tags) as string[];
                for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            } catch {
                /* ignore */
            }
        }
        const topTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));

        return { totalMemories: total, namespaces: nsRows, topTags };
    }

    namespaces(): string[] {
        const rows = this.db
            .prepare(`SELECT DISTINCT namespace FROM memories ORDER BY namespace`)
            .all() as Array<{ namespace: string }>;
        return rows.map((r) => r.namespace);
    }

    close() {
        this.db.close();
    }
}

function rowToMemory(row: RawMemory): Memory {
    let tags: string[] = [];
    try {
        tags = JSON.parse(row.tags);
    } catch {
        /* ignore */
    }
    return {
        id: row.id,
        namespace: row.namespace,
        content: row.content,
        tags,
        importance: row.importance,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        accessedAt: row.accessed_at,
        accessCount: row.access_count,
    };
}

function clampImportance(value: number | undefined): number {
    const n = Math.round(Number(value ?? 3));
    if (!Number.isFinite(n)) return 3;
    return Math.max(1, Math.min(5, n));
}
