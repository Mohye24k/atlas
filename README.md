# Atlas

**Infrastructure for AI agents.** The open-source stack every Claude, Cursor, Windsurf, and future AI agent needs to read the web, remember context, search the internet, take real-world actions, understand any codebase, and reach the user's files.

Atlas is a suite of Model Context Protocol servers you install with **one command**. Zero API keys. Zero cloud dependencies. Zero bullshit.

```bash
npx -y create-atlas-mcp
```

That single command detects Claude Desktop, Cursor, or Windsurf on your machine and wires up all six Atlas servers in ~10 seconds.

```
              ┌───────────────────────────────────┐
              │          Your AI agent            │
              │    (Claude, Cursor, Windsurf...)  │
              └─────────────┬─────────────────────┘
                            │  MCP
   ┌──────────┬──────────┬──┴───────┬──────────┬──────────┐
   │          │          │          │          │          │
┌──▼───┐  ┌───▼──┐  ┌────▼───┐  ┌───▼────┐  ┌──▼──┐  ┌────▼────┐
│memory│  │ web  │  │ search │  │actions │  │ code│  │  files  │
└──────┘  └──────┘  └────────┘  └────────┘  └─────┘  └─────────┘
 persist   extract   7 sources   DO things   repo    sandboxed
 across    clean     unified     email       intel   local fs
sessions   content   search      http        outline allowlist
 SQLite    zero-dep  zero-key    calendar    symbols symlink-safe
 FTS5      parse     providers   webhooks    search  read-only
                                 shell       stats   mode
```

## The six packages

| Package | Install | What it does |
|---------|---------|--------------|
| [`atlas-mcp-memory`](./mcp-memory) | `npx -y atlas-mcp-memory` | Persistent memory for AI agents — SQLite-backed, local-first, FTS5 full-text search, importance-weighted retrieval, namespaces. **Zero native deps.** |
| [`atlas-mcp-web`](./mcp-web) | `npx -y atlas-mcp-web` | Six web extraction tools: article bodies, metadata (OG/Twitter/JSON-LD), HTML tables, categorized links, contact info, tech stack (70+ techs) |
| [`atlas-mcp-search`](./mcp-search) | `npx -y atlas-mcp-search` | Seven search providers in one install: DuckDuckGo, GitHub, npm, PyPI, Stack Overflow, Wikipedia, Hacker News |
| [`atlas-mcp-actions`](./mcp-actions) | `npx -y atlas-mcp-actions` | Five action tools: send email (SMTP), fire webhooks, generic HTTP request, generate .ics calendar invites, allowlist-gated shell |
| [`atlas-mcp-code`](./mcp-code) | `npx -y atlas-mcp-code` | Seven code intelligence tools: list_files, search_code, read_file, file_outline, find_symbol, find_references, file_stats |
| [`atlas-mcp-files`](./mcp-files) | `npx -y atlas-mcp-files` | Ten sandboxed filesystem tools: list_roots, read_text_file, write_text_file, read_binary_file, file_stat, list_dir, move, copy, delete, create_dir — every path realpath-checked against an allowlist of roots, read-only mode for untrusted agents |

**All six tested with a 12-test smoke harness that runs end-to-end in 19 seconds.**

## Install everything with one command

```bash
npx -y create-atlas-mcp
```

The CLI auto-detects your MCP client (Claude Desktop on macOS/Windows/Linux, Cursor, Windsurf), backs up your existing config to `.bak`, and adds all six Atlas servers. Flags:

```bash
npx -y create-atlas-mcp --target claude        # force a specific client
npx -y create-atlas-mcp --only memory,web      # install a subset
npx -y create-atlas-mcp --dry-run              # preview without writing
npx -y create-atlas-mcp --yes                  # skip confirmation
```

## Install manually in Claude Desktop

