import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, createUser, findUserByEmail, normaliseEmail, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? normaliseEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (await findUserByEmail(email)) {
    return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
  }

  try {
    const user = await createUser(email, name, password);
    const token = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("signup failed", err);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
