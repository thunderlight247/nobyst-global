import { getEnv } from "./cloudflare";
import { site } from "@/data/site";

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
    if (!res.ok) console.error("resend rejected email", res.status, await res.text());
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Where admin notifications go: ADMIN_EMAIL if set, otherwise the public company inbox. */
export async function adminInbox(): Promise<string> {
  const env = await getEnv();
  return env.ADMIN_EMAIL || site.email;
}

/** The public origin for links in emails. The configured SITE_URL wins over the request host. */
export async function publicOrigin(request: Request): Promise<string> {
  const env = await getEnv();
  return env.SITE_URL || new URL(request.url).origin;
}
