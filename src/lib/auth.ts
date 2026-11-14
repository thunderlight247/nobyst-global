import { cookies } from "next/headers";
import { getEnv } from "./cloudflare";

export const SESSION_COOKIE = "nobyst_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const PBKDF2_ITERATIONS = 100_000;

export type CurrentUser = { id: string; email: string; name: string };

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(value: string): Uint8Array {
  const s = atob(value);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterRaw, saltB64, hashB64] = stored.split("$");
  const iterations = Number(iterRaw);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || !saltB64 || !hashB64) return false;
  const actual = await derive(password, fromBase64(saltB64), iterations);
  const expected = fromBase64(hashB64);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(
  email: string
): Promise<(CurrentUser & { password_hash: string }) | null> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(normaliseEmail(email))
    .first<CurrentUser & { password_hash: string }>();
  return row ?? null;
}

export async function createUser(email: string, name: string, password: string): Promise<CurrentUser> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  const normalised = normaliseEmail(email);
  await DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, normalised, name, await hashPassword(password))
    .run();
  return { id, email: normalised, name };
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  const { DB } = await getEnv();
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), userId, expires)
    .run();
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const { DB } = await getEnv();
  await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
}

/** The signed-in customer for the current request, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const { DB } = await getEnv();
  const row = await DB.prepare(
    `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<CurrentUser>();
  return row ?? null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  };
}

/** Creates a single-use reset token and returns the raw value for the email link. */
export async function createPasswordReset(userId: string): Promise<string> {
  const { DB } = await getEnv();
  const token = randomToken();
  const expires = new Date(Date.now() + RESET_MINUTES * 60_000).toISOString();
  await DB.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256Hex(token), userId, expires)
    .run();
  return token;
}

/** Sets the new password if the token is valid, unused and unexpired. Signs out other sessions. */
export async function resetPassword(token: string, password: string): Promise<boolean> {
  const { DB } = await getEnv();
  const row = await DB.prepare(
    "SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?"
  )
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<{ user_id: string }>();
  if (!row) return false;

  await DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(await hashPassword(password), row.user_id)
    .run();
  await DB.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?")
    .bind(new Date().toISOString(), await sha256Hex(token))
    .run();
  await DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id).run();
  return true;
}
