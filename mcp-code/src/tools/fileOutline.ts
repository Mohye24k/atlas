/**
 * Extract top-level structure from source files.
 * Heuristic regex-based — fast, no AST parser required, works across languages.
 */

import { readFile as fsReadFile } from 'node:fs/promises';

interface Input {
    filePath: string;
}

interface OutlineItem {
    kind: string;
    name: string;
    line: number;
    exported: boolean;
    signature?: string;
}

const PATTERNS_BY_EXT: Record<string, Array<{ kind: string; re: RegExp }>> = {
    ts: [
        { kind: 'import', re: /^\s*import\s+(?:\*\s+as\s+\w+|\{[^}]*\}|\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]([^'"]+)['"]/ },
        { kind: 'export', re: /^\s*export\s+\*\s+from\s+['"]([^'"]+)['"]/ },
        { kind: 'function', re: /^\s*(export\s+)?(?:async\s+)?function\s+(\w+)\s*(\([^)]*\))/ },
        { kind: 'class', re: /^\s*(export\s+)?(?:abstract\s+)?class\s+(\w+)/ },
        { kind: 'interface', re: /^\s*(export\s+)?interface\s+(\w+)/ },
        { kind: 'type', re: /^\s*(export\s+)?type\s+(\w+)\s*=/ },
        { kind: 'const', re: /^\s*(export\s+)?const\s+(\w+)/ },
        { kind: 'enum', re: /^\s*(export\s+)?enum\s+(\w+)/ },
    ],
    py: [
        { kind: 'import', re: /^\s*(?:from\s+(\S+)\s+)?import\s+(.+)/ },
        { kind: 'function', re: /^\s*(?:async\s+)?def\s+(\w+)\s*(\([^)]*\))/ },
        { kind: 'class', re: /^\s*class\s+(\w+)/ },
    ],
    go: [
        { kind: 'import', re: /^\s*import\s+"([^"]+)"/ },
        { kind: 'function', re: /^\s*func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*(\([^)]*\))/ },
        { kind: 'type', re: /^\s*type\s+(\w+)\s+(?:struct|interface)/ },
    ],
    rs: [
        { kind: 'function', re: /^\s*(pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(<[^>]*>)?\s*(\([^)]*\))/ },
        { kind: 'struct', re: /^\s*(pub\s+)?struct\s+(\w+)/ },
        { kind: 'enum', re: /^\s*(pub\s+)?enum\s+(\w+)/ },
        { kind: 'trait', re: /^\s*(pub\s+)?trait\s+(\w+)/ },
        { kind: 'impl', re: /^\s*impl(?:<[^>]*>)?\s+(\w+)/ },
    ],
    java: [
        { kind: 'class', re: /^\s*(?:public|private|protected)?\s*(?:abstract\s+|final\s+)?class\s+(\w+)/ },
        { kind: 'interface', re: /^\s*(?:public|private|protected)?\s*interface\s+(\w+)/ },
    ],
};

function getPatternKey(ext: string): string | null {
    const e = ext.toLowerCase().replace(/^\./, '');
    if (e === 'ts' || e === 'tsx' || e === 'js' || e === 'jsx' || e === 'mjs' || e === 'cjs') return 'ts';
    if (e === 'py') return 'py';
    if (e === 'go') return 'go';
    if (e === 'rs') return 'rs';
    if (e === 'java' || e === 'kt') return 'java';
    return null;
}

export async function fileOutline(input: Input) {
    const text = await fsReadFile(input.filePath, 'utf-8');
    const lines = text.split(/\r?\n/);

    const ext = input.filePath.slice(input.filePath.lastIndexOf('.'));
    const key = getPatternKey(ext);
    if (!key) {
        return {
            filePath: input.filePath,
            supported: false,
            totalLines: lines.length,
            message: 'Language not supported for outline extraction. Supported: .ts .tsx .js .jsx .py .go .rs .java .kt',
        };
    }

    const patterns = PATTERNS_BY_EXT[key];
    const items: OutlineItem[] = [];

    lines.forEach((line, idx) => {
        for (const { kind, re } of patterns) {
            const m = line.match(re);
            if (!m) continue;
            if (kind === 'import') {
                items.push({
                    kind,
                    name: m[1] || m[2] || line.trim(),
                    line: idx + 1,
                    exported: false,
                });
                return;
            }
            const exported = /^\s*(export|pub)\s/.test(line);
            const name = m[2] || m[1];
            if (!name || name === 'export' || name === 'pub') continue;
            items.push({
                kind,
                name,
                line: idx + 1,
                exported,
                signature: line.trim(),
            });
            return;
        }
    });

    return {
        filePath: input.filePath,
        totalLines: lines.length,
        language: key,
        imports: items.filter((i) => i.kind === 'import'),
        exports: items.filter((i) => i.kind !== 'import'),
    };
}
