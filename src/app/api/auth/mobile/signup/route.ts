/**
 * POST /api/auth/mobile/signup
 * Creates a customer account and returns a Bearer token for React Native clients.
 */
import { NextResponse } from "next/server";
import { corsHeaders, withCors } from "@/lib/cors";
import {
  createSession,
  createUser,
  findUserByEmail,
  normaliseEmail,
} from "@/lib/auth";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "POST, OPTIONS") });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request, "POST, OPTIONS");
  const limited = await rateLimit([[`signup:ip:${clientIp(request)}`, LIMITS.signupIp]]);
  if (limited) return withCors(limited, cors);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: cors });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? normaliseEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 120)
    return NextResponse.json({ error: "Please enter your name." }, { status: 400, headers: cors });
  if (!EMAIL_RE.test(email) || email.length > 200)
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400, headers: cors });
  if (password.length < 8 || password.length > 200)
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400, headers: cors });

  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409, headers: cors }
    );
  }

  try {
    const user = await createUser(email, name, password);
    await logActivity({ actor: { id: user.id, email: user.email, role: user.role }, action: "auth.signup", entityId: user.id, summary: `${user.email} created an account via mobile app`, request });
    const token = await createSession(user.id);

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
      { status: 201, headers: cors }
    );
  } catch (err) {
    console.error("mobile signup failed", err);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500, headers: cors });
  }
}
