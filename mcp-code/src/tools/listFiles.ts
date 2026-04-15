import { walkRepo, loadGitignore, matchesGlob, LANGUAGE_BY_EXT } from './walk.js';

interface Input {
    repoPath?: string;
    glob?: string;
    maxFiles: number;
}

export async function listFiles(input: Input) {
    const root = input.repoPath || process.cwd();
    const gitignore = await loadGitignore(root);
    const files = await walkRepo(root, { maxFiles: input.maxFiles, gitignorePatterns: gitignore });

    const filtered = files.filter((f) => matchesGlob(f.relPath, input.glob));
    const byLanguage = new Map<string, { count: number; totalBytes: number }>();
    for (const f of filtered) {
        const lang = f.language || 'Other';
        const entry = byLanguage.get(lang) ?? { count: 0, totalBytes: 0 };
        entry.count += 1;
        entry.totalBytes += f.size;
        byLanguage.set(lang, entry);
    }

    return {
        repoPath: root,
        totalFiles: filtered.length,
        byLanguage: Array.from(byLanguage.entries())
            .map(([language, stats]) => ({ language, ...stats }))
            .sort((a, b) => b.count - a.count),
        files: filtered.slice(0, input.maxFiles).map((f) => ({
            path: f.relPath,
            sizeBytes: f.size,
            language: f.language,
        })),
        supportedLanguages: Object.values(LANGUAGE_BY_EXT).filter((v, i, a) => a.indexOf(v) === i),
    };
}
