import { getEnv } from "./cloudflare";
import { randomToken, sha256Hex } from "./auth";
import { escapeHtml, sendEmail } from "./email";

/**
 * "Confirm your email" for new accounts. A customer must confirm before paying, so orders,
 * receipts and delivery messages go to an inbox the customer really controls.
 */

const VERIFY_HOURS = 48;

export async function markEmailVerified(userId: string): Promise<void> {
  try {
    const { DB } = await getEnv();
    await DB.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?")
      .bind(userId)
      .run();
  } catch (err) {
    console.warn("could not mark email verified (run migration 0018?)", err);
  }
}

/** Creates a single-use link token and emails it. Returns false if the email was not sent. */
export async function sendVerificationEmail(
  user: { id: string; email: string; name: string },
  origin: string
): Promise<boolean> {
  const { DB } = await getEnv();
  const token = randomToken();
  const expires = new Date(Date.now() + VERIFY_HOURS * 3_600_000).toISOString();
  // Only the newest link works.
  await DB.prepare("UPDATE email_verifications SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL")
    .bind(user.id)
    .run();
  await DB.prepare("INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), user.id, expires)
    .run();
  const link = `${origin}/account/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail(
    user.email,
    "Confirm your email for NOBYST GLOBAL",
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0B1F4B;max-width:560px">
<p>Hello ${escapeHtml(user.name)},</p>
<p>Welcome to NOBYST GLOBAL. Please confirm this is your email address so we can send your receipts and delivery updates here.</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#0B1F4B;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:bold">Confirm my email</a></p>
<p style="font-size:13px;color:#555">The link works once and expires in ${VERIFY_HOURS} hours. If you did not create an account, you can ignore this email.</p>
<p>The NOBYST GLOBAL team</p>
</div>`
  );
}

/** Uses a link token: marks the account verified and returns its email, or null if invalid. */
export async function confirmEmail(token: string): Promise<{ userId: string; email: string } | null> {
  if (!token || token.length > 200) return null;
  const { DB } = await getEnv();
  const now = new Date().toISOString();
  const claimed = await DB.prepare(
    `UPDATE email_verifications SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
     RETURNING user_id`
  )
    .bind(now, await sha256Hex(token), now)
    .first<{ user_id: string }>();
  if (!claimed) return null;
  await markEmailVerified(claimed.user_id);
  const user = await DB.prepare("SELECT email FROM users WHERE id = ?").bind(claimed.user_id).first<{ email: string }>();
  return user ? { userId: claimed.user_id, email: user.email } : null;
}
