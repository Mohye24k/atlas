# atlas-mcp-actions

**Let your AI agent DO things.** Send emails, fire webhooks, hit any HTTP API, generate calendar invites, and (opt-in) run shell commands — all through a single MCP server install.

Part of [Atlas](https://atlas-agent.dev) — infrastructure for AI agents.

## Tools

- `send_email` — Send an email via SMTP (requires `SMTP_URL`)
- `fire_webhook` — POST JSON to any URL (Zapier, Discord, Slack, custom)
- `http_request` — Generic HTTP request (GET/POST/PUT/PATCH/DELETE)
- `create_ics` — Generate an RFC 5545 calendar event as base64-encoded .ics
- `run_shell_command` — Run a whitelisted shell command (opt-in via env var)

## Install

Add to your MCP client config:

```json
{
  "mcpServers": {
    "atlas-actions": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-actions"],
      "env": {
        "SMTP_URL": "smtps://user:pass@smtp.gmail.com:465",
        "EMAIL_FROM": "Atlas Agent <agent@example.com>"
      }
    }
  }
}
```

Only `send_email` requires the SMTP env vars. All other tools work without any configuration.

## Safety model

Actions are powerful — we took safety seriously:

1. **Every action is explicit.** The agent cannot chain actions without your approval step in Claude Desktop / Cursor / Windsurf.
2. **Email requires SMTP.** No silent sends. If `SMTP_URL` isn't set, the tool returns an error instead of attempting anything.
3. **Shell is off by default.** Set `ATLAS_SHELL_ALLOWLIST="git status,npm test,ls"` to allow only specific command prefixes.
4. **Every action logs to stderr.** You can watch the MCP stderr stream to audit what your agent did.

## Example: email a daily brief

```
User: "Email me a summary of the top 5 HN stories at 9am every morning."

Agent plan:
  1. call atlas-search/search_hackernews — top 5 stories today
  2. call atlas-web/extract_article for each
  3. call atlas-actions/send_email with the summary
```

With the memory server also installed, the agent remembers your address and preferred schedule across sessions. One setup, works forever.

## Example: book a meeting

```
User: "Schedule a 30-min meeting with alex@example.com tomorrow at 2pm to review the Q3 roadmap."

Agent plan:
  1. call atlas-actions/create_ics — generate the .ics file
  2. call atlas-actions/send_email — send to alex with the .ics attached
```

## Example: hit a Discord webhook

```
User: "Post 'deploy complete' to my Discord channel."

Agent plan:
  1. call atlas-actions/fire_webhook — POST {"content": "deploy complete"} to the Discord URL
```

## Environment variables

| Variable | Required by | Description |
|----------|-------------|-------------|
| `SMTP_URL` | `send_email` | SMTP connection string. Gmail: `smtps://USER:APP_PASSWORD@smtp.gmail.com:465` |
| `EMAIL_FROM` | `send_email` | Default FROM address. Falls back to `Atlas Agent <noreply@atlas-agent.dev>` |
| `ATLAS_SHELL_ALLOWLIST` | `run_shell_command` | Comma-separated list of allowed command prefixes. Empty = shell disabled. |

## License

MIT
