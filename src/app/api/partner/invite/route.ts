import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  createUser,
  findUserByEmail,
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { acceptInvitation, findInvitation } from "@/lib/invitations";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const INVALID = "This invitation link is invalid, used or expired. Ask us for a new one.";

/**
 * Redeems a partner invitation.
 * - action "register": no account exists for the invited email yet. Creates it with the invited
 *   email (the link proves the invitee received mail there), accepts, and signs in.
 * - action "accept": the visitor is already signed in with the invited email.
 */
export async function POST(request: Request) {
  const limited = await rateLimit([[`invite:accept:ip:${clientIp(request)}`, LIMITS.inviteAcceptIp]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const token = typeof body.token === "string" ? body.token : "";
  const invitation = await findInvitation(token);
  if (!invitation || invitation.status !== "pending") {
    return NextResponse.json({ error: INVALID }, { status: 400 });
  }

  if (body.action === "accept") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const result = await acceptInvitation(token, user);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "register") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (await findUserByEmail(invitation.email)) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in to accept the invitation." },
      { status: 409 }
    );
  }

  try {
    const user = await createUser(invitation.email, name, password);
    const result = await acceptInvitation(token, user);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const session = await createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, session, sessionCookieOptions());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not register invited partner", error);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
