# atlas-mcp-code

**Repo intelligence for coding agents.** A Model Context Protocol server that gives Claude, Cursor, Windsurf and any AI coding agent the ability to search, navigate, and understand any local codebase — fast.

Part of [Atlas](https://atlas-agent.dev) — infrastructure for AI agents.

## Tools

- `list_files` — List all source files grouped by language, respects .gitignore
- `search_code` — Fast regex search with context lines and glob filtering
- `read_file` — Read a file (optionally with line range)
- `file_outline` — Extract imports, functions, classes, types from any source file (TS/JS/Py/Go/Rust/Java)
- `find_symbol` — Find where a symbol is defined across the repo
- `find_references` — Find every place a symbol is used
- `file_stats` — Repo-wide statistics: language breakdown, line counts, largest files

## Why

Claude, Cursor, and Windsurf all have *some* code intelligence built in. It's different for each. It's rarely consistent. And when you ask "find every caller of this function," each tool has a different level of success.

Atlas Code gives you a single, portable, zero-config code intelligence layer that works identically across every MCP client. Drop it in once — every agent gets the same superpowers.

## Install

```json
{
  "mcpServers": {
    "atlas-code": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-code"]
    }
  }
}
```

No configuration needed. The server defaults to the current working directory of your MCP client. You can also pass a `repoPath` argument to every tool to target a different repo.

## Design choices

- **No AST parser dependency.** Regex-based outline extraction is "good enough" for 95% of agent use cases, and it's 100× faster. If you need true semantic analysis, pair this with a language server.
- **Respects .gitignore.** Skips `node_modules`, `dist`, `.next`, `__pycache__`, and all your custom ignore patterns automatically.
- **Binary-aware.** Skips images, archives, fonts, and every other non-text extension by default.
- **5MB file cap.** Files over 5MB are skipped to prevent accidental inclusion of minified bundles or data files.

## Supported languages for outline extraction

TypeScript, JavaScript, JSX, TSX, Python, Go, Rust, Java, Kotlin.

Other languages still work with `search_code`, `find_symbol`, `find_references`, and `file_stats` — only the structured outline is language-specific.

## License

MIT
