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
  if (limited) return limited;

  const user = await findUserByEmail(email);
  if (!user) {
    await verifyDummyPassword(password);
    return invalid;
  }
  if (!(await verifyPassword(password, user.password_hash))) return invalid;

  if (!canEnterArea(user.role, area)) {
    // The admin page never confirms that an email has an account: wrong role looks exactly like
    // a wrong password. A partner applicant with a correct password is told where to go instead.
    if (area === "admin") return invalid;
    return NextResponse.json(
      { error: "This account does not have partner access yet. Apply to partner with us, or sign in on My account." },
      { status: 403 }
    );
  }

  const token = await createSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  // With 2FA on, this session reaches nothing but the code page until a code is entered.
  const twoFactorRequired = await isTwoFactorEnabled(user.id);
  return NextResponse.json({ ok: true, home: homeFor(user.role), ...(twoFactorRequired ? { twoFactorRequired: true } : {}) });
}
