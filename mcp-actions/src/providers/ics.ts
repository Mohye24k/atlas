/**
 * RFC 5545 .ics calendar event generator.
 */

import { randomUUID } from 'node:crypto';

interface IcsInput {
    title: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    organizer?: string;
    attendees?: string[];
}

export function createIcs(input: IcsInput) {
    const uid = `${randomUUID()}@atlas-agent.dev`;
    const now = toIcsDate(new Date().toISOString());
    const startDate = toIcsDate(input.start);
    const endDate = toIcsDate(input.end);

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Atlas Agent//Atlas Actions MCP 0.1//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${escapeText(input.title)}`,
    ];

    if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
    if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
    if (input.organizer) lines.push(`ORGANIZER:mailto:${input.organizer}`);
    if (input.attendees) {
        for (const email of input.attendees) {
            lines.push(`ATTENDEE;RSVP=TRUE:mailto:${email}`);
        }
    }

    lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'END:VEVENT', 'END:VCALENDAR');

    // ICS lines use CRLF terminators per RFC 5545
    const content = lines.join('\r\n') + '\r\n';
    const base64 = Buffer.from(content, 'utf-8').toString('base64');

    return {
        ok: true,
        uid,
        filename: sanitizeFilename(input.title) + '.ics',
        mimeType: 'text/calendar',
        contentBase64: base64,
        content,
    };
}

function toIcsDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`invalid date: ${iso}`);
    // Format: YYYYMMDDTHHMMSSZ (UTC)
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        'Z'
    );
}

function escapeText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase().slice(0, 60);
}
