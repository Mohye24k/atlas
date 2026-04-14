# atlas-mcp-memory

**The persistent memory every AI agent has been missing.** Claude, Cursor, Windsurf, and any MCP-compatible agent finally get a real, durable memory: remember what you told them, across sessions, across projects, across weeks. Fast. Private. Local-first.

> No more repeating yourself. No more "as an AI, I don't remember previous conversations."

## Why

Every AI agent you use today forgets you the moment the chat ends. You spend the first 5 minutes of every session re-explaining what you're building, what stack you use, what your preferences are, what you already tried. **That's broken.**

Atlas Memory fixes it with one MCP install. Your agent learns once, remembers forever.

- **Persistent across sessions** — SQLite on disk, nothing goes to the cloud
- **Full-text search** — Built on SQLite FTS5, sub-millisecond recall
- **Importance-weighted** — Critical memories surface first
- **Tag-based organization** — Find by topic, project, person
- **Namespaces** — Separate work, personal, project-X contexts
- **Local-first** — Your memories live in `~/.atlas/memory.db`. You own them.

## Install

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop. Done.

### Cursor / Windsurf / any MCP client

Same JSON snippet, paste it into your client's MCP config. The seven tools will appear in your tool palette.

## Tools

### `remember`

Store a memory the agent should carry across sessions.

```json
{
  "content": "User is building a Next.js 15 SaaS app called Atlas, targeting AI agent infrastructure.",
  "tags": ["project", "stack", "cortex"],
  "importance": 5,
  "namespace": "work"
}
```

Importance is 1 (trivia) to 5 (critical). The agent should pick a reasonable value based on how broadly the memory applies.

### `recall`

Search memories by free text, tags, importance, or namespace. Use this at the start of every conversation to load relevant context.

```json
{
  "text": "next.js deployment preferences",
  "tags": ["stack"],
  "minImportance": 3,
  "namespace": "work",
  "limit": 10
}
```

Results are ordered by importance, then recency. Every recall also updates `accessedAt` and `accessCount` so the agent can spot high-signal memories over time.

### `update_memory`

Update a memory when the user corrects you or new context supersedes old.

```json
{
  "id": "a1b2c3...",
  "content": "Updated: the app is now called Atlas, not Atlas.",
  "importance": 5
}
```

### `forget`

Delete a memory by id. Use when the user explicitly asks to forget, or the memory is known wrong.

### `list_memories`

List all memories in a namespace, ordered by importance. Useful for review and debugging.

### `memory_stats`

Get total count, per-namespace counts, and top tags. Good for introspection.

### `list_namespaces`

Every namespace that has at least one memory in it.

## Usage pattern

Tell your agent once:

> At the start of every conversation, call `recall` with a broad query about the current topic to load relevant context. Whenever I share a preference, fact, or project detail, call `remember` to store it. Use `namespace: "work"` for work-related memories and `namespace: "personal"` for everything else.

From that point on, your agent builds a real model of you and your work. Every conversation starts where the last one left off.

## System prompt snippet

Drop this into your Claude project instructions, Cursor settings, or Windsurf rules:

```
You have access to the Atlas Memory MCP server. Use it actively:

1. At the start of every conversation, call `recall` with a query relevant to the current topic to load context from past sessions.
2. Whenever the user shares preferences, facts, project details, or corrections, call `remember` to store them (with appropriate tags and importance).
3. When information changes, call `update_memory` rather than creating duplicates.
4. Never claim you "can't remember previous conversations" — you can. Use the memory tools.

Default namespace: "default". Use separate namespaces for "work" and "personal" when appropriate.
```

## Storage

Memories live in a single SQLite file:

- **Default path:** `~/.atlas/memory.db`
- **Override:** set `ATLAS_MEMORY_DB=/path/to/file.db` in your MCP server env

The file uses WAL mode, is fast under concurrent reads, and is yours to back up, copy, or delete at any time. Nothing is sent to the cloud.

## Under the hood

- `better-sqlite3` for synchronous, high-performance storage
- FTS5 virtual table for full-text search
- Porter stemming + Unicode 6.1 tokenizer
- Importance-weighted retrieval with recency tiebreaking
- Access tracking for future smart-pruning

## Roadmap

- Vector embeddings (optional, via Ollama or OpenAI API) for semantic search
- Automatic summarization of long-running namespaces
- Cross-device sync via Atlas Cloud ($9/month, opt-in)
- Shared memories for team agents

## License

MIT

## Part of the Atlas platform

Atlas is building the infrastructure layer for AI agents:

- `atlas-mcp-memory` — persistent memory (this package)
- `atlas-mcp-web` — structured web data extraction
- `atlas-mcp-search` — unified search (coming soon)

Website: https://atlas-agent.dev
