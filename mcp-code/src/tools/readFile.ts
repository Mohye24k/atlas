import { readFile as fsReadFile, stat } from 'node:fs/promises';

interface Input {
    filePath: string;
    startLine?: number;
    endLine?: number;
}

export async function readFile(input: Input) {
    const s = await stat(input.filePath);
    if (!s.isFile()) throw new Error('not a regular file');
    if (s.size > 10 * 1024 * 1024) {
        throw new Error(`file too large (${s.size} bytes, limit 10MB)`);
    }

    const text = await fsReadFile(input.filePath, 'utf-8');
    const lines = text.split(/\r?\n/);

    const start = input.startLine ? Math.max(1, input.startLine) : 1;
    const end = input.endLine ? Math.min(lines.length, input.endLine) : lines.length;
    const slice = lines.slice(start - 1, end);

    return {
        filePath: input.filePath,
        totalLines: lines.length,
        sizeBytes: s.size,
        range: { startLine: start, endLine: end },
        content: slice.join('\n'),
    };
}
