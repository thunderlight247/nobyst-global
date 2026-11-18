import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  findUserByEmail,
  normaliseEmail,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const invalid = NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });

  if (!email || email.length > 200 || !password || password.length > 200) return invalid;

  // Per IP stops one client guessing many accounts; per email stops a botnet guessing one account.
  const limited = await rateLimit([
    [`login:ip:${clientIp(request)}`, LIMITS.loginIp],
    [`login:email:${normaliseEmail(email)}`, LIMITS.loginEmail],
  ]);
  if (limited) return limited;

  const user = await findUserByEmail(email);
  if (!user) {
    await verifyDummyPassword(password);
    return invalid;
  }
  if (!(await verifyPassword(password, user.password_hash))) return invalid;

  const token = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return NextResponse.json({ ok: true });
}
