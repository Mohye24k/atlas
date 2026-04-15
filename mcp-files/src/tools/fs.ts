/**
 * Sandboxed filesystem operations.
 *
 * Every path is resolved against ATLAS_FILES_ROOTS. Any attempt to escape
 * via ../, absolute paths outside the allowlist, or symlinks that point
 * outside is rejected.
 */

import {
    readFile as fsReadFile,
    writeFile as fsWriteFile,
    appendFile as fsAppendFile,
    readdir,
    stat,
    mkdir,
    rm,
    rename,
    cp,
    realpath,
} from 'node:fs/promises';
import { resolve, isAbsolute, join, sep, normalize } from 'node:path';
import { platform } from 'node:os';

// ── Root discovery ───────────────────────────────────────────────────────────

function getRootsFromEnv(): string[] {
    const raw = process.env.ATLAS_FILES_ROOTS;
    if (!raw || !raw.trim()) return [process.cwd()];
    // Split on ; for Windows, : elsewhere (but both work on both platforms)
    const separator = platform() === 'win32' ? ';' : ':';
    return raw
        .split(separator)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => resolve(p));
}

const ROOTS = getRootsFromEnv();

export function isReadOnly(): boolean {
    return process.env.ATLAS_FILES_READONLY === '1';
}

// ── Sandbox resolution ──────────────────────────────────────────────────────

async function resolveWithinSandbox(inputPath: string): Promise<string> {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('path is required');
    }

    // If user passes a relative path, resolve against the first root
    let abs = isAbsolute(inputPath) ? resolve(inputPath) : resolve(ROOTS[0], inputPath);

    // Normalize to remove any .. segments
    abs = normalize(abs);

    // Check that it's inside one of the allowlisted roots
    const inRoot = ROOTS.some((root) => {
        const normRoot = normalize(root);
        return abs === normRoot || abs.startsWith(normRoot + sep);
    });

    if (!inRoot) {
        throw new Error(
            `path is outside the allowlisted roots. Allowed: ${ROOTS.join(', ')}. Attempted: ${abs}`,
        );
    }

    // If the path exists, resolve symlinks and re-check
    try {
        const real = await realpath(abs);
        const realInRoot = ROOTS.some((root) => {
            const normRoot = normalize(root);
            return real === normRoot || real.startsWith(normRoot + sep);
        });
        if (!realInRoot) {
            throw new Error(
                `path resolves (via symlink) to ${real}, which is outside the allowlisted roots`,
            );
        }
        return real;
    } catch (err: unknown) {
        // File doesn't exist yet — that's OK for write operations
        if ((err as { code?: string }).code === 'ENOENT') return abs;
        throw err;
    }
}

// ── Tool implementations ────────────────────────────────────────────────────

export async function listRoots() {
    return {
        roots: ROOTS,
        readOnly: isReadOnly(),
    };
}

export async function listDirectory(inputPath: string, includeHidden: boolean) {
    const abs = await resolveWithinSandbox(inputPath);
    const entries = await readdir(abs, { withFileTypes: true });
    const items: Array<{
        name: string;
        type: 'file' | 'directory' | 'other';
        sizeBytes?: number;
        modifiedAt?: string;
    }> = [];

    for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith('.')) continue;
        let type: 'file' | 'directory' | 'other' = 'other';
        if (entry.isFile()) type = 'file';
        else if (entry.isDirectory()) type = 'directory';

        const item: (typeof items)[number] = { name: entry.name, type };
        if (type === 'file') {
            try {
                const s = await stat(join(abs, entry.name));
                item.sizeBytes = s.size;
                item.modifiedAt = s.mtime.toISOString();
            } catch {
                /* ignore */
            }
        }
        items.push(item);
    }

    items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return {
        path: abs,
        count: items.length,
        entries: items,
    };
}

export async function readTextFile(inputPath: string, startLine?: number, endLine?: number) {
    const abs = await resolveWithinSandbox(inputPath);
    const s = await stat(abs);
    if (!s.isFile()) throw new Error(`not a file: ${abs}`);
    if (s.size > 10 * 1024 * 1024) {
        throw new Error(`file too large (${s.size} bytes, limit 10MB). Use a line range.`);
    }

    const text = await fsReadFile(abs, 'utf-8');
    const lines = text.split(/\r?\n/);
    const start = startLine ? Math.max(1, startLine) : 1;
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;
    const slice = lines.slice(start - 1, end);

    return {
        path: abs,
        sizeBytes: s.size,
        totalLines: lines.length,
        range: { startLine: start, endLine: end },
        content: slice.join('\n'),
    };
}

export async function writeTextFile(inputPath: string, content: string, createParents: boolean) {
    const abs = await resolveWithinSandbox(inputPath);
    if (createParents) {
        const parent = abs.slice(0, abs.lastIndexOf(sep));
        if (parent) await mkdir(parent, { recursive: true });
    }
    await fsWriteFile(abs, content, 'utf-8');
    const s = await stat(abs);
    return { ok: true, path: abs, bytesWritten: s.size };
}

export async function appendTextFile(inputPath: string, content: string) {
    const abs = await resolveWithinSandbox(inputPath);
    await fsAppendFile(abs, content, 'utf-8');
    const s = await stat(abs);
    return { ok: true, path: abs, sizeBytes: s.size };
}

export async function deletePath(inputPath: string, recursive: boolean) {
    const abs = await resolveWithinSandbox(inputPath);
    const s = await stat(abs);
    if (s.isDirectory() && !recursive) {
        throw new Error(`${abs} is a directory. Pass recursive=true to delete it.`);
    }
    await rm(abs, { recursive, force: false });
    return { ok: true, deleted: abs };
}

export async function movePath(from: string, to: string, overwrite: boolean) {
    const absFrom = await resolveWithinSandbox(from);
    const absTo = await resolveWithinSandbox(to);
    if (!overwrite) {
        try {
            await stat(absTo);
            throw new Error(`destination already exists: ${absTo}. Pass overwrite=true to replace.`);
        } catch (err: unknown) {
            if ((err as { code?: string }).code !== 'ENOENT') throw err;
        }
    }
    await rename(absFrom, absTo);
    return { ok: true, from: absFrom, to: absTo };
}

export async function copyPath(from: string, to: string, overwrite: boolean) {
    const absFrom = await resolveWithinSandbox(from);
    const absTo = await resolveWithinSandbox(to);
    await cp(absFrom, absTo, { recursive: true, force: overwrite, errorOnExist: !overwrite });
    return { ok: true, from: absFrom, to: absTo };
}

export async function createDirectory(inputPath: string, recursive: boolean) {
    const abs = await resolveWithinSandbox(inputPath);
    await mkdir(abs, { recursive });
    return { ok: true, path: abs };
}

export async function statPath(inputPath: string) {
    const abs = await resolveWithinSandbox(inputPath);
    const s = await stat(abs);
    return {
        path: abs,
        type: s.isFile() ? 'file' : s.isDirectory() ? 'directory' : 'other',
        sizeBytes: s.size,
        createdAt: s.birthtime.toISOString(),
        modifiedAt: s.mtime.toISOString(),
        accessedAt: s.atime.toISOString(),
        mode: s.mode,
    };
}
