import { NextResponse } from "next/server";
import { getEnv } from "./cloudflare";
import { currentSessionHash } from "./auth";

/**
 * Re-confirmation before risky actions (docs/AUTH_PLAN.md, phase 3). A session counts as recently
 * confirmed for REAUTH_MINUTES after signing in with its 2FA code, or after passing the
 * "Confirm it's you" dialog (password + code).
 */
export const REAUTH_MINUTES = 15;

export async function markReauthenticated(sessionHash: string): Promise<void> {
  try {
    const { DB } = await getEnv();
    await DB.prepare("UPDATE sessions SET reauth_at = ? WHERE token_hash = ?")
      .bind(new Date().toISOString(), sessionHash)
      .run();
  } catch (err) {
    // Before migration 0014 there is no reauth_at column; risky actions then keep asking.
    console.error("could not record re-confirmation", err);
  }
}

/**
 * Guard for risky admin actions. Returns a 403 `{ reauthRequired: true }` response when this
 * session has not confirmed it's the account owner in the last REAUTH_MINUTES, otherwise null.
 * The admin UI answers that response with the "Confirm it's you" dialog and retries.
 */
export async function requireRecentAuth(): Promise<NextResponse | null> {
  const ask = NextResponse.json(
    { error: "Please confirm it's you to continue.", reauthRequired: true },
    { status: 403 }
  );
  const hash = await currentSessionHash();
  if (!hash) return ask;
  try {
    const { DB } = await getEnv();
    const row = await DB.prepare("SELECT reauth_at FROM sessions WHERE token_hash = ?")
      .bind(hash)
      .first<{ reauth_at: string | null }>();
    const at = row?.reauth_at ? Date.parse(row.reauth_at) : NaN;
    return Number.isFinite(at) && Date.now() - at < REAUTH_MINUTES * 60_000 ? null : ask;
  } catch {
    return ask;
  }
}
