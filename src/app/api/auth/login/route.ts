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
import { canEnterArea, homeFor, type Area } from "@/lib/roles";
import { isTwoFactorEnabled } from "@/lib/two-factor";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  // Which sign-in page this came from. Each area admits only the roles that belong there.
  const area: Area = body.area === "admin" || body.area === "partner" ? body.area : "customer";
  const password = typeof body.password === "string" ? body.password : "";
  const invalid = NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });

  if (!email || email.length > 200 || !password || password.length > 200) return invalid;

  // Per IP stops one client guessing many accounts; per email stops a botnet guessing one account.
  const limited = await rateLimit([
    [`login:ip:${clientIp(request)}`, LIMITS.loginIp],
    [`login:email:${normaliseEmail(email)}`, LIMITS.loginEmail],
  ]);
  const tried = normaliseEmail(email);
  if (limited) {
    await logActivity({ actor: null, actorEmail: tried, action: "auth.lockout", summary: `Sign-in blocked after too many attempts for ${tried}`, request });
    return limited;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await verifyDummyPassword(password);
    await logActivity({ actor: null, actorEmail: tried, action: "auth.login_failed", summary: `Failed sign-in for ${tried} (no such account)`, request });
    return invalid;
  }
  const actor = { id: user.id, email: user.email, role: user.role };
  if (!(await verifyPassword(password, user.password_hash))) {
    await logActivity({ actor: null, actorEmail: user.email, action: "auth.login_failed", entityId: user.id, summary: `Failed sign-in for ${user.email} (wrong password, ${area} page)`, request });
    return invalid;
  }

  if (!canEnterArea(user.role, area)) {
    // The admin page never confirms that an email has an account: wrong role looks exactly like
    // a wrong password. A partner applicant with a correct password is told where to go instead.
    if (area === "admin") {
      await logActivity({ actor, action: "auth.login_failed", entityId: user.id, summary: `${user.email} (${user.role}) tried the staff sign-in page`, request });
      return invalid;
    }
    return NextResponse.json(
      { error: "This account does not have partner access yet. Apply to partner with us, or sign in on My account." },
      { status: 403 }
    );
  }

  // Checked before any session exists, so a suspended partner is never signed in from here.
  if (area === "partner" && user.role === "partner" && user.partnerStatus === "suspended") {
    return NextResponse.json({ error: "Your partner account is suspended. Contact info@nobyst.com." }, { status: 403 });
  }

  const token = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());

  // With 2FA on, this session reaches nothing but the code page until a code is entered.
  const twoFactorRequired = await isTwoFactorEnabled(user.id);
  await logActivity({
    actor,
    action: "auth.login",
    entityId: user.id,
    summary: `${user.email} signed in on the ${area} page${twoFactorRequired ? " (password correct, 2FA code next)" : ""}`,
    request,
  });
  return NextResponse.json({ ok: true, home: homeFor(user.role), ...(twoFactorRequired ? { twoFactorRequired: true } : {}) });
}
