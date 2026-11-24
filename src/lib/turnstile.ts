import { getEnv } from "./cloudflare";

/**
 * Cloudflare Turnstile (bot check) for public web forms: sign-up, forgot-password and the
 * partner application. Off until both TURNSTILE_SITE_KEY (wrangler var) and TURNSTILE_SECRET_KEY
 * (wrangler secret) are set, so the forms keep working before setup.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function turnstileSiteKey(): Promise<string | null> {
  const env = await getEnv();
  return env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY : null;
}

/** True when the request passed the check (or Turnstile is not set up). */
export async function passesTurnstile(request: Request, token: unknown): Promise<boolean> {
  const env = await getEnv();
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Cloudflare's own check is unreachable: let the form through; rate limits still apply.
    console.error("turnstile verify failed", err);
    return true;
  }
}

export const TURNSTILE_FAILED = "Please complete the security check and try again.";
