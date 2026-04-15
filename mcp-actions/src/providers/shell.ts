/**
 * Safe shell command execution with allowlist.
 *
 * Disabled by default. To enable, set ATLAS_SHELL_ALLOWLIST env var to a
 * comma-separated list of command prefixes that are allowed to run:
 *
 *   ATLAS_SHELL_ALLOWLIST="git status,git diff,git log,npm test,ls,cat"
 *
 * Only commands whose trimmed form starts with an allowlist entry will run.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface ShellInput {
    command: string;
    cwd?: string;
    timeoutMs: number;
}

export async function runShellCommand(input: ShellInput) {
    const allowlistRaw = process.env.ATLAS_SHELL_ALLOWLIST;
    if (!allowlistRaw || !allowlistRaw.trim()) {
        throw new Error(
            'Shell execution is disabled. To enable, set ATLAS_SHELL_ALLOWLIST env var to a comma-separated list of allowed command prefixes.',
        );
    }

    const allowlist = allowlistRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const command = input.command.trim();
    const allowed = allowlist.some((prefix) => command === prefix || command.startsWith(prefix + ' '));

    if (!allowed) {
        throw new Error(
            `Command not in allowlist. Allowed prefixes: ${allowlist.join(', ')}. Got: ${command.split(' ')[0]}`,
        );
    }

    // Parse the command into argv
    const parts = command.split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);

    // eslint-disable-next-line no-console
    console.error(`[atlas-actions] shell: ${command} (cwd: ${input.cwd || process.cwd()})`);

    try {
        const { stdout, stderr } = await execFileAsync(bin, args, {
            cwd: input.cwd,
            timeout: input.timeoutMs,
            maxBuffer: 10 * 1024 * 1024,
            shell: process.platform === 'win32',
        });
        return {
            ok: true,
            command,
            stdout: String(stdout || ''),
            stderr: String(stderr || ''),
            exitCode: 0,
        };
    } catch (err: unknown) {
        const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
        return {
            ok: false,
            command,
            stdout: String(e.stdout || ''),
            stderr: String(e.stderr || e.message || ''),
            exitCode: e.code ?? -1,
        };
    }
}
