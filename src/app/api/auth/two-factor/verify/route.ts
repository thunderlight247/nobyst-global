import { NextResponse } from "next/server";
import { currentSessionHash, getPendingUser } from "@/lib/auth";
import { markSessionVerified, verifySecondStep } from "@/lib/two-factor";
import { clearLimit, LIMITS, rateLimit } from "@/lib/rate-limit";
import { homeFor } from "@/lib/roles";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/** The second sign-in step: accepts an authenticator code or a recovery code for this session. */
export async function POST(request: Request) {
  const user = await getPendingUser();
  const sessionHash = await currentSessionHash();
  if (!user || !sessionHash) {
    return NextResponse.json({ error: "Your sign-in has expired. Please sign in again." }, { status: 401 });
  }
  // Per account, not per IP: 5 wrong codes lock code entry for this account for 15 minutes.
  const limited = await rateLimit([[`2fa:verify:${user.id}`, LIMITS.twoFactorVerifyUser]]);
  const actor = { id: user.id, email: user.email, role: user.role };
  if (limited) {
    await logActivity({ actor, action: "2fa.lockout", entityId: user.id, summary: `2FA code entry locked for ${user.email} after too many wrong codes`, request });
    return limited;
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.slice(0, 40) : "";
  const result = await verifySecondStep(user.id, code);
  if (!result) {
    await logActivity({ actor, action: "2fa.failed", entityId: user.id, summary: `Wrong 2FA code for ${user.email}`, request });
    return NextResponse.json({ error: "That code is not right, or it was already used." }, { status: 400 });
  }
  if (result === "recovery") {
    await logActivity({ actor, action: "2fa.recovery_used", entityId: user.id, summary: `${user.email} signed in with a recovery code`, request });
  }

  await clearLimit(`2fa:verify:${user.id}`);
  await markSessionVerified(sessionHash);
  return NextResponse.json({ ok: true, home: homeFor(user.role), usedRecoveryCode: result === "recovery" });
}
