import { readFile as fsReadFile } from 'node:fs/promises';
import { walkRepo, loadGitignore } from './walk.js';

interface SymbolSearchInput {
    repoPath?: string;
    symbol: string;
    kind: 'any' | 'function' | 'class' | 'interface' | 'type' | 'const';
    maxResults: number;
}

interface ReferenceSearchInput {
    repoPath?: string;
    symbol: string;
    maxResults: number;
}

interface Hit {
    file: string;
    line: number;
    declaration: string;
    kind?: string;
}

function buildDefinitionRegexes(symbol: string, kind: string): Array<{ kind: string; re: RegExp }> {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const defs: Array<{ kind: string; re: RegExp }> = [];

    if (kind === 'any' || kind === 'function') {
        // TS/JS: function foo(, const foo = (, export const foo = (
        defs.push({ kind: 'function', re: new RegExp(`(?:function|const|let|var)\\s+${escaped}\\s*[=(]`) });
        // Python: def foo
        defs.push({ kind: 'function', re: new RegExp(`\\bdef\\s+${escaped}\\s*\\(`) });
        // Go: func foo( / func (x T) foo(
        defs.push({ kind: 'function', re: new RegExp(`\\bfunc\\s+(?:\\([^)]*\\)\\s+)?${escaped}\\s*\\(`) });
        // Rust: fn foo
        defs.push({ kind: 'function', re: new RegExp(`\\bfn\\s+${escaped}\\s*[(<]`) });
    }
    if (kind === 'any' || kind === 'class') {
        defs.push({ kind: 'class', re: new RegExp(`\\bclass\\s+${escaped}\\b`) });
    }
    if (kind === 'any' || kind === 'interface') {
        defs.push({ kind: 'interface', re: new RegExp(`\\binterface\\s+${escaped}\\b`) });
        defs.push({ kind: 'interface', re: new RegExp(`\\btrait\\s+${escaped}\\b`) });
    }
    if (kind === 'any' || kind === 'type') {
        defs.push({ kind: 'type', re: new RegExp(`\\btype\\s+${escaped}\\s*=`) });
        defs.push({ kind: 'type', re: new RegExp(`\\btype\\s+${escaped}\\s+(?:struct|interface)`) });
    }
    if (kind === 'any' || kind === 'const') {
        defs.push({ kind: 'const', re: new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\s*=`) });
    }

    return defs;
}

export async function findSymbol(input: SymbolSearchInput) {
    const root = input.repoPath || process.cwd();
    const gitignore = await loadGitignore(root);
    const files = await walkRepo(root, { gitignorePatterns: gitignore });

    const patterns = buildDefinitionRegexes(input.symbol, input.kind);
    const hits: Hit[] = [];

    for (const file of files) {
        if (hits.length >= input.maxResults) break;
        let text: string;
        try {
            text = await fsReadFile(file.absPath, 'utf-8');
        } catch {
            continue;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            for (const { kind, re } of patterns) {
                if (re.test(lines[i])) {
                    hits.push({
                        file: file.relPath,
                        line: i + 1,
                        declaration: lines[i].trim(),
                        kind,
                    });
                    break;
                }
            }
            if (hits.length >= input.maxResults) break;
        }
    }

    return {
        repoPath: root,
        symbol: input.symbol,
        kind: input.kind,
        totalHits: hits.length,
        hits,
    };
}

export async function findReferences(input: ReferenceSearchInput) {
    const root = input.repoPath || process.cwd();
    const gitignore = await loadGitignore(root);
    const files = await walkRepo(root, { gitignorePatterns: gitignore });

    const escaped = input.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`);
    const hits: Hit[] = [];

    for (const file of files) {
        if (hits.length >= input.maxResults) break;
        let text: string;
        try {
            text = await fsReadFile(file.absPath, 'utf-8');
        } catch {
            continue;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
                hits.push({
                    file: file.relPath,
                    line: i + 1,
                    declaration: lines[i].trim(),
                });
                if (hits.length >= input.maxResults) break;
            }
        }
    }

    return {
        repoPath: root,
        symbol: input.symbol,
        totalReferences: hits.length,
        references: hits,
    };
}
