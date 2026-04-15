# create-atlas-agent

**Turn any MCP-compatible AI agent into a full Atlas agent in one command.**

```bash
npx create-atlas-agent
```

That's it. Detects Claude Desktop, Cursor, and Windsurf on your machine, adds all six Atlas MCP servers to each config (with a `.bak` backup of your existing file), and prints the next steps.

## What it installs

| Server | What it adds |
|--------|--------------|
| `atlas-mcp-memory` | Persistent memory across sessions (SQLite + FTS5) |
| `atlas-mcp-web` | Six web extraction tools (article, metadata, tables, links, contact, tech stack) |
| `atlas-mcp-search` | Seven unified search providers (DDG, GitHub, npm, PyPI, SO, Wikipedia, HN) |
| `atlas-mcp-actions` | Five action tools (email, webhooks, HTTP, calendar, shell) |
| `atlas-mcp-code` | Seven code intelligence tools (search, outline, find_symbol, references, stats) |
| `atlas-mcp-files` | Ten sandboxed filesystem tools (list, read, write, move, copy, delete — allowlist-gated) |

**42 new tools. One install.**

## Usage

```bash
# Interactive — detects clients and confirms before writing
npx create-atlas-agent

# Preview what would change without writing
npx create-atlas-agent --dry-run

# Install only specific servers
npx create-atlas-agent --only memory,web,search,files

# Install into a specific client
npx create-atlas-agent --target claude

# Skip confirmation prompts (for scripts)
npx create-atlas-agent --yes

# Help
npx create-atlas-agent --help
```

## Where it writes

| Client | Config path |
|--------|-------------|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

A `.bak` copy of each existing config is created before any write. Existing MCP servers in your config are preserved — Atlas servers are merged in alongside them.

## After install

1. Restart your MCP client
2. Ask your agent: *"what Atlas tools do you have?"*
3. (Optional) Set `SMTP_URL` in the atlas-actions env block if you want `send_email` to work

## License

MIT

## Links

- [Atlas monorepo](https://github.com/Mohye24k/atlas)
- [Atlas website](https://atlas-agent.dev)
