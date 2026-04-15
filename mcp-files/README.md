# atlas-mcp-files

**Sandboxed filesystem access for AI agents.** Let Claude, Cursor, Windsurf, or any MCP-compatible agent read, write, move, delete, and organize files — but only inside directories you explicitly allow.

Part of [Atlas](https://atlas-agent.dev) — infrastructure for AI agents.

## Why

Every MCP-powered agent eventually needs to work with files. Some agents have some filesystem access built in. Cursor does. Claude Desktop kind of does. Windsurf does. **None of them agree on the permission model, the path schema, or the safety rails.**

Atlas Files is a single, portable, allowlisted filesystem layer that behaves identically across every MCP client. Drop it in once and your agent gets the same file tools everywhere.

## Install

```json
{
  "mcpServers": {
    "atlas-files": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-files"],
      "env": {
        "ATLAS_FILES_ROOTS": "/Users/me/projects:/Users/me/notes"
      }
    }
  }
}
```

**`ATLAS_FILES_ROOTS` is the critical line.** It defines the only directories the agent is allowed to touch. Paths outside these roots are rejected even if the agent constructs them through `..` or symlinks.

On Windows, use `;` as the separator:

```json
"env": { "ATLAS_FILES_ROOTS": "C:\\Users\\me\\projects;C:\\Users\\me\\notes" }
```

## Read-only mode

To prevent any writes, set `ATLAS_FILES_READONLY=1`:

```json
"env": {
  "ATLAS_FILES_ROOTS": "/Users/me/notes",
  "ATLAS_FILES_READONLY": "1"
}
```

In read-only mode only `list_roots`, `list_directory`, `read_text_file`, and `stat_path` are exposed. All mutation tools are hidden from the tool list.

## Tools

### Always available (read-only tools)

| Tool | Purpose |
|------|---------|
| `list_roots` | Return the allowlisted directories |
| `list_directory` | List immediate children of a directory with type/size/mtime |
| `read_text_file` | Read a UTF-8 file (optionally a line range) |
| `stat_path` | Get metadata (type, size, mtime, ctime, mode) |

### Write tools (disabled in read-only mode)

| Tool | Purpose |
|------|---------|
| `write_text_file` | Create or overwrite a UTF-8 text file |
| `append_text_file` | Append to a text file |
| `delete_path` | Delete a file; directories require `recursive=true` |
| `move_path` | Rename/move a file or directory |
| `copy_path` | Copy a file or directory recursively |
| `create_directory` | `mkdir -p` a directory |

## Safety model

1. **Allowlisted roots.** `ATLAS_FILES_ROOTS` defines the only paths that can be accessed. Any input path is resolved and must fall inside at least one root.
2. **Symlink resolution.** Before reading or writing, the server calls `realpath` on the target and re-checks that the resolved path is inside a root. This blocks `ln -s / ~/notes/root` escape attempts.
3. **10MB read cap.** Files larger than 10MB are rejected — use a line range or stream via a different tool.
4. **Directory deletes are opt-in.** `delete_path` refuses to delete a directory unless `recursive=true` is explicitly passed.
5. **Overwrite is opt-in.** `write_text_file` overwrites by default, but `move_path` and `copy_path` refuse to overwrite existing destinations unless `overwrite=true`.

## License

MIT
