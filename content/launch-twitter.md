# Atlas launch — Twitter / X thread

---

**1/10**

I got sick of re-explaining my stack to Claude at the start of every conversation.

So I built Atlas — persistent memory, web access, and unified search for every AI agent. Three MCP servers. One install. Zero API keys.

Open source. MIT. Here's what it does 👇

---

**2/10**

Every AI agent you use has three gaping holes:

• No memory across sessions
• No clean web access ("I can't browse the web")
• No universal search (each client wires up one provider at best)

Atlas fills all three with 8 lines of JSON in your MCP config.

---

**3/10**

**atlas-mcp-memory** — the killer piece.

• SQLite-backed, local-first
• Full-text search via FTS5 (sub-millisecond)
• Importance-weighted recall (1-5)
• Namespaces for work / personal / per-project
• Zero native deps (Node 22+ built-in sqlite)

Your memories live in ~/.atlas/memory.db. Nothing goes to the cloud.

---

**4/10**

Demo:

Me → "remember: I'm building a Next.js 15 SaaS, stack is Postgres + Drizzle, deploy to Fly.io iad."

*(two days later, fresh session)*

Me → "what stack am I using for my project?"
Claude → recalls the exact memory and answers.

This should be table stakes. It isn't. Atlas makes it table stakes.

---

**5/10**

**atlas-mcp-web** — clean web data for your agent.

Six tools:
• extract_article — RAG-ready article body, strips ads/nav/comments
• extract_metadata — OG + Twitter Card + JSON-LD
• extract_tables — HTML tables as structured rows
• extract_links — categorized by internal/external/social/email/phone
• extract_contact — emails, phones, socials
• detect_tech_stack — 70+ technologies

---

**6/10**

**atlas-mcp-search** — seven providers, one install:

• DuckDuckGo web search
• GitHub (repos/code/users)
• npm registry
• PyPI
• Stack Overflow
• Wikipedia
• Hacker News (via Algolia)

All free public APIs. No keys. No rate limit headaches.

---

**7/10**

Design principles I optimized for:

1. Zero configuration. npx, paste JSON, done.
2. Zero native compilation. Works on every OS and CI.
3. Local-first. Your data stays on your disk.
4. Fast. HTTP + Cheerio + FTS5. No headless browser. No embeddings.

---

**8/10**

Install all three in Claude Desktop:

```json
{
  "mcpServers": {
    "atlas-memory": { "command": "npx", "args": ["-y", "atlas-mcp-memory"] },
    "atlas-web":    { "command": "npx", "args": ["-y", "atlas-mcp-web"] },
    "atlas-search": { "command": "npx", "args": ["-y", "atlas-mcp-search"] }
  }
}
```

Restart Claude. Twenty new tools.

---

**9/10**

The Atlas thesis:

Agents are the biggest shift in software since mobile. Within three years half of knowledge workers will work through an agent. But agents today are missing the substrate — the boring infrastructure that lets them read, remember, and act on behalf of humans.

We're building that substrate.

---

**10/10**

Today: memory + web + search.
Next: actions (email, calendar, payments), identity (reputation, trust), sync (cross-device).

Everything MIT. Every line.

GitHub: github.com/Mohye24k/atlas
Website: atlas-agent.dev *(soon)*

If you use Claude, Cursor, or Windsurf, this is for you.
