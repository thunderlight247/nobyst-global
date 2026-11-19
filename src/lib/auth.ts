import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getEnv } from "./cloudflare";
import { isRole, isStaff, roleChangeError, type Role } from "./roles";

export { ROLES, isRole, isStaff, type Role } from "./roles";

export const SESSION_COOKIE = "nobyst_session";
const SESSION_DAYS = 30;
/** Admin sessions are short: a stolen or forgotten admin sign-in stops working within hours. */
const ADMIN_SESSION_HOURS = 12;
const RESET_MINUTES = 60;
const PBKDF2_ITERATIONS = 100_000;

export type CurrentUser = { id: string; email: string; name: string; role: Role; company: string | null };

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

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
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
): Promise<{ id: string; email: string; name: string; password_hash: string; role: Role } | null> {
  const { DB } = await getEnv();
  const row = await DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(normaliseEmail(email))
    .first<{ id: string; email: string; name: string; password_hash: string; role?: unknown }>();
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    password_hash: row.password_hash,
    role: isRole(row.role) ? row.role : "customer",
  };
}

export async function createUser(email: string, name: string, password: string): Promise<CurrentUser> {
  const { DB } = await getEnv();
  const id = crypto.randomUUID();
  const normalised = normaliseEmail(email);
  await DB.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)")
    .bind(id, normalised, name, await hashPassword(password))
    .run();
  return { id, email: normalised, name, role: "customer", company: null };
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string): Promise<string> {
  const { DB } = await getEnv();
  const token = randomToken();
  const now = new Date();
  const role = await DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<{ role?: unknown }>();
  const staff = isRole(role?.role) && isStaff(role.role);
  const lifetimeMs = staff ? ADMIN_SESSION_HOURS * 3_600_000 : SESSION_DAYS * 86_400_000;
  const expires = new Date(now.getTime() + lifetimeMs).toISOString();
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
  // u.* rather than named columns: role (0008) and company (0009) arrive with migrations, and a
  // database without them simply yields customers, so admin and partner areas stay locked.
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const row = await DB.prepare(
    `SELECT u.*, s.expires_at AS session_expires_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(tokenHash, new Date(now).toISOString())
    .first<{ id: string; email: string; name: string; role?: unknown; company?: string | null; session_expires_at: string }>();
  if (!row) return null;

  // A session that began before the account became an admin still has a customer's 30-day life.
  // Cap it, so every admin session ends at most ADMIN_SESSION_HOURS from now.
  const adminCap = now + ADMIN_SESSION_HOURS * 3_600_000;
  if (isRole(row.role) && isStaff(row.role) && Date.parse(row.session_expires_at) > adminCap) {
    await DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
      .bind(new Date(adminCap).toISOString(), tokenHash)
      .run();
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: isRole(row.role) ? row.role : "customer",
    company: row.company ?? null,
  };
}

/** The signed-in admin or owner, or null for everyone else. */
export async function getAdminUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && isStaff(user.role) ? user : null;
}

/**
 * Guard for /api/admin/* handlers. Returns an error response to send back, or null when the
 * caller is an admin. Usage: `const denied = await requireAdmin(); if (denied) return denied;`
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const result = await requireRole("admin");
  return "denied" in result ? result.denied : null;
}

/**
 * Guard for role-restricted handlers that also need the user. Returns `{ user }` when the caller
 * has one of `roles`, otherwise `{ denied }` holding the 401/403 response to send back.
 * Owners pass wherever "admin" is allowed.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<{ user: CurrentUser } | { denied: NextResponse }> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { denied: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  const allowed = roles.includes(user.role) || (user.role === "owner" && roles.includes("admin"));
  if (!allowed) {
    return { denied: NextResponse.json({ error: "Not allowed." }, { status: 403 }) };
  }
  return { user };
}

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string | null;
  createdAt: string;
};

/** Every account for the admin Users tab, admins and partners first. */
export async function listUsers(): Promise<UserSummary[]> {
  const { DB } = await getEnv();
  const { results } = await DB.prepare(
    `SELECT id, email, name, role, company, created_at FROM users
     ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'partner' THEN 2 ELSE 3 END, created_at DESC
     LIMIT 500`
  ).all<{ id: string; email: string; name: string; role: string; company: string | null; created_at: string }>();
  return results.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: isRole(r.role) ? r.role : "customer",
    company: r.company,
    createdAt: r.created_at,
  }));
}

/**
 * Changes an account's role and company on behalf of `actor`, enforcing the owner rules in
 * roles.ts. Signs the account out everywhere when its role changes, so a removed admin or partner
 * loses access immediately rather than at session expiry.
 */
export async function updateUserAccess(
  actor: { id: string; role: Role },
  id: string,
  role: Role,
  company: string | null
): Promise<{ user: UserSummary } | { error: string; status: number }> {
  const { DB } = await getEnv();
  const before = await DB.prepare("SELECT role FROM users WHERE id = ?").bind(id).first<{ role: string }>();
  if (!before) return { error: "Account not found.", status: 404 };
  const current: Role = isRole(before.role) ? before.role : "customer";

  const owners = await DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'").first<{ n: number }>();
  const error = roleChangeError({ actor, target: { id, role: current }, next: role, ownerCount: owners?.n ?? 0 });
  if (error) return { error, status: 403 };

  // The owner-count condition is repeated in the UPDATE so two owners demoting each other at the
  // same moment can never leave the site with none.
  const res = await DB.prepare(
    `UPDATE users SET role = ?, company = ? WHERE id = ?
       AND (role != 'owner' OR ? = 'owner' OR (SELECT COUNT(*) FROM users WHERE role = 'owner') > 1)`
  )
    .bind(role, company, id, role)
    .run();
  if ((res.meta?.changes ?? 0) === 0) {
    return { error: "This is the only owner. Make someone else an owner first.", status: 409 };
  }
  if (current !== role) await DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  const users = await listUsers();
  const user = users.find((u) => u.id === id);
  return user ? { user } : { error: "Account not found.", status: 404 };
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
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  // Claim the token atomically first, so two concurrent requests cannot both use it.
  const row = await DB.prepare(
    `UPDATE password_resets SET used_at = ?
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
     RETURNING user_id`
  )
    .bind(now, tokenHash, now)
    .first<{ user_id: string }>();
  if (!row) return false;

  await DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(await hashPassword(password), row.user_id)
    .run();
  // A reset signs out every session and voids any other outstanding reset links.
  await DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id).run();
  await DB.prepare("UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL")
    .bind(now, row.user_id)
    .run();
  return true;
}
