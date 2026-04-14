# atlas-mcp-web

**Give your AI agent the ability to understand any web page.** A premium Model Context Protocol (MCP) server that adds 6 powerful web extraction tools to Claude, Cursor, Windsurf, and any MCP-compatible AI agent.

No more "sorry, I can't browse the web for you." Your agent gets instant, structured access to:

- Clean article text for RAG and summarization
- Complete metadata (Open Graph, Twitter Card, JSON-LD)
- HTML tables as structured data
- All links, grouped and classified
- Contact info (emails, phones, socials)
- Website tech stack detection (70+ technologies)

## Install

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "atlas-web": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-web"]
    }
  }
}
```

Restart Claude Desktop. The 6 tools will appear in the tool menu.

### Cursor / Windsurf

Add to your MCP config:

```json
{
  "mcpServers": {
    "atlas-web": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-web"]
    }
  }
}
```

### Test locally

```bash
npx -y atlas-mcp-web
```

## Tools

### `extract_article`

Pull the main body of any news article or blog post. Strips ads, nav, comments, and boilerplate. Returns clean text plus metadata.

**Input**
```json
{ "url": "https://www.bbc.com/news/articles/..." }
```

**Output**
```json
{
  "url": "...",
  "title": "Major AI breakthrough announced",
  "description": "Researchers report...",
  "authors": ["Jane Doe"],
  "publishedAt": "2026-04-13T08:00:00Z",
  "image": "https://...",
  "siteName": "BBC News",
  "language": "en",
  "content": "The full cleaned body of the article...",
  "wordCount": 842,
  "readingTimeMinutes": 4,
  "keywords": ["AI", "research", "machine learning"]
}
```

### `extract_metadata`

Complete URL metadata for link previews, SEO audits, and bookmarks: Open Graph, Twitter Card, JSON-LD structured data, favicons, and more.

### `extract_tables`

Pull every HTML table on a page as structured arrays with headers and rows. Perfect for financial data, sports stats, product comparisons.

### `extract_links`

All links on a page, grouped by internal / external / social / email / phone. With anchor text.

### `extract_contact`

Scan a page for contact details: emails, phone numbers, and social media handles (Twitter, LinkedIn, Instagram, Facebook, YouTube, GitHub, TikTok). Ideal for lead generation.

### `detect_tech_stack`

Identify the technologies powering a website: CMS, JS frameworks, CDN, analytics, hosting, ecommerce, marketing tools. 70+ signatures supported.

## Why Cortex?

- **Free and open source** (MIT license)
- **No API key required** — everything runs locally through your MCP client
- **Fast** — pure HTTP + Cheerio, no headless browser
- **Private** — your agent hits the target site directly, no middleman logs your queries
- **Premium options** — upgrade to the hosted API at [atlas-agent.dev](https://atlas-agent.dev) for proxy rotation, JS rendering, and higher rate limits

## Use cases

- **Research agents** — Give Claude the ability to read any article in full, not just the title
- **Sales tools** — Automate lead generation by extracting contact info from company pages
- **SEO audits** — Scan hundreds of competitor URLs for tech stack, metadata, and structured data
- **RAG pipelines** — Feed clean article content directly into your vector database
- **Link preview generators** — Power Discord/Slack-style unfurls in your own apps

## License

MIT © Cortex

## Support

Issues and feature requests: [github.com/atlas-agent/mcp-web-extractor/issues](https://github.com/atlas-agent/mcp-web-extractor/issues)
