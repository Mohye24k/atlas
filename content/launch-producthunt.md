# Atlas — Product Hunt launch assets

## Tagline (60 chars max)

**Memory, web, and search for every AI agent. One install.**

## Alternate taglines

- Infrastructure for AI agents. Install in 30 seconds.
- The substrate every Claude, Cursor, Windsurf agent has been missing.
- Persistent memory + web access + universal search, through MCP.

## Description (260 chars max)

Atlas gives your AI agent three things it desperately needs: persistent memory across sessions, clean web extraction, and unified search across 7 providers. Three MCP servers, one install, zero API keys. MIT licensed. Works with Claude, Cursor, Windsurf.

## First comment (maker intro)

Hey Product Hunt 👋

I built Atlas because I got tired of explaining my stack to Claude at the start of every conversation.

Every AI agent I use has the same three holes:
1. **No memory.** Each session starts from zero.
2. **No web access.** "I can't browse the web" or flaky scrapers.
3. **No search.** Most clients wire up one provider at best.

Atlas is three MCP servers that fix all three:

- **atlas-mcp-memory** — persistent memory with full-text search, tags, importance, and namespaces
- **atlas-mcp-web** — six web extraction tools (articles, metadata, tables, links, contacts, tech stack)
- **atlas-mcp-search** — seven search providers unified (DuckDuckGo, GitHub, npm, PyPI, Stack Overflow, Wikipedia, HN)

Everything is local-first. Your memories live in a SQLite file on your disk. Web scrapes run in your own process. No API keys, no subscriptions, no cloud lock-in.

Install all three in one paste of JSON and restart your MCP client. Twenty new tools in 30 seconds.

Everything is MIT licensed. GitHub: https://github.com/Mohye24k/atlas

What would you build with persistent memory?

## Gallery image ideas

1. **Hero shot** — terminal showing `npx -y atlas-mcp-memory` output + Claude Desktop config side by side
2. **Tool list** — Claude Desktop tool palette with all 20 Atlas tools visible
3. **Memory demo** — side-by-side: Claude without Atlas ("I don't remember") vs Claude with Atlas (full context recalled)
4. **Architecture diagram** — the ASCII diagram from the README, rendered as graphics
5. **Before / after** — re-explaining context vs. Atlas remembering

## Topics

- Developer Tools
- Artificial Intelligence
- GitHub
- Open Source
- Productivity
- SaaS

## Launch day checklist

- [ ] Submit Product Hunt listing 24h before launch at 12:01am PT
- [ ] Schedule HN Show HN post for Tuesday-Thursday morning PT
- [ ] Schedule Twitter/X thread 1h before HN post
- [ ] Post to r/LocalLLaMA, r/ClaudeAI, r/MachineLearning
- [ ] DM maintainers of popular MCP directories (Smithery, modelcontextprotocol.io)
- [ ] Email AI newsletter curators: Ben's Bites, Rundown, Latent Space
- [ ] Post in Anthropic Discord, Cursor Discord, Windsurf Discord
- [ ] Cross-post to dev.to, Hashnode, Medium
