/**
 * SMTP email sender using nodemailer.
 *
 * Requires the SMTP_URL env var. Accepted formats:
 *   smtps://user:pass@smtp.gmail.com:465
 *   smtp://user:pass@smtp.mailgun.org:587?secure=false
 *
 * Optionally set EMAIL_FROM to control the default From address.
 */

import nodemailer from 'nodemailer';

interface EmailInput {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (transporter) return transporter;
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
        throw new Error(
            'SMTP_URL environment variable not set. Example: SMTP_URL="smtps://user:pass@smtp.gmail.com:465"',
        );
    }
    transporter = nodemailer.createTransport(smtpUrl);
    return transporter;
}

export async function sendEmail(input: EmailInput) {
    const tx = getTransporter();
    const fromAddress =
        input.from ||
        process.env.EMAIL_FROM ||
        'Atlas Agent <noreply@atlas-agent.dev>';

    if (!input.text && !input.html) {
        throw new Error('email must include either text or html');
    }

    const info = await tx.sendMail({
        from: fromAddress,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        text: input.text,
        html: input.html,
    });

    // eslint-disable-next-line no-console
    console.error(`[atlas-actions] email sent: ${info.messageId} to ${JSON.stringify(input.to)}`);

    return {
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
    };
}
