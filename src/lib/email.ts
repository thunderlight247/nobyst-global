import { getEnv } from "./cloudflare";

const RESEND_API = "https://api.resend.com/emails";

/**
 * Sends one transactional email through Resend. Returns false instead of throwing
 * so a mail outage never breaks sign-up or checkout.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const env = await getEnv();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.error("email not sent: RESEND_API_KEY or EMAIL_FROM is not set");
    return false;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error("resend rejected email", res.status);
    return res.ok;
  } catch (err) {
    console.error("resend request failed", err);
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
