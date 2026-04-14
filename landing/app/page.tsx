import Link from 'next/link';

const TOOLS = [
    {
        name: 'extract_article',
        description:
            'Clean article body from any news article or blog post. Strips ads, nav, comments. Returns title, authors, date, content, word count.',
        icon: 'ARTICLE',
    },
    {
        name: 'extract_metadata',
        description:
            'Open Graph, Twitter Card, JSON-LD structured data, favicons, canonical URL. Everything you need for link previews.',
        icon: 'META',
    },
    {
        name: 'extract_tables',
        description:
            'All HTML tables as structured arrays with headers and rows. Perfect for financial data, stats, product comparisons.',
        icon: 'TABLE',
    },
    {
        name: 'extract_links',
        description:
            'All links grouped by internal, external, social media, email, and phone. With anchor text for each.',
        icon: 'LINKS',
    },
    {
        name: 'extract_contact',
        description:
            'Emails, phone numbers, social handles (Twitter, LinkedIn, GitHub, etc). Ideal for lead generation.',
        icon: 'CONTACT',
    },
    {
        name: 'detect_tech_stack',
        description:
            '70+ technologies detected: CMS, frameworks, CDN, analytics, hosting, ecommerce. Like Wappalyzer for your AI.',
        icon: 'STACK',
    },
];

const USE_CASES = [
    {
        title: 'Research agents',
        body: 'Give Claude the ability to read any article in full, not just the title. Summarize, compare, cite sources with confidence.',
    },
    {
        title: 'Sales prospecting',
        body: 'Let your agent scan company websites and pull emails, phones, and social handles automatically. No manual copy-paste.',
    },
    {
        title: 'RAG pipelines',
        body: 'Feed clean article content straight into your vector database without writing custom scrapers for every publisher.',
    },
    {
        title: 'SEO audits',
        body: 'Analyze competitor URLs for tech stack, metadata, structured data, and broken links in seconds.',
    },
];

