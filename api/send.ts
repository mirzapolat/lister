import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_tls: string;
  sender_name: string;
  sender_email: string;
}

function createTransporter(smtp: SmtpConfig) {
  return nodemailer.createTransport({
    host: smtp.smtp_host,
    port: Number(smtp.smtp_port),
    secure: smtp.smtp_tls === 'true' ? Number(smtp.smtp_port) === 465 : false,
    auth: smtp.smtp_username ? { user: smtp.smtp_username, pass: smtp.smtp_password } : undefined,
    requireTLS: smtp.smtp_tls === 'true' && Number(smtp.smtp_port) !== 465,
    tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { smtp, to, toName, subject, html, text } = req.body as {
    smtp: SmtpConfig; to: string; toName: string; subject: string; html: string; text: string;
  };

  if (!smtp?.smtp_host || !smtp?.smtp_port) {
    return res.status(400).json({ ok: false, error: 'SMTP settings are incomplete. Please configure them in Settings.' });
  }
  if (!to) {
    return res.status(400).json({ ok: false, error: 'Recipient address is missing.' });
  }

  try {
    const transporter = createTransporter(smtp);
    const from = smtp.sender_name ? `"${smtp.sender_name}" <${smtp.sender_email}>` : smtp.sender_email;
    const toAddress = toName ? `"${toName}" <${to}>` : to;
    await transporter.sendMail({ from, to: toAddress, subject, html, text });
    res.json({ ok: true });
  } catch (e) {
    const err = e as { message?: string; responseCode?: number; response?: string };
    const error = err.message ?? String(e);
    const responseCode = err.responseCode;
    const smtpResponse = err.response;
    res.status(500).json({ ok: false, error, responseCode, smtpResponse });
  }
}
