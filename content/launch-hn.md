# Show HN: Atlas — Persistent memory, web access, and search for Claude and Cursor, through MCP

Every AI agent I use has three gaping holes:

1. **No memory across sessions.** I re-explain my stack, preferences, and project context every time I open a new chat. Forever.
2. **No clean web access.** Claude "can't browse the web." Cursor asks me to paste URLs and strips formatting.
3. **No universal search.** Each client wires up one search provider (maybe) and quality is hit-or-miss.

So I built Atlas — three MCP servers that fix all three in a single install. Zero API keys, zero cloud dependencies, zero subscription.

- **atlas-mcp-memory** — SQLite-backed persistent memory with FTS5 full-text search, importance weighting, and namespaces. Your memories live in `~/.atlas/memory.db`. Nothing goes to the cloud.
- **atlas-mcp-web** — Six web extraction tools: clean article bodies (RAG-ready), Open Graph + Twitter Card + JSON-LD metadata, HTML tables as structured rows, categorized links, contact info (emails/phones/socials), and tech stack detection across 70+ technologies.
- **atlas-mcp-search** — Seven search providers unified: DuckDuckGo, GitHub, npm, PyPI, Stack Overflow, Wikipedia, Hacker News. All free public APIs.

Install any of them in 30 seconds:

```json
{
  "mcpServers": {
    "atlas-memory": { "command": "npx", "args": ["-y", "atlas-mcp-memory"] },
    "atlas-web":    { "command": "npx", "args": ["-y", "atlas-mcp-web"] },
    "atlas-search": { "command": "npx", "args": ["-y", "atlas-mcp-search"] }
  }
}
```

Paste into your Claude Desktop / Cursor / Windsurf MCP config, restart, done. Twenty new tools spanning memory, web, and search.

**Design choices that matter:**

- *Zero native compilation.* The memory server uses Node 22+ built-in `node:sqlite`. No better-sqlite3, no node-gyp, no Visual Studio build tools. It works on Windows, macOS, Linux, and every CI runner.
- *Local-first.* Every byte of memory lives on your disk. Every web scrape runs in your process. Every search hits a public endpoint directly. We don't run a server you have to trust — there's nothing to trust.
- *No vector DB needed.* FTS5 with Porter stemming handles 99% of memory recall in under a millisecond. Vector embeddings are planned as opt-in, not required.
- *Importance-weighted recall.* Every memory gets a 1-5 score. When the agent searches, critical memories (your stack, your preferences) surface before trivia.

Everything is MIT licensed.

GitHub: https://github.com/Mohye24k/atlas
Website: https://atlas-agent.dev *(launching soon)*

Happy to answer questions about the architecture, the schema, or why the whole thing is 52 files and ships on day one.
