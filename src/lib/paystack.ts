/** Paystack webhook signature checks: HMAC-SHA512 of the raw body, keyed with the secret key. */

export async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when `signature` (the x-paystack-signature header) matches `body` for `secret`. */
export async function isValidPaystackSignature(secret: string, body: string, signature: string): Promise<boolean> {
  if (!/^[0-9a-f]{128}$/.test(signature)) return false;
  return timingSafeEqual(await hmacSha512Hex(secret, body), signature);
}
