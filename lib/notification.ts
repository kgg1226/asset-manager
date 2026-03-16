/**
 * 알림 헬퍼 (Slack Webhook + SMTP Email)
 *
 * 설정 우선순위: DB(SystemConfig) > 환경변수
 * DB에 저장된 값이 없으면 process.env 폴백
 */

import nodemailer from "nodemailer";
import { getNotificationConfig } from "@/lib/system-config";

export type NotifyResult = { ok: true } | { ok: false; error: string };

// ── Slack ────────────────────────────────────────────────────────────────────

export async function sendSlackMessage(text: string): Promise<NotifyResult> {
  const config = await getNotificationConfig();
  const webhookUrl = config.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "SLACK_WEBHOOK_URL not configured" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Slack API error ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<NotifyResult> {
  const config = await getNotificationConfig();
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = config;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return { ok: false, error: "SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM 필요)" };
  }

  const port = Number(config.SMTP_PORT ?? 587);
  const secure = config.SMTP_SECURE === "true";

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      ...(options.html && { html: options.html }),
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
