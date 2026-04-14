# Atlas

**Infrastructure for AI agents.** The open-source stack every Claude, Cursor, Windsurf, and future AI agent needs to read the web, remember context, and search across the internet.

Atlas is a suite of Model Context Protocol servers you install in 30 seconds. Zero API keys. Zero cloud dependencies. Zero bullshit.

```
        ┌─────────────────────────────────┐
        │      Your AI agent              │
        │  (Claude, Cursor, Windsurf...)  │
        └─────────────┬───────────────────┘
                      │ MCP
        ┌─────────────┴───────────────────┐
        │                                 │
    ┌───▼────┐   ┌────▼────┐   ┌─────▼─────┐
    │ memory │   │   web   │   │  search   │
    └────────┘   └─────────┘   └───────────┘
     persist       extract      7 sources
      across        clean       unified
     sessions       content        API
```

## The three packages

| Package | npm | What it does |
|---------|-----|--------------|
| [atlas-mcp-memory](./mcp-memory) | `npx -y atlas-mcp-memory` | Persistent memory for AI agents — SQLite-backed, local-first, FTS5 full-text search, importance-weighted retrieval, namespaces |
| [atlas-mcp-web](./mcp-web) | `npx -y atlas-mcp-web` | Six web extraction tools: article bodies, metadata (OG/Twitter/JSON-LD), HTML tables, categorized links, contact info, tech stack (70+ techs) |
| [atlas-mcp-search](./mcp-search) | `npx -y atlas-mcp-search` | Seven search providers in one install: DuckDuckGo, GitHub, npm, PyPI, Stack Overflow, Wikipedia, Hacker News |

## Install all three in Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows:

```json
{
  "mcpServers": {
    "atlas-memory": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-memory"]
    },
    "atlas-web": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-web"]
    },
    "atlas-search": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-search"]
    }
  }
}
```

Restart Claude Desktop. Your agent now has 20 new tools spanning memory, web extraction, and universal search.

## Why Atlas exists

Every AI agent you use today has three gaping holes:

1. **No memory.** You explain your stack, preferences, and context at the start of every conversation. Forever.
2. **No web access.** Claude "can't browse the web for you." Cursor asks you to paste URLs. The web is right there and your agent is blind to it.
3. **No universal search.** Each client wires up one search API (maybe) and it's rarely high quality.

Atlas fills all three in a single `npx` install. No subscriptions, no API keys, no cloud lock-in. **Your memories live on your disk. Your searches hit public APIs. Your web extraction runs in your process.**

## The Atlas thesis

Agents are the biggest shift in software since mobile. Within three years half of all knowledge workers will spend most of their day working through an agent. But the agents shipping today are missing the **substrate** — the boring infrastructure layer that lets them read, remember, and act on behalf of humans.

We're building that substrate. One package at a time, each free, each MIT-licensed, each best-in-class for one specific job.

**Today:** memory + web + search
**Soon:** actions (email, calendar, payments), identity (reputation + trust), sync (cross-device state)

## Directory layout

```
atlas/
├── mcp-memory/       # Persistent memory MCP (atlas-mcp-memory)
├── mcp-web/          # Web extraction MCP (atlas-mcp-web)
├── mcp-search/       # Unified search MCP (atlas-mcp-search)
├── api/              # Hosted REST API (api.atlas-agent.dev)
├── landing/          # Landing page (atlas-agent.dev)
└── content/          # Launch assets, blog posts, manifesto
```

## Roadmap

- [x] atlas-mcp-memory
- [x] atlas-mcp-web
- [x] atlas-mcp-search
- [x] Atlas REST API (hosted tier)
- [x] Landing page
- [ ] atlas-mcp-actions — agents that DO things
- [ ] atlas-mcp-code — repo intelligence for coding agents
- [ ] atlas-mcp-files — cloud file access (Drive, Dropbox, S3)
- [ ] Atlas Cloud (optional hosted sync, $9/month)

## Contributing

PRs welcome. The brief: every tool should be **fast, reliable, and work with zero configuration**. If a new tool needs an API key or a cloud dependency, it belongs in a different repo.

## License

MIT — every package, every file. Fork it, run it, sell it, build on it.

## Links

- Website: https://atlas-agent.dev
- GitHub: https://github.com/atlas-agent/atlas
- npm: https://www.npmjs.com/~atlas-agent
