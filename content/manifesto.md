# Your AI agent doesn't remember you. That's the single biggest problem in AI right now.

**And we're fixing it with 8 lines of JSON.**

---

You've had this conversation at least 100 times.

"Hey Claude, remember I'm building a Next.js 15 SaaS called Atlas, my stack is Postgres + Drizzle, I hate Tailwind's default focus ring, and I'm deploying to Fly.io in iad region. The subdomain is atlas-app.fly.dev and my auth tokens are stored in Upstash Redis. The design system uses Inter for headings and JetBrains Mono for code. I prefer TypeScript strict mode, no `any`, no `unknown` unless genuinely unknown."

You hit Enter. Claude does the thing. The session ends.

Tomorrow, you open Claude again. It has never heard of you.

You paste the same 8 sentences. Again. And again. And again. **Every single day.**

---

## This isn't a feature gap. It's the entire ceiling of AI useful-ness.

Think about what a memoryless assistant actually is. Every session starts from zero. The agent can't learn your preferences. Can't reference yesterday's decision. Can't build a model of your work.

So you stay at a ceiling. No matter how smart the model gets, it never knows *you*.

- ChatGPT has "memories" — but they're stuck inside ChatGPT.com.
- Claude has "projects" — but projects are per-conversation, not persistent.
- Cursor, Windsurf, Zed, Continue — **nothing.** Zero persistent memory.

Every developer I know has built some hack around this. A markdown file they paste at the start of every session. A custom system prompt that slowly grows. A CLAUDE.md they carefully curate. **All of them are substitutes for a database.**

So we built the database.

## Atlas Memory: one `npx` away

```json
{
  "mcpServers": {
    "atlas-memory": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-memory"]
    }
  }
}
```

That's it. Paste this into your Claude Desktop config. Restart. Your agent now has:

- `remember` — store a fact with tags and importance
- `recall` — full-text search across every session you've ever had
- `update_memory` — correct things that have changed
- `forget` — delete memories on request
- `list_memories` — review what the agent knows about any topic
- `memory_stats` — introspect the memory state
- `list_namespaces` — separate work / personal / per-project contexts

Memories live in a single SQLite file at `~/.atlas/memory.db`. **Nothing goes to the cloud.** It's yours to back up, copy, encrypt, or delete.

## Why it actually works

Three design choices that matter:

**1. Importance-weighted retrieval.** Every memory gets a 1–5 score. When the agent recalls, critical memories (your stack, your preferences, your project details) surface before trivia (something you said offhand once). The agent stops drowning in noise and actually uses the important stuff first.

**2. Namespaces.** `work`, `personal`, `cortex`, `atlas`, `company-x` — separate contexts that don't leak into each other. Your agent doesn't mix up your two startups.

**3. Full-text search on everything.** Built on SQLite FTS5 with Porter stemming. Sub-millisecond recall on 100k memories. No vector DB setup, no embeddings API key, no cloud dependencies. **It just works the moment you install it.**

## The prompt you add once and forget

Drop this into your Claude project instructions, Cursor system prompt, or Windsurf rules:

> *At the start of every conversation, call `recall` with a query relevant to the current topic to load context from past sessions. Whenever I share preferences, facts, or project details, call `remember` with appropriate tags and importance. When information changes, call `update_memory`. Never say "I can't remember previous conversations" — you can.*

From that point on, your agent builds a real model of you. Every conversation starts where the last one left off.

## Why we're building Cortex

Atlas is building the infrastructure layer that AI agents use to **read, remember, and act** on behalf of humans. The AWS for AI agents.

Agents are the biggest shift in software since mobile. Over the next three years, half of all knowledge workers will spend most of their day working through an agent. But the agents we have today are **missing the substrate**:

- They can't read the web cleanly (we ship `atlas-mcp-web` for that)
- They can't remember anything across sessions (we ship `atlas-mcp-memory` — this post)
- They can't search across your tools (we're shipping `atlas-mcp-search` next)
- They can't take action — book meetings, send emails, make purchases (coming)

Each of these is a brutally unsolved problem that the whole industry is hand-waving past. We're not hand-waving. We're building the pieces, one at a time, each free to install, each best-in-class.

## The pitch in one sentence

**The AI agent you use every day should remember who you are. Install atlas-mcp-memory. It takes 30 seconds. Then tell us we didn't just solve the biggest problem in AI.**

---

### Links

- Install: `npx -y atlas-mcp-memory`
- GitHub: https://github.com/atlas-agent/mcp-memory
- Docs: https://atlas-agent.dev/memory
- The other tools we ship: https://atlas-agent.dev
- Hacker News thread: *(this one)*

### FAQ

**Q: Why not embeddings / vector search?**
A: We will add them as an opt-in. But every vector DB adds a cloud dependency, an embedding API key, and a cold start. Most memories are retrievable by keyword. Get 80% of the value in 0% of the complexity.

**Q: Is this open source?**
A: Yes, MIT licensed. Every line. Fork it, extend it, run it.

**Q: Is this just a database wrapped in an MCP server?**
A: At its core, yes. The value is *building the right database schema for AI memory*, wrapping it behind the MCP protocol so every agent speaks the same language, and making install take 30 seconds instead of 30 hours.

**Q: What about privacy?**
A: Memories are a single SQLite file on your disk. No network calls. No telemetry. We don't run the database — you do.

**Q: How do you make money?**
A: The memory package is free forever. We're building a hosted Atlas Cloud ($9/month) for cross-device sync, team-shared memories, and semantic search via embeddings — entirely opt-in. Everything local stays local.

**Q: What's next?**
A: Search. Actions. Identity. Payments. We're building the whole agent infrastructure stack. Subscribe at https://atlas-agent.dev for the drop notifications.
