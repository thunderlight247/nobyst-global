/**
 * AES-GCM encryption for small secrets stored in D1 (authenticator secrets). The key is the worker
 * secret TOTP_ENCRYPTION_KEY: 32 random bytes, base64. Output is "v1.<iv b64>.<ciphertext b64>".
 */

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value: string): Uint8Array {
  const s = atob(value);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export class SecretBoxKeyError extends Error {}

async function importKey(keyBase64: string | undefined): Promise<CryptoKey> {
  if (!keyBase64) throw new SecretBoxKeyError("TOTP_ENCRYPTION_KEY is not set");
  let raw: Uint8Array;
  try {
    raw = unb64(keyBase64.trim());
  } catch {
    throw new SecretBoxKeyError("TOTP_ENCRYPTION_KEY is not valid base64");
  }
  if (raw.length !== 32) throw new SecretBoxKeyError("TOTP_ENCRYPTION_KEY must be 32 bytes");
  return crypto.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function sealSecret(plaintext: string, keyBase64: string | undefined): Promise<string> {
  const key = await importKey(keyBase64);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext))
  );
  return `v1.${b64(iv)}.${b64(ct)}`;
}

export async function openSecret(sealed: string, keyBase64: string | undefined): Promise<string> {
  const key = await importKey(keyBase64);
  const [version, ivB64, ctB64] = sealed.split(".");
  if (version !== "v1" || !ivB64 || !ctB64) throw new Error("unknown secret format");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivB64) as BufferSource },
    key,
    unb64(ctB64) as BufferSource
  );
  return new TextDecoder().decode(pt);
}
