/**
 * Shared: directory walk with .gitignore support and language detection.
 */

import { readFile as fsReadFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DEFAULT_IGNORES = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.turbo',
    '.cache',
    'coverage',
    '.vercel',
    '__pycache__',
    '.venv',
    'venv',
    'target',
    '.idea',
    '.vscode',
]);

const BINARY_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
    '.mp3', '.mp4', '.mov', '.avi', '.wav',
    '.ttf', '.woff', '.woff2', '.eot', '.otf',
    '.exe', '.dll', '.so', '.dylib',
    '.db', '.sqlite', '.sqlite3',
    '.lock',
]);

export const LANGUAGE_BY_EXT: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.py': 'Python',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.swift': 'Swift',
    '.c': 'C',
    '.h': 'C',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.hpp': 'C++',
    '.cs': 'C#',
    '.php': 'PHP',
    '.scala': 'Scala',
    '.ex': 'Elixir',
    '.exs': 'Elixir',
    '.elm': 'Elm',
    '.hs': 'Haskell',
    '.clj': 'Clojure',
    '.sh': 'Shell',
    '.bash': 'Shell',
    '.zsh': 'Shell',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.md': 'Markdown',
    '.mdx': 'Markdown',
    '.sql': 'SQL',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
};

export interface FileEntry {
    absPath: string;
    relPath: string;
    size: number;
    extension: string;
    language: string | null;
}

interface WalkOptions {
    maxFiles?: number;
    gitignorePatterns?: string[];
}

export async function walkRepo(root: string, options: WalkOptions = {}): Promise<FileEntry[]> {
    const maxFiles = options.maxFiles ?? 10_000;
    const ignoreMatchers = buildIgnoreMatchers(options.gitignorePatterns || []);
    const results: FileEntry[] = [];

    async function recurse(dir: string): Promise<void> {
        if (results.length >= maxFiles) return;
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (results.length >= maxFiles) return;
            if (DEFAULT_IGNORES.has(entry.name)) continue;
            const absPath = join(dir, entry.name);
            const relPath = relative(root, absPath).split(sep).join('/');
            if (matchesIgnore(relPath, ignoreMatchers)) continue;
            if (entry.isDirectory()) {
                await recurse(absPath);
            } else if (entry.isFile()) {
                const ext = extname(entry.name).toLowerCase();
                if (BINARY_EXT.has(ext)) continue;
                try {
                    const s = await stat(absPath);
                    if (s.size > 5 * 1024 * 1024) continue; // skip files > 5MB
                    results.push({
                        absPath,
                        relPath,
                        size: s.size,
                        extension: ext,
                        language: LANGUAGE_BY_EXT[ext] ?? null,
                    });
                } catch {
                    /* ignore unreadable files */
                }
            }
        }
    }

    await recurse(root);
    return results;
}

export async function loadGitignore(root: string): Promise<string[]> {
    try {
        const text = await fsReadFile(join(root, '.gitignore'), 'utf-8');
        return text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#'));
    } catch {
        return [];
    }
}

function extname(name: string): string {
    const i = name.lastIndexOf('.');
    if (i <= 0) return '';
    return name.slice(i);
}

function buildIgnoreMatchers(patterns: string[]): RegExp[] {
    const out: RegExp[] = [];
    for (const p of patterns) {
        let pattern = p.startsWith('/') ? p.slice(1) : p;
        pattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
        // Convert glob to regex (simple support for *, **, ?)
        let re = '^';
        let i = 0;
        while (i < pattern.length) {
            const ch = pattern[i];
            if (ch === '*' && pattern[i + 1] === '*') {
                re += '.*';
                i += 2;
                if (pattern[i] === '/') i += 1;
            } else if (ch === '*') {
                re += '[^/]*';
                i += 1;
            } else if (ch === '?') {
                re += '.';
                i += 1;
            } else if ('+^$.(){}|\\[]'.includes(ch)) {
                re += '\\' + ch;
                i += 1;
            } else {
                re += ch;
                i += 1;
            }
        }
        re += '(?:$|/)';
        try {
            out.push(new RegExp(re));
        } catch {
            /* skip bad pattern */
        }
    }
    return out;
}

function matchesIgnore(relPath: string, matchers: RegExp[]): boolean {
    return matchers.some((re) => re.test(relPath));
}

export function matchesGlob(relPath: string, glob: string | undefined): boolean {
    if (!glob) return true;
    let re = '^';
    let i = 0;
    while (i < glob.length) {
        const ch = glob[i];
        if (ch === '*' && glob[i + 1] === '*') {
            re += '.*';
            i += 2;
            if (glob[i] === '/') i += 1;
        } else if (ch === '*') {
            re += '[^/]*';
            i += 1;
        } else if (ch === '?') {
            re += '.';
            i += 1;
        } else if ('+^$.(){}|\\[]'.includes(ch)) {
            re += '\\' + ch;
            i += 1;
        } else {
            re += ch;
            i += 1;
        }
    }
    re += '$';
    try {
        return new RegExp(re).test(relPath);
    } catch {
        return true;
    }
}
