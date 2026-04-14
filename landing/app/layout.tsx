import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Atlas — Web data for AI agents',
    description:
        'A premium Model Context Protocol server that gives Claude, Cursor, Windsurf and any MCP-compatible AI agent the ability to extract clean, structured data from any web page. Articles, metadata, tables, contacts, tech stack — all in one install.',
    keywords: [
        'MCP server',
        'Model Context Protocol',
        'AI agents',
        'Claude',
        'Cursor',
        'Windsurf',
        'web scraping',
        'data extraction',
        'RAG',
    ],
    openGraph: {
        title: 'Atlas — Web data for AI agents',
        description:
            'Give your AI agent instant structured access to any web page. Free, open source, works with every MCP client.',
        url: 'https://atlas-agent.dev',
        siteName: 'Cortex',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Atlas — Web data for AI agents',
        description:
            'The MCP server that gives Claude, Cursor, and Windsurf the ability to understand any web page.',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased bg-neutral-950 text-neutral-100">{children}</body>
        </html>
    );
}
