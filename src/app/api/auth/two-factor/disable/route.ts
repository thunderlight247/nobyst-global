import { NextResponse } from "next/server";
import { currentSessionHash, getCurrentUser, isStaff } from "@/lib/auth";
import { removeTwoFactor, verifySecondStep } from "@/lib/two-factor";
import { clearLimit, LIMITS, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/** Turns 2FA off for a partner or customer, after a current code. Staff cannot turn it off. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const sessionHash = await currentSessionHash();
  if (!user || !sessionHash) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (isStaff(user.role)) {
    return NextResponse.json({ error: "Two-step sign-in is required for admins and owners." }, { status: 403 });
  }
  const limited = await rateLimit([[`2fa:verify:${user.id}`, LIMITS.twoFactorVerifyUser]]);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.slice(0, 40) : "";
  if (!(await verifySecondStep(user.id, code))) {
    return NextResponse.json({ error: "That code is not right, or it was already used." }, { status: 400 });
  }
  await clearLimit(`2fa:verify:${user.id}`);
  await removeTwoFactor(user.id, sessionHash);
  await logActivity({ actor: { id: user.id, email: user.email, role: user.role }, action: "2fa.disabled", entityId: user.id, summary: `${user.email} turned off two-step sign-in`, request });
  return NextResponse.json({ ok: true });
}
