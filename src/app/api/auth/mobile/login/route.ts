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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Allow cross-origin from the Expo/React Native app
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

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
  if (limited) return limited;

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
