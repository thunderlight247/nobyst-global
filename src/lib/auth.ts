import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnv } from "./cloudflare";

export const SESSION_COOKIE = "nobyst_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const PBKDF2_ITERATIONS = 100_000;

export type Role = "customer" | "admin";
export type CurrentUser = { id: string; email: string; name: string; role: Role };

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

// Verified against when the email is unknown, so a miss takes as long as a wrong password
// and response time does not reveal which emails have accounts.
const DUMMY_HASH = `pbkdf2$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

export async function verifyDummyPassword(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
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
): Promise<{ id: string; email: string; name: string; password_hash: string } | null> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .bind(normaliseEmail(email))
    .first<{ id: string; email: string; name: string; password_hash: string }>();
  return row ?? null;
}

export async function createUser(email: string, name: string, password: string): Promise<CurrentUser> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  const normalised = normaliseEmail(email);
  await DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, normalised, name, await hashPassword(password))
    .run();
  return { id, email: normalised, name, role: "customer" };
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  const { DB } = await getEnv();
  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString();
  // Drop this user's expired sessions so old rows do not pile up.
  await DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?")
    .bind(userId, now.toISOString())
    .run();
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
  // u.* rather than named columns: the role column arrives with migration 0008, and a database
  // without it simply yields customers, so the admin stays locked rather than open.
  const row = await DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(await sha256Hex(token), new Date().toISOString())
    .first<{ id: string; email: string; name: string; role?: unknown }>();
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role === "admin" ? "admin" : "customer" };
}

/** The signed-in admin, or null for guests and customers. */
export async function getAdminUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

/**
 * Guard for /api/admin/* handlers. Returns an error response to send back, or null when the
 * caller is an admin. Usage: `const denied = await requireAdmin(); if (denied) return denied;`
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  return null;
}
