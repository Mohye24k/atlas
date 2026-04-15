# Atlas launch playbook

**Target:** Get Atlas to #1 on Hacker News and Product Hunt on the same day. Convert that traffic into 500+ npm installs and 100+ GitHub stars in the first 24 hours.

**Target day:** Pick a Tuesday, Wednesday, or Thursday (best HN/PH traffic days). Avoid holidays and major product launch days (AWS re:Invent week, Google IO week, big Apple events).

All times are in **Pacific Time** — Hacker News and Product Hunt both center their day on PT.

---

## T-7 days: prep

- [ ] Buy `atlas-agent.dev` from Cloudflare/Porkbun (~$12/yr)
- [ ] Create npm account at [npmjs.com/signup](https://www.npmjs.com/signup), enable 2FA
- [ ] Create Vercel account and run `vercel login` once locally
- [ ] Create Product Hunt maker account if you don't have one
- [ ] Create a Twitter/X account for Atlas if you want separate brand handle
- [ ] Make sure your GitHub profile has a picture and bio (people click through from PRs)

## T-3 days: publish the packages

```bash
cd C:\Users\Future\projects\atlas
npm run build              # build every package
npm run test:smoke          # 10/10 should pass
npm run publish:npm:dry     # preview the publish
npm login                   # one time
npm run publish:npm         # actually publish all 5 MCP packages + create-atlas-mcp
```

You'll be prompted for 2FA on each publish. Just accept them.

After publish, verify each package is live:

- https://www.npmjs.com/package/atlas-mcp-memory
- https://www.npmjs.com/package/atlas-mcp-web
- https://www.npmjs.com/package/atlas-mcp-search
- https://www.npmjs.com/package/atlas-mcp-actions
- https://www.npmjs.com/package/atlas-mcp-code
- https://www.npmjs.com/package/create-atlas-mcp

Test one in a fresh terminal:
```bash
npx -y create-atlas-mcp --dry-run
```

## T-2 days: deploy the landing page

```bash
cd C:\Users\Future\projects\atlas
npm i -g vercel           # one time
vercel login              # one time
npm run deploy:vercel:prod
```

Configure `atlas-agent.dev` to point at the Vercel deployment (Cloudflare: add a CNAME to `cname.vercel-dns.com`, or use Vercel's DNS).

Verify the site is live and every link works on mobile.

## T-1 day (Monday evening): schedule everything

- [ ] Schedule the **Product Hunt listing** for Tuesday 12:01am PT using Product Hunt's "Schedule launch" feature. Use the assets in `content/launch-producthunt.md`.
- [ ] Draft the **Hacker News "Show HN" post** — save to a notes app, do not submit yet. Copy is in `content/launch-hn.md`.
- [ ] Schedule the **Twitter launch thread** for Tuesday 8:30am PT using Typefully, Buffer, or X's native scheduler. Copy is in `content/launch-twitter.md`.
- [ ] Draft emails to AI newsletter curators (don't send yet).

---

## Launch day (Tuesday)

### 00:01 PT — Product Hunt goes live

Your PH listing is now public. Ignore it for 8 hours. No one is awake anyway.

### 07:30 PT — Morning check

- [ ] Open npm and verify all 6 packages still load
- [ ] Run `npx create-atlas-mcp --dry-run` in a terminal — should still work
- [ ] Open the landing page, check every link one more time
- [ ] Have coffee. Don't post anything yet.

### 08:00 PT — Show HN post

Go to https://news.ycombinator.com/submit

**Title:** `Show HN: Atlas – Persistent memory, web access, and search for Claude via MCP`

**URL:** `https://github.com/Mohye24k/atlas`

(The URL field is what HN uses. Leave the text field empty — your first comment is where the manifesto goes.)

Submit. Immediately open the submitted thread and post the first comment as the author. Paste the full body from `content/launch-hn.md`. HN puts author comments at the top by default.

### 08:15 PT — First amplification

- Post in **r/LocalLLaMA**. Title: `I built persistent memory for Claude/Cursor via MCP — 5 servers, one install`. Link to GitHub, not HN.
- Post in **r/ClaudeAI**. Same title.
- Post in **Anthropic Discord** #mcp channel. Title: "Show: Atlas — 5 MCP servers for memory, web, search, actions, code".
- Post in **Cursor Discord** #resources channel.
- Post in **Windsurf Discord** #community channel.

### 08:30 PT — Twitter thread goes live

Your pre-scheduled thread should have posted. Quote-tweet it from any other accounts you own. DM 5–10 people in the AI developer community and ask them to retweet if they think it's useful.

### 09:00 PT — Email the curators

Send 5 short emails. One paragraph each. Use this template:

> Subject: Show HN: Atlas — open source MCP servers for memory, web, search, actions, code
>
> Hey [Name],
>
> I just shipped Atlas, a suite of 5 open source MCP servers that give Claude/Cursor/Windsurf persistent memory, clean web extraction, unified search across 7 sources, action execution, and code intelligence — all in one install.
>
> 32 tools. Zero API keys. MIT licensed.
>
> GitHub: https://github.com/Mohye24k/atlas
> HN thread: [paste]
>
> If it fits your readers, I'd love a mention. Happy to answer any questions or record a demo.
>
> Thanks,
> Mohye

Send to:
- Ben's Bites (news@bensbites.co)
- The Rundown AI (tips@therundown.ai)
- Latent Space (swyx@latent.space)
- TLDR AI (dan@tldrnewsletter.com)
- alphaSignal (tips@alphasignal.ai)

### 09:30 PT — Check HN position

If you're on the HN front page (top 30), great. Don't refresh obsessively. Open the HN thread in one tab, check every 15 minutes.

If you're NOT on the front page after 90 minutes, the submission is dead. Delete it, rewrite the title, and resubmit from a different angle ("We built persistent memory for AI agents via MCP — AMA"). Don't submit twice in a row from the same account.

### 10:00 PT — Engage on HN

For every comment on the thread:
1. Reply within 10 minutes if possible
2. Always assume good faith, even from jerks
3. If someone points out a real bug, say so and say you'll fix it
4. If someone asks for a feature, thank them and add it to a running "community asks" list
5. Never say "good question" — just answer it

The single biggest HN win is showing up as a responsive, technical, honest author in the comments. People upvote that.

### 12:00 PT — Lunch check-in

If traction is good:
- Push a v0.1.1 with any bug fixes reported in the morning
- Reply to the last hour of comments
- Thank the top commenters personally

If traction is bad:
- Don't panic
- Post in one more community you haven't hit yet (Lobsters, dev.to, Hashnode)
- Record the demo GIF if you haven't already and embed it in the HN thread

### 14:00 PT — Send the thank-you tweets

Whoever retweeted or mentioned Atlas in the morning, quote-retweet them with a personal thank-you. This keeps the algo moving.

### 16:00 PT — Product Hunt push

PH closes around midnight PT. Check your ranking. If you're outside the top 5, ask 10 friends/colleagues to upvote and comment. A single "this is great, I just installed it" comment is worth 5 silent upvotes.

### 20:00 PT — End of day summary

Post a single tweet summarizing the day:
- X npm installs
- Y GitHub stars
- Z comments on HN
- Top 3 feature requests
- "Thank you to everyone who shipped this today, here's what's next"

### 22:00 PT — Go to sleep

Tomorrow is for responding to the inbound.

---

## The day after

- [ ] Merge any simple PRs
- [ ] Ship a v0.1.1 with the top 3 reported bugs fixed
- [ ] Write a follow-up post: "Atlas launched yesterday — here's what happened in 24 hours"
- [ ] Email everyone who starred or forked the repo personally
- [ ] Add a Discord or Slack invite link to the README
- [ ] Start drafting the next launch: `atlas-mcp-files` or `atlas-mcp-code` deep dive

---

## Success metrics

Realistic targets for day 1 if the launch lands well:

| Metric | Floor | Good | Great |
|--------|-------|------|-------|
| HN position | Top 30 | Top 10 | #1 |
| Product Hunt rank | Top 20 | Top 5 | #1 |
| npm installs (24h) | 200 | 1,000 | 5,000 |
| GitHub stars (24h) | 50 | 300 | 1,500 |
| Twitter thread impressions | 5k | 50k | 500k |
| Email signups on landing | 20 | 100 | 500 |

Anything above "good" is a hit. Anything at "great" is a category-winning launch.

## If it flops

That's fine. Most launches flop. Two moves that recover a flop:

1. **Wait a week, relaunch with a different angle.** "How I built Claude's memory layer in 200 lines of TypeScript" hits a different HN crowd than "Show HN: Atlas."

2. **Ship the next piece.** `atlas-mcp-files` becomes a new launch hook. Each piece is a fresh chance to land.

The platform is permanent. Individual launches are not. One launch working pays for the next ten.
