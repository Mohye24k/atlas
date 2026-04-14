# atlas-mcp-search

**One search tool to rule them all.** A Model Context Protocol server that gives Claude, Cursor, Windsurf and any MCP agent unified access to 7 search engines through a single install. No API keys required.

Part of [Atlas](https://atlas-agent.dev) — infrastructure for AI agents.

## What your agent gets

- `search_web` — DuckDuckGo web search
- `search_github` — GitHub repositories, code, users
- `search_npm` — npm package registry
- `search_pypi` — PyPI Python packages
- `search_stackoverflow` — Stack Overflow questions
- `search_wikipedia` — Wikipedia articles
- `search_hackernews` — Hacker News via Algolia

All free. All public. Zero keys to manage.

## Install

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "atlas-search": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-search"]
    }
  }
}
```

Restart Claude Desktop.

### Cursor / Windsurf / any MCP client

Same JSON snippet in your client's MCP config.

## Example usage

Once installed, your agent can just ask:

> "Find the top 5 GitHub repos about MCP memory servers, check if any of them are on npm, and summarize the HN discussion about them."

The agent will call `search_github`, then `search_npm`, then `search_hackernews`, and compose the answer. No custom scrapers, no API key rotation, no rate limit headaches.

## Why

Every AI agent today either:
1. Has no search at all (Claude Desktop, Cursor, Windsurf out of the box)
2. Has only one search provider wired up, usually paid (Brave API, Serper, etc.)
3. Relies on flaky scrapers the user has to maintain

Atlas Search gives your agent **seven high-signal sources in one install**, all using free public APIs that don't require accounts. Drop it in and your agent can actually research things across the web.

## Part of the Atlas platform

- [atlas-mcp-memory](https://www.npmjs.com/package/atlas-mcp-memory) — persistent memory across sessions
- [atlas-mcp-web](https://www.npmjs.com/package/atlas-mcp-web) — clean structured web data extraction
- [atlas-mcp-search](https://www.npmjs.com/package/atlas-mcp-search) — unified search (this package)

Website: https://atlas-agent.dev

## License

MIT
