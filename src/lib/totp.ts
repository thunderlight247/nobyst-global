/**
 * Time-based one-time passwords (RFC 6238) as used by Google Authenticator, Microsoft
 * Authenticator, Authy and 1Password: HMAC-SHA1, 6 digits, 30-second steps.
 * Uses only Web Crypto, so it runs on Cloudflare Workers and in Node tests alike.
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;
const DIGITS = 6;
/** Codes from one step either side are accepted, to allow for phone clocks that drift. */
const DRIFT_STEPS = 1;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** A new random 160-bit secret, base32-encoded (the format authenticator apps expect). */
export function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** HOTP (RFC 4226) for one counter value. `digits` is configurable for the RFC test vectors. */
export async function hotp(secretBase32: string, counter: number, digits = DIGITS): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secretBase32) as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function stepAt(unixMs: number): number {
  return Math.floor(unixMs / 1000 / STEP_SECONDS);
}

/**
 * Checks a 6-digit code against the current step and one either side. Returns the matching step
 * (to store as last used, so the same code cannot be replayed), or null if it does not match.
 * Steps at or before `lastUsedStep` are never accepted.
 */
export async function matchTotp(
  secretBase32: string,
  code: string,
  unixMs: number,
  lastUsedStep: number | null
): Promise<number | null> {
  const digits = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const now = stepAt(unixMs);
  for (let delta = -DRIFT_STEPS; delta <= DRIFT_STEPS; delta++) {
    const step = now + delta;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    if ((await hotp(secretBase32, step)) === digits) return step;
  }
  return null;
}

/** The otpauth:// link an authenticator app scans from the QR code. */
export function otpauthUri(accountEmail: string, secretBase32: string, issuer = "NOBYST GLOBAL"): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
