import { getEnv } from "./cloudflare";
import { randomToken, sha256Hex } from "./auth";
import { openSecret, sealSecret } from "./secret-box";
import { generateSecret, matchTotp, otpauthUri } from "./totp";

/**
 * Two-step sign-in with an authenticator app. Required for admins and owners (enforced in
 * auth.ts), optional for partners. See docs/AUTH_PLAN.md, phase 2.
 */

const RECOVERY_CODE_COUNT = 10;

export type TwoFactorStatus = { enabled: boolean; recoveryCodesLeft: number };

/** Whether the account has 2FA on. False if the 2FA tables do not exist yet. */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const { DB } = await getEnv();
    const row = await DB.prepare("SELECT enabled_at FROM user_totp WHERE user_id = ?").bind(userId).first<{ enabled_at: string | null }>();
    return Boolean(row?.enabled_at);
  } catch {
    return false;
  }
}

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT enabled_at FROM user_totp WHERE user_id = ?")
    .bind(userId)
    .first<{ enabled_at: string | null }>();
  const left = await DB.prepare(
    "SELECT COUNT(*) AS n FROM recovery_codes WHERE user_id = ? AND used_at IS NULL"
  )
    .bind(userId)
    .first<{ n: number }>();
  return { enabled: Boolean(row?.enabled_at), recoveryCodesLeft: left?.n ?? 0 };
}

/**
 * Starts setup: a new secret is stored encrypted but not active until a first code confirms it.
 * Calling again restarts setup with a fresh secret. Refused once 2FA is on.
 */
export async function beginSetup(user: { id: string; email: string }): Promise<{ secret: string; uri: string } | null> {
  const env = await getEnv();
  const existing = await env.DB.prepare("SELECT enabled_at FROM user_totp WHERE user_id = ?")
    .bind(user.id)
    .first<{ enabled_at: string | null }>();
  if (existing?.enabled_at) return null;

  const secret = generateSecret();
  const sealed = await sealSecret(secret, env.TOTP_ENCRYPTION_KEY);
  await env.DB.prepare(
    `INSERT INTO user_totp (user_id, secret_ciphertext) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET secret_ciphertext = excluded.secret_ciphertext,
       enabled_at = NULL, last_used_step = NULL, created_at = datetime('now')`
  )
    .bind(user.id, sealed)
    .run();
  return { secret, uri: otpauthUri(user.email, secret) };
}

function newRecoveryCode(): string {
  // 10 characters from a 160-bit random token, shown as xxxxx-xxxxx.
  const raw = randomToken(16).replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10).padEnd(10, "x");
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

function normaliseRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Replaces all recovery codes; returns the new plaintext codes (shown once, never stored). */
export async function replaceRecoveryCodes(userId: string): Promise<string[]> {
  const { DB } = await getEnv();
  await DB.prepare("DELETE FROM recovery_codes WHERE user_id = ?").bind(userId).run();
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = newRecoveryCode();
    codes.push(code);
    await DB.prepare("INSERT INTO recovery_codes (code_hash, user_id) VALUES (?, ?)")
      .bind(await sha256Hex(normaliseRecoveryCode(code)), userId)
      .run();
  }
  return codes;
}

/**
 * Confirms setup with a first code. Turns 2FA on, issues recovery codes, marks the current session
 * as verified and signs out every other session of the account.
 */
export async function confirmSetup(
  userId: string,
  code: string,
  currentSessionHash: string
): Promise<string[] | null> {
  const env = await getEnv();
  const row = await env.DB.prepare("SELECT secret_ciphertext, enabled_at FROM user_totp WHERE user_id = ?")
    .bind(userId)
    .first<{ secret_ciphertext: string; enabled_at: string | null }>();
  if (!row || row.enabled_at) return null;
  const secret = await openSecret(row.secret_ciphertext, env.TOTP_ENCRYPTION_KEY);
  const step = await matchTotp(secret, code, Date.now(), null);
  if (step === null) return null;

  await env.DB.prepare(
    "UPDATE user_totp SET enabled_at = datetime('now'), last_used_step = ? WHERE user_id = ? AND enabled_at IS NULL"
  )
    .bind(step, userId)
    .run();
  const codes = await replaceRecoveryCodes(userId);
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?")
    .bind(userId, currentSessionHash)
    .run();
  await markSessionVerified(currentSessionHash);
  return codes;
}

/**
 * Checks a second-step code: a 6-digit authenticator code, or a recovery code. Each is accepted
 * at most once (the step or the recovery code is claimed atomically).
 */
export async function verifySecondStep(userId: string, input: string): Promise<"totp" | "recovery" | null> {
  const env = await getEnv();
  const code = input.trim();

  if (/^\d{3}\s?\d{3}$/.test(code)) {
    const row = await env.DB.prepare(
      "SELECT secret_ciphertext, last_used_step FROM user_totp WHERE user_id = ? AND enabled_at IS NOT NULL"
    )
      .bind(userId)
      .first<{ secret_ciphertext: string; last_used_step: number | null }>();
    if (!row) return null;
    const secret = await openSecret(row.secret_ciphertext, env.TOTP_ENCRYPTION_KEY);
    const step = await matchTotp(secret, code, Date.now(), row.last_used_step);
    if (step === null) return null;
    const claimed = await env.DB.prepare(
      `UPDATE user_totp SET last_used_step = ?
       WHERE user_id = ? AND enabled_at IS NOT NULL AND (last_used_step IS NULL OR last_used_step < ?)`
    )
      .bind(step, userId, step)
      .run();
    return (claimed.meta?.changes ?? 0) > 0 ? "totp" : null;
  }

  const normalised = normaliseRecoveryCode(code);
  if (normalised.length !== 10) return null;
  const used = await env.DB.prepare(
    "UPDATE recovery_codes SET used_at = datetime('now') WHERE code_hash = ? AND user_id = ? AND used_at IS NULL"
  )
    .bind(await sha256Hex(normalised), userId)
    .run();
  return (used.meta?.changes ?? 0) > 0 ? "recovery" : null;
}

export async function markSessionVerified(sessionHash: string): Promise<void> {
  const { DB } = await getEnv();
  await DB.prepare("UPDATE sessions SET mfa_verified_at = datetime('now') WHERE token_hash = ?")
    .bind(sessionHash)
    .run();
}

/** Turns 2FA off for an account (partner choice, or an owner's reset) and signs it out everywhere. */
export async function removeTwoFactor(userId: string, keepSessionHash: string | null = null): Promise<void> {
  const { DB } = await getEnv();
  await DB.prepare("DELETE FROM user_totp WHERE user_id = ?").bind(userId).run();
  await DB.prepare("DELETE FROM recovery_codes WHERE user_id = ?").bind(userId).run();
  if (keepSessionHash) {
    await DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(userId, keepSessionHash).run();
  } else {
    await DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  }
}
