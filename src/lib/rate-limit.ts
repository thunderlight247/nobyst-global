import { NextResponse } from "next/server";
import { getEnv } from "./cloudflare";

export type Limit = { limit: number; windowSeconds: number };

/** The connecting client's IP as Cloudflare reports it. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Counts one hit against `key` in a fixed window stored in D1.
 * Returns true when the request is allowed. If the table is missing or D1 errors,
 * it fails open so a storage problem never locks every customer out.
 */
export async function hit(key: string, { limit, windowSeconds }: Limit): Promise<boolean> {
  try {
    const { DB } = await getEnv();
    const now = Date.now();
    const windowEnd = now + windowSeconds * 1000;
    // Start a new window if the old one expired, otherwise increment it.
    const row = await DB.prepare(
      `INSERT INTO rate_limits (key, count, window_end) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_end <= ? THEN 1 ELSE rate_limits.count + 1 END,
         window_end = CASE WHEN rate_limits.window_end <= ? THEN excluded.window_end ELSE rate_limits.window_end END
       RETURNING count`
    )
      .bind(key, windowEnd, now, now)
      .first<{ count: number }>();

    // Occasionally prune expired rows so the table stays small.
    if (Math.random() < 0.02) {
      await DB.prepare("DELETE FROM rate_limits WHERE window_end <= ?").bind(now).run();
    }
    return (row?.count ?? 0) <= limit;
  } catch (err) {
    console.error("rate limit check failed", err);
    return true;
  }
}

/** Forgets a counter, e.g. after a correct 2FA code, so only wrong guesses add up. */
export async function clearLimit(key: string): Promise<void> {
  try {
    const { DB } = await getEnv();
    await DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(key).run();
  } catch (err) {
    console.error("rate limit clear failed", err);
  }
}

/** Checks every key; returns a 429 response if any is over its limit, otherwise null. */
export async function rateLimit(checks: [string, Limit][]): Promise<NextResponse | null> {
  for (const [key, limit] of checks) {
    if (!(await hit(key, limit))) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(limit.windowSeconds) } }
      );
    }
  }
  return null;
}

export const LIMITS = {
  loginIp: { limit: 20, windowSeconds: 15 * 60 },
  loginEmail: { limit: 8, windowSeconds: 15 * 60 },
  signupIp: { limit: 5, windowSeconds: 60 * 60 },
  forgotIp: { limit: 10, windowSeconds: 60 * 60 },
  forgotEmail: { limit: 3, windowSeconds: 60 * 60 },
  resetIp: { limit: 10, windowSeconds: 15 * 60 },
  enquiryIp: { limit: 6, windowSeconds: 60 * 60 },
  enquiryEmail: { limit: 3, windowSeconds: 60 * 60 },
  checkoutUser: { limit: 20, windowSeconds: 60 * 60 },
  uploadUser: { limit: 60, windowSeconds: 60 * 60 },
  partnerRequestUser: { limit: 20, windowSeconds: 60 * 60 },
  inviteAdmin: { limit: 30, windowSeconds: 60 * 60 },
  inviteAcceptIp: { limit: 10, windowSeconds: 15 * 60 },
  // Wrong 2FA codes: 5 per account per 15 minutes, then code entry is locked until the window ends.
  twoFactorVerifyUser: { limit: 5, windowSeconds: 15 * 60 },
  twoFactorSetupUser: { limit: 20, windowSeconds: 60 * 60 },
  // "Confirm it's you": 5 wrong password/code tries per account per 15 minutes.
  reauthUser: { limit: 5, windowSeconds: 15 * 60 },
} satisfies Record<string, Limit>;
