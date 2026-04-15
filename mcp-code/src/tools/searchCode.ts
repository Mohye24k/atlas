import { readFile } from 'node:fs/promises';
import { walkRepo, loadGitignore, matchesGlob } from './walk.js';

interface Input {
    repoPath?: string;
    pattern: string;
    glob?: string;
    caseInsensitive: boolean;
    contextLines: number;
    maxResults: number;
}

interface Match {
    file: string;
    line: number;
    text: string;
    context: { before: string[]; after: string[] };
}

export async function searchCode(input: Input) {
    const root = input.repoPath || process.cwd();
    const gitignore = await loadGitignore(root);
    const files = await walkRepo(root, { gitignorePatterns: gitignore });
    const filtered = files.filter((f) => matchesGlob(f.relPath, input.glob));

    let re: RegExp;
    try {
        re = new RegExp(input.pattern, input.caseInsensitive ? 'i' : '');
    } catch (err) {
        throw new Error(`Invalid regex: ${(err as Error).message}`);
    }

    const matches: Match[] = [];
    const startedAt = Date.now();

    for (const file of filtered) {
        if (matches.length >= input.maxResults) break;
        let text: string;
        try {
            text = await readFile(file.absPath, 'utf-8');
        } catch {
            continue;
        }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            if (matches.length >= input.maxResults) break;
            if (re.test(lines[i])) {
                matches.push({
                    file: file.relPath,
                    line: i + 1,
                    text: lines[i],
                    context: {
                        before: lines.slice(Math.max(0, i - input.contextLines), i),
                        after: lines.slice(i + 1, i + 1 + input.contextLines),
                    },
                });
            }
        }
    }

    return {
        repoPath: root,
        pattern: input.pattern,
        totalMatches: matches.length,
        filesSearched: filtered.length,
        elapsedMs: Date.now() - startedAt,
        matches,
    };
}
