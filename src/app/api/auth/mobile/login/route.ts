/**
 * POST /api/auth/mobile/login
 * Returns a Bearer token for React Native clients (which cannot use HTTP-only cookies).
 * Uses the same session infrastructure as the web login — the token IS a session token,
 * just returned in JSON instead of a Set-Cookie header.
 */
import { NextResponse } from "next/server";
import {
  createSession,
  findUserByEmail,
  normaliseEmail,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { corsHeaders as cors, withCors } from "@/lib/cors";
import { isTwoFactorEnabled } from "@/lib/two-factor";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request, "POST, OPTIONS") });
}

export async function POST(request: Request) {
  const corsHeaders = cors(request, "POST, OPTIONS");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const invalid = NextResponse.json({ error: "Email or password is incorrect." }, { status: 401, headers: corsHeaders });

  if (!email || email.length > 200 || !password || password.length > 200) return invalid;

  const limited = await rateLimit([
    [`login:ip:${clientIp(request)}`, LIMITS.loginIp],
    [`login:email:${normaliseEmail(email)}`, LIMITS.loginEmail],
  ]);
  if (limited) {
    await logActivity({ actor: null, actorEmail: normaliseEmail(email), action: "auth.lockout", summary: `Mobile: sign-in blocked after too many attempts for ${normaliseEmail(email)}`, request });
    return withCors(limited, corsHeaders);
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await verifyDummyPassword(password);
    await logActivity({ actor: null, actorEmail: normaliseEmail(email), action: "auth.login_failed", summary: `Mobile: failed sign-in for ${normaliseEmail(email)}`, request });
    return invalid;
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    await logActivity({ actor: null, actorEmail: user.email, action: "auth.login_failed", entityId: user.id, summary: `Mobile: failed sign-in for ${user.email} (wrong password)`, request });
    return invalid;
  }

  // Only customer role can use the mobile app (staff use the web admin)
  if (user.role !== "customer") {
    return NextResponse.json({ error: "Please use the web portal for staff access." }, { status: 403, headers: corsHeaders });
  }

  // The app has no 2FA code step yet, so an account with 2FA on must sign in on the website.
  // (Issuing a token here would skip the second step.)
  if (await isTwoFactorEnabled(user.id)) {
    return NextResponse.json(
      { error: "This account uses two-step sign-in. Please sign in on nobyst.com." },
      { status: 403, headers: corsHeaders }
    );
  }

  const token = await createSession(user.id);
  await logActivity({ actor: { id: user.id, email: user.email, role: user.role }, action: "auth.login", entityId: user.id, summary: `${user.email} signed in via mobile app`, request });

  return NextResponse.json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}
