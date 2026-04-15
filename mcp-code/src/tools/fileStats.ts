import { readFile as fsReadFile } from 'node:fs/promises';
import { walkRepo, loadGitignore } from './walk.js';

interface Input {
    repoPath?: string;
}

export async function fileStats(input: Input) {
    const root = input.repoPath || process.cwd();
    const gitignore = await loadGitignore(root);
    const files = await walkRepo(root, { gitignorePatterns: gitignore, maxFiles: 50_000 });

    let totalLines = 0;
    let totalBytes = 0;
    const byLanguage = new Map<string, { files: number; lines: number; bytes: number }>();
    const largestFiles: Array<{ path: string; bytes: number; lines: number; language: string | null }> = [];

    for (const file of files) {
        let lines = 0;
        try {
            const text = await fsReadFile(file.absPath, 'utf-8');
            lines = text.split(/\r?\n/).length;
        } catch {
            continue;
        }
        totalLines += lines;
        totalBytes += file.size;

        const lang = file.language || 'Other';
        const entry = byLanguage.get(lang) ?? { files: 0, lines: 0, bytes: 0 };
        entry.files += 1;
        entry.lines += lines;
        entry.bytes += file.size;
        byLanguage.set(lang, entry);

        largestFiles.push({
            path: file.relPath,
            bytes: file.size,
            lines,
            language: file.language,
        });
    }

    largestFiles.sort((a, b) => b.bytes - a.bytes);

    return {
        repoPath: root,
        totalFiles: files.length,
        totalLines,
        totalBytes,
        byLanguage: Array.from(byLanguage.entries())
            .map(([language, stats]) => ({ language, ...stats }))
            .sort((a, b) => b.lines - a.lines),
        top20LargestFiles: largestFiles.slice(0, 20),
    };
}
