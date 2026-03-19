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
    tls: { rejectUnauthorized: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { smtp } = req.body as { smtp: SmtpConfig };

  if (!smtp?.smtp_host || !smtp?.smtp_port) {
    return res.status(400).json({ ok: false, error: 'SMTP settings are incomplete.' });
  }

  try {
    const transporter = createTransporter(smtp);
    await transporter.verify();
    res.json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    res.json({ ok: false, error });
  }
}