If you'd rather edit the config yourself, open `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows:

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
    },
    "atlas-files": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-files"],
      "env": {
        "ATLAS_FILES_ROOTS": "/Users/you/projects;/Users/you/Documents"
      }
    }
  }
}
```

Restart Claude Desktop. Your agent now has **42 new tools** spanning memory, web extraction, search, actions, code intelligence, and the local filesystem.

## Why Atlas exists

Every AI agent you use today has six gaping holes:

1. **No memory.** You explain your stack, preferences, and context at the start of every conversation. Forever.
2. **No web access.** Claude "can't browse the web for you." Cursor asks you to paste URLs. The web is right there and your agent is blind to it.
3. **No universal search.** Each client wires up one search API (maybe) and it's rarely high quality.
4. **No actions.** Your agent can talk about sending an email but can't actually send one.
5. **No code intelligence.** Cursor has some. Claude Desktop has none. Windsurf has some. Each is different.
6. **No safe filesystem reach.** Agents that touch files either get the whole disk or a single chat-attached file. There is no middle ground.

Atlas fills all six in one `npx` install. No subscriptions, no API keys, no cloud lock-in. **Your memories live on your disk. Your searches hit public APIs. Your web extraction runs in your process. Your actions are yours to approve. Your files never leave the roots you allowlist.**

## The Atlas thesis

Agents are the biggest shift in software since mobile. Within three years half of all knowledge workers will spend most of their day working through an agent. But the agents shipping today are missing the **substrate** — the boring infrastructure layer that lets them read, remember, and act on behalf of humans.

We're building that substrate. One package at a time, each free, each MIT-licensed, each best-in-class for one specific job.

**Today:** memory + web + search + actions + code + files (local sandboxed)
**Soon:** cloud files (Drive/Dropbox/S3), identity (reputation + trust), sync (cross-device), payments

## Directory layout

```
atlas/
├── mcp-memory/         # Persistent memory MCP (atlas-mcp-memory)
├── mcp-web/            # Web extraction MCP (atlas-mcp-web)
├── mcp-search/         # Unified search MCP (atlas-mcp-search)
├── mcp-actions/        # Actions MCP (atlas-mcp-actions)
├── mcp-code/           # Code intelligence MCP (atlas-mcp-code)
├── mcp-files/          # Sandboxed filesystem MCP (atlas-mcp-files)
├── create-atlas-mcp/ # One-command CLI installer (npx create-atlas-mcp)
├── api/                # Hosted REST API (api.atlas-agent.dev)
├── landing/            # Landing page (atlas-agent.dev)
├── examples/           # Research agent demo that chains 5 servers end-to-end
├── content/            # Launch playbook, manifesto, HN/PH/Twitter copy
├── .github/workflows/  # CI matrix: Ubuntu/macOS/Windows × Node 22
└── scripts/            # build-all, publish-all, deploy-vercel, smoke-test
```

## Build, test, publish

```bash
# Build every package
node scripts/build-all.mjs

# Run the 12-test smoke harness against every server
node scripts/smoke-test.mjs

# Dry-run publish to npm (all 6 MCP packages + CLI installer)
node scripts/publish-all.mjs --dry-run

# Real publish (requires `npm login` first)
node scripts/publish-all.mjs

# Deploy landing + api to Vercel (requires `vercel login` first)
node scripts/deploy-vercel.mjs --prod
```

## Try the research agent demo

Chain five Atlas servers to research any topic in ~30 seconds:

```bash
node examples/research-agent/research.mjs "model context protocol"
```

It runs `search_hackernews` → `search_npm` → `extract_article` → `remember` → `create_ics` end-to-end, writes a markdown report to `reports/<slug>.md`, and generates a follow-up calendar event.

## Roadmap

- [x] atlas-mcp-memory
- [x] atlas-mcp-web
- [x] atlas-mcp-search
- [x] atlas-mcp-actions
- [x] atlas-mcp-code
- [x] atlas-mcp-files — sandboxed local filesystem (symlink-safe, allowlist-based, read-only mode)
- [x] create-atlas-mcp — one-command installer for Claude / Cursor / Windsurf
- [x] Atlas REST API
- [x] Landing page
- [x] End-to-end 12-test smoke harness
- [x] Research agent example (chains 5 servers in one script)
- [x] GitHub Actions CI (Ubuntu / macOS / Windows × Node 22)
- [x] One-command build / publish / deploy scripts
- [ ] atlas-mcp-cloud-files — Google Drive, Dropbox, S3 adapters
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
- Launch playbook (hour-by-hour Tuesday plan): [content/launch-playbook.md](./content/launch-playbook.md)
- Launch HN post: [content/launch-hn.md](./content/launch-hn.md)
- Launch Twitter thread: [content/launch-twitter.md](./content/launch-twitter.md)
