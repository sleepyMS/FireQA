// Brevo Transactional Email API — BREVO_API_KEY 미설정 시 무시 (구조만)

import { createLogger } from "@/lib/logger";

const logger = createLogger({ module: "email" });

interface SendEmailOptions {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME ?? "FireQA",
        email: process.env.BREVO_SENDER_EMAIL ?? "noreply@fireqa.app",
      },
      to: [{ email: options.to.email, name: options.to.name }],
      subject: options.subject,
      htmlContent: options.htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error("Brevo 이메일 발송 실패", { status: res.status, body });
  }
}
