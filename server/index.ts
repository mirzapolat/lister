import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { join } from 'path';
import type { AddressInfo } from 'net';
import type { Server as HttpServer } from 'http';

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_tls: string;
  sender_name: string;
  sender_email: string;
}

interface SendRequest {
  smtp: SmtpConfig;
  to: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}

function createTransporter(smtp: SmtpConfig) {
  return nodemailer.createTransport({
    host: smtp.smtp_host,
    port: Number(smtp.smtp_port),
    secure: smtp.smtp_tls === 'true' ? Number(smtp.smtp_port) === 465 : false,
    auth: smtp.smtp_username ? {
      user: smtp.smtp_username,
      pass: smtp.smtp_password,
    } : undefined,
    requireTLS: smtp.smtp_tls === 'true' && Number(smtp.smtp_port) !== 465,
    tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' },
  });
}

export interface StartServerOptions {
  allowedOrigins?: string[];
  host?: string;
  port: number;
  staticPath?: string;
}

export interface StartedServer {
  host: string;
  port: number;
  server: HttpServer;
  stop: () => Promise<void>;
  url: string;
}

function createApp(allowedOrigins?: string[]) {
  const app = express();

  if (allowedOrigins?.length) {
    const allowSet = new Set(allowedOrigins);
    app.use(cors({
      origin(origin, callback) {
        if (!origin || allowSet.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by local relay.'));
      },
    }));
  }

  app.use(express.json({ limit: '10mb' }));

  app.post('/api/send', async (req, res) => {
    const { smtp, to, toName, subject, html, text } = req.body as SendRequest;

    if (!smtp?.smtp_host || !smtp?.smtp_port) {
      return res.status(400).json({ ok: false, error: 'SMTP settings are incomplete. Please configure them in Settings.' });
    }
    if (!to) {
      return res.status(400).json({ ok: false, error: 'Recipient address is missing.' });
    }

    const transporter = createTransporter(smtp);

    const from = smtp.sender_name
      ? `"${smtp.sender_name}" <${smtp.sender_email}>`
      : smtp.sender_email;

    const toAddress = toName ? `"${toName}" <${to}>` : to;

    try {
      await transporter.sendMail({ from, to: toAddress, subject, html, text });
      res.json({ ok: true });
    } catch (e) {
      const err = e as { message?: string; responseCode?: number; response?: string };
      const error = err.message ?? String(e);
      const responseCode = err.responseCode;
      const smtpResponse = err.response;
      res.status(500).json({ ok: false, error, responseCode, smtpResponse });
    }
  });

  app.post('/api/test', async (req, res) => {
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
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return app;
}

export function startServer({
  port,
  staticPath,
  host = '127.0.0.1',
  allowedOrigins,
}: StartServerOptions): Promise<StartedServer> {
  const app = createApp(allowedOrigins);

  if (staticPath) {
    app.use(express.static(staticPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(join(staticPath, 'index.html'));
    });
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const address = server.address() as AddressInfo | null;
      if (!address) {
        reject(new Error('Local relay started without an address.'));
        return;
      }
      const url = `http://${address.address}:${address.port}`;
      console.log(`[Lister backend] Running on ${url}`);
      resolve({
        host: address.address,
        port: address.port,
        server,
        stop: () => new Promise<void>((stopResolve, stopReject) => {
          server.close((error) => {
            if (error) stopReject(error);
            else stopResolve();
          });
        }),
        url,
      });
    });

    server.on('error', reject);
  });
}
