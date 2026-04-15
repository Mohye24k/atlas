# Atlas

**Infrastructure for AI agents.** The open-source stack every Claude, Cursor, Windsurf, and future AI agent needs to read the web, remember context, search the internet, take real-world actions, and understand any codebase.

Atlas is a suite of Model Context Protocol servers you install in 30 seconds. Zero API keys. Zero cloud dependencies. Zero bullshit.

```
            ┌───────────────────────────────────┐
            │         Your AI agent             │
            │   (Claude, Cursor, Windsurf...)   │
            └─────────────┬─────────────────────┘
                          │ MCP
  ┌───────────────────────┼───────────────────────┐
  │                       │                       │
┌─▼────┐  ┌────▼────┐  ┌──▼────┐  ┌────▼────┐  ┌──▼───┐
│memory│  │   web   │  │search │  │ actions │  │ code │
└──────┘  └─────────┘  └───────┘  └─────────┘  └──────┘
 persist    extract     7 src      DO things     repo
 across     clean       unified    email         intel
sessions    content     API        http          find
                                   webhooks      symbols
                                   calendar      outline
```

## The five packages

| Package | Install | What it does |
|---------|---------|--------------|
| [`atlas-mcp-memory`](./mcp-memory) | `npx -y atlas-mcp-memory` | Persistent memory for AI agents — SQLite-backed, local-first, FTS5 full-text search, importance-weighted retrieval, namespaces. **Zero native deps.** |
| [`atlas-mcp-web`](./mcp-web) | `npx -y atlas-mcp-web` | Six web extraction tools: article bodies, metadata (OG/Twitter/JSON-LD), HTML tables, categorized links, contact info, tech stack (70+ techs) |
| [`atlas-mcp-search`](./mcp-search) | `npx -y atlas-mcp-search` | Seven search providers in one install: DuckDuckGo, GitHub, npm, PyPI, Stack Overflow, Wikipedia, Hacker News |
| [`atlas-mcp-actions`](./mcp-actions) | `npx -y atlas-mcp-actions` | Five action tools: send email (SMTP), fire webhooks, generic HTTP request, generate .ics calendar invites, allowlist-gated shell |
| [`atlas-mcp-code`](./mcp-code) | `npx -y atlas-mcp-code` | Seven code intelligence tools: list_files, search_code, read_file, file_outline, find_symbol, find_references, file_stats |

**All five tested with a 10-test smoke harness that runs end-to-end in 18 seconds.**

## Install all five in Claude Desktop

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
    },
    "atlas-actions": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-actions"],
      "env": {
        "SMTP_URL": "smtps://user:pass@smtp.gmail.com:465"
      }
    },
    "atlas-code": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-code"]
    }
  }
}
```

Restart Claude Desktop. Your agent now has **30 new tools** spanning memory, web extraction, search, actions, and code intelligence.

## Why Atlas exists

Every AI agent you use today has five gaping holes:

1. **No memory.** You explain your stack, preferences, and context at the start of every conversation. Forever.
2. **No web access.** Claude "can't browse the web for you." Cursor asks you to paste URLs. The web is right there and your agent is blind to it.
3. **No universal search.** Each client wires up one search API (maybe) and it's rarely high quality.
4. **No actions.** Your agent can talk about sending an email but can't actually send one.
5. **No code intelligence.** Cursor has some. Claude Desktop has none. Windsurf has some. Each is different.

Atlas fills all five in five `npx` installs. No subscriptions, no API keys, no cloud lock-in. **Your memories live on your disk. Your searches hit public APIs. Your web extraction runs in your process. Your actions are yours to approve.**

## The Atlas thesis

Agents are the biggest shift in software since mobile. Within three years half of all knowledge workers will spend most of their day working through an agent. But the agents shipping today are missing the **substrate** — the boring infrastructure layer that lets them read, remember, and act on behalf of humans.

We're building that substrate. One package at a time, each free, each MIT-licensed, each best-in-class for one specific job.

**Today:** memory + web + search + actions + code
**Soon:** files (Drive/Dropbox/S3), identity (reputation + trust), sync (cross-device), payments

## Directory layout

```
atlas/
├── mcp-memory/       # Persistent memory MCP (atlas-mcp-memory)
├── mcp-web/          # Web extraction MCP (atlas-mcp-web)
├── mcp-search/       # Unified search MCP (atlas-mcp-search)
├── mcp-actions/      # Actions MCP (atlas-mcp-actions)
├── mcp-code/         # Code intelligence MCP (atlas-mcp-code)
├── api/              # Hosted REST API (api.atlas-agent.dev)
├── landing/          # Landing page (atlas-agent.dev)
├── content/          # Launch assets, manifesto, HN/PH/Twitter copy
└── scripts/          # build-all, publish-all, deploy-vercel, smoke-test
```

## Build, test, publish

```bash
# Build every package
node scripts/build-all.mjs

# Run the 10-test smoke harness against every server
node scripts/smoke-test.mjs

# Dry-run publish to npm (all 5 MCP packages)
node scripts/publish-all.mjs --dry-run

# Real publish (requires `npm login` first)
node scripts/publish-all.mjs

# Deploy landing + api to Vercel (requires `vercel login` first)
node scripts/deploy-vercel.mjs --prod
```

## Roadmap

- [x] atlas-mcp-memory
- [x] atlas-mcp-web
- [x] atlas-mcp-search
- [x] atlas-mcp-actions
- [x] atlas-mcp-code
- [x] Atlas REST API
- [x] Landing page
- [x] End-to-end smoke test harness
- [x] One-command build / publish / deploy scripts
- [ ] atlas-mcp-files — cloud file access (Google Drive, Dropbox, S3)
- [ ] atlas-mcp-identity — reputation and trust for agents
- [ ] atlas-mcp-payments — Stripe for agent-to-agent transactions
- [ ] Atlas Cloud (optional hosted sync, $9/month)

## Contributing

PRs welcome. The brief: every tool should be **fast, reliable, and work with zero configuration**. If a new tool needs an API key or a cloud dependency, it belongs behind a clear opt-in env var.

## License

MIT — every package, every file. Fork it, run it, sell it, build on it.

## Links

- Website: https://atlas-agent.dev *(launching soon)*
- GitHub: https://github.com/Mohye24k/atlas
- Manifesto: [content/manifesto.md](./content/manifesto.md)
- Launch HN post: [content/launch-hn.md](./content/launch-hn.md)
- Launch Twitter thread: [content/launch-twitter.md](./content/launch-twitter.md)