export default function Home() {
    return (
        <main className="min-h-screen">
            {/* Nav */}
            <nav className="border-b border-neutral-800/60 backdrop-blur sticky top-0 z-50 bg-neutral-950/80">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-400" />
                        <span className="font-semibold text-lg">Cortex</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <a href="#tools" className="text-neutral-400 hover:text-white transition">
                            Tools
                        </a>
                        <a href="#install" className="text-neutral-400 hover:text-white transition">
                            Install
                        </a>
                        <a href="#pricing" className="text-neutral-400 hover:text-white transition">
                            Pricing
                        </a>
                        <a
                            href="https://github.com/atlas-agent"
                            className="text-neutral-400 hover:text-white transition"
                        >
                            GitHub
                        </a>
                        <Link
                            href="/signup"
                            className="bg-white text-neutral-900 px-4 py-1.5 rounded-lg font-medium hover:bg-neutral-200 transition"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="max-w-6xl mx-auto px-6 pt-24 pb-32 text-center">
                <div className="inline-flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 mb-6">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                    Now live on npm — works with Claude, Cursor, Windsurf
                </div>
                <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 gradient-text">
                    Web data for AI agents.
                </h1>
                <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    The premium Model Context Protocol server that gives your AI agent instant
                    structured access to any web page.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
                    <a
                        href="#install"
                        className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-semibold text-lg hover:bg-neutral-200 transition w-full sm:w-auto"
                    >
                        Install free →
                    </a>
                    <Link
                        href="/signup"
                        className="border border-neutral-700 px-6 py-3 rounded-xl font-semibold text-lg hover:border-neutral-500 transition w-full sm:w-auto"
                    >
                        Upgrade to Pro — $19/mo
                    </Link>
                </div>

                {/* Install snippet */}
                <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-left text-sm font-mono">
                    <div className="text-neutral-500 mb-2"># Add to your MCP client config</div>
                    <pre className="text-neutral-200 overflow-x-auto">
{`{
  "mcpServers": {
    "atlas-web": {
      "command": "npx",
      "args": ["-y", "atlas-mcp-web"]
    }
  }
}`}
                    </pre>
                </div>
            </section>

            {/* Tools grid */}
            <section id="tools" className="max-w-6xl mx-auto px-6 py-20 border-t border-neutral-800/60">
                <div className="text-center mb-14">
                    <h2 className="text-4xl font-bold mb-4">Six tools. One install.</h2>
                    <p className="text-neutral-400 text-lg">
                        Atlas adds these capabilities to your AI agent the moment you install it.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TOOLS.map((tool) => (
                        <div
                            key={tool.name}
                            className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition"
                        >
                            <div className="text-xs font-mono text-teal-400 mb-2">{tool.icon}</div>
                            <div className="font-mono text-indigo-300 text-sm mb-3">{tool.name}()</div>
                            <p className="text-neutral-400 text-sm leading-relaxed">{tool.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Use cases */}
            <section className="max-w-6xl mx-auto px-6 py-20 border-t border-neutral-800/60">
                <div className="text-center mb-14">
                    <h2 className="text-4xl font-bold mb-4">Built for real work.</h2>
                    <p className="text-neutral-400 text-lg">
                        Atlas powers production workflows at agencies, indie hackers, and AI-first
                        startups.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {USE_CASES.map((u) => (
                        <div
                            key={u.title}
                            className="bg-gradient-to-br from-neutral-900 to-neutral-900/50 border border-neutral-800 rounded-xl p-8"
                        >
                            <h3 className="text-xl font-semibold mb-3">{u.title}</h3>
                            <p className="text-neutral-400 leading-relaxed">{u.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Install */}
            <section id="install" className="max-w-4xl mx-auto px-6 py-20 border-t border-neutral-800/60">
                <h2 className="text-4xl font-bold mb-10 text-center">Install in under a minute</h2>
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <div className="text-sm text-neutral-500 mb-2">1. Claude Desktop</div>
                        <p className="text-neutral-400 mb-4">
                            Edit{' '}
                            <code className="text-indigo-300 font-mono text-sm">
                                ~/Library/Application Support/Claude/claude_desktop_config.json
                            </code>{' '}
                            (macOS) or{' '}
                            <code className="text-indigo-300 font-mono text-sm">
                                %APPDATA%\Claude\claude_desktop_config.json
                            </code>{' '}
                            (Windows) and add the snippet above. Restart Claude Desktop.
                        </p>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <div className="text-sm text-neutral-500 mb-2">2. Cursor / Windsurf</div>
                        <p className="text-neutral-400 mb-4">
                            Open Settings, find the MCP section, and paste the same JSON. The six
                            tools will appear in your tool palette.
                        </p>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <div className="text-sm text-neutral-500 mb-2">3. Test it</div>
                        <p className="text-neutral-400">
                            Ask your agent: <em className="text-neutral-200">"extract the article at https://news.ycombinator.com and summarize the top comment"</em>. You'll see the tool fire.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="max-w-5xl mx-auto px-6 py-20 border-t border-neutral-800/60">
                <h2 className="text-4xl font-bold mb-4 text-center">Simple pricing</h2>
                <p className="text-neutral-400 text-lg text-center mb-12">
                    Start free. Upgrade when you hit scale.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8">
                        <div className="text-sm text-neutral-500 mb-2">Free</div>
                        <div className="text-4xl font-bold mb-4">$0</div>
                        <ul className="space-y-2 text-neutral-400 text-sm mb-6">
                            <li>All 6 tools</li>
                            <li>100 requests / day</li>
                            <li>Self-hosted MCP server</li>
                            <li>Community support</li>
                        </ul>
                        <a
                            href="#install"
                            className="block text-center border border-neutral-700 rounded-lg px-4 py-2 hover:border-neutral-500 transition"
                        >
                            Install free
                        </a>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-900/30 to-teal-900/20 border border-indigo-600/40 rounded-xl p-8 md:scale-105 shadow-xl shadow-indigo-900/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-indigo-300">Pro</div>
                            <div className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                Popular
                            </div>
                        </div>
                        <div className="text-4xl font-bold mb-4">
                            $19<span className="text-lg text-neutral-400">/mo</span>
                        </div>
                        <ul className="space-y-2 text-neutral-300 text-sm mb-6">
                            <li>Everything in Free</li>
                            <li>10,000 requests / day</li>
                            <li>Hosted REST API</li>
                            <li>Proxy rotation included</li>
                            <li>JS-rendered page support</li>
                            <li>Email support</li>
                        </ul>
                        <Link
                            href="/signup"
                            className="block text-center bg-white text-neutral-900 rounded-lg px-4 py-2 font-semibold hover:bg-neutral-200 transition"
                        >
                            Start 14-day trial
                        </Link>
                    </div>
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8">
                        <div className="text-sm text-neutral-500 mb-2">Enterprise</div>
                        <div className="text-4xl font-bold mb-4">
                            $99<span className="text-lg text-neutral-400">/mo</span>
                        </div>
                        <ul className="space-y-2 text-neutral-400 text-sm mb-6">
                            <li>Everything in Pro</li>
                            <li>Unlimited requests</li>
                            <li>Dedicated proxies</li>
                            <li>SLA + priority support</li>
                            <li>Custom signatures</li>
                            <li>On-prem deployment</li>
                        </ul>
                        <a
                            href="mailto:sales@atlas-agent.dev"
                            className="block text-center border border-neutral-700 rounded-lg px-4 py-2 hover:border-neutral-500 transition"
                        >
                            Contact sales
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-neutral-800/60 text-sm text-neutral-500">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-teal-400" />
                            <span className="font-semibold text-neutral-300">Cortex</span>
                        </div>
                        <p>Web data infrastructure for AI agents.</p>
                    </div>
                    <div className="flex gap-10">
                        <div>
                            <div className="text-neutral-300 font-medium mb-2">Product</div>
                            <div className="space-y-1">
                                <div>Tools</div>
                                <div>Pricing</div>
                                <div>Docs</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-neutral-300 font-medium mb-2">Company</div>
                            <div className="space-y-1">
                                <div>About</div>
                                <div>Blog</div>
                                <div>Contact</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-neutral-800/60">
                    © 2026 Atlas. MIT licensed MCP server. Built for the MCP ecosystem.
                </div>
            </footer>
        </main>
    );
}
