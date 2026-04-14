/**
 * Extract all HTML tables as structured rows with headers.
 */

import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';

export function extractTables({ url, $ }: { url: string; $: CheerioAPI }) {
    const tables: Array<{
        index: number;
        caption: string | null;
        headers: string[];
        rows: Record<string, string>[];
        rowCount: number;
    }> = [];

    $('table').each((index, tableEl) => {
        const $table = $(tableEl);
        const caption = ($table.find('caption').first().text() || '').trim() || null;

        const headers = extractHeaders($, $table);
        const rows = extractRows($, $table, headers);

        if (rows.length > 0) {
            tables.push({
                index,
                caption,
                headers,
                rows,
                rowCount: rows.length,
            });
        }
    });

    return {
        url,
        tableCount: tables.length,
        tables,
    };
}

function extractHeaders($: CheerioAPI, $table: Cheerio<AnyNode>): string[] {
    // Try explicit thead first
    const $thead = $table.find('thead').first();
    if ($thead.length) {
        const headers = $thead
            .find('th, td')
            .map((_, el) => $(el).text().trim())
            .get();
        if (headers.length) return headers;
    }

    // Fall back to first row with <th>
    const $firstThRow = $table.find('tr').filter((_, tr) => $(tr).find('th').length > 0).first();
    if ($firstThRow.length) {
        return $firstThRow
            .find('th, td')
            .map((_, el) => $(el).text().trim())
            .get();
    }

    // Fall back to first row
    const $firstRow = $table.find('tr').first();
    if ($firstRow.length) {
        return $firstRow
            .find('td, th')
            .map((_, el) => $(el).text().trim())
            .get();
    }

    return [];
}

function extractRows(
    $: CheerioAPI,
    $table: Cheerio<AnyNode>,
    headers: string[],
): Record<string, string>[] {
    const rows: Record<string, string>[] = [];
    const $bodyRows = $table.find('tbody tr');
    const $rows = $bodyRows.length ? $bodyRows : $table.find('tr').slice(headers.length ? 1 : 0);

    $rows.each((_, tr) => {
        const cells = $(tr)
            .find('td, th')
            .map((_, el) => $(el).text().trim())
            .get();
        if (cells.length === 0) return;

        const row: Record<string, string> = {};
        for (let i = 0; i < cells.length; i++) {
            const key = headers[i] || `column_${i + 1}`;
            row[key] = cells[i];
        }
        rows.push(row);
    });

    return rows;
}
