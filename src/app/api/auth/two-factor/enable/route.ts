import { NextResponse } from "next/server";
import { currentSessionHash, getCurrentUser } from "@/lib/auth";
import { confirmSetup } from "@/lib/two-factor";
import { clearLimit, LIMITS, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/** Confirms setup with a first code; returns recovery codes, shown once. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const sessionHash = await currentSessionHash();
  if (!user || !sessionHash) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limited = await rateLimit([[`2fa:verify:${user.id}`, LIMITS.twoFactorVerifyUser]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  try {
    const recoveryCodes = await confirmSetup(user.id, code, sessionHash);
    if (!recoveryCodes) {
      return NextResponse.json({ error: "That code is not right. Check the time on your phone and try the newest code." }, { status: 400 });
    }
    await clearLimit(`2fa:verify:${user.id}`);
    await logActivity({ actor: { id: user.id, email: user.email, role: user.role }, action: "2fa.enabled", entityId: user.id, summary: `${user.email} turned on two-step sign-in (other devices signed out)`, request });
    return NextResponse.json({ recoveryCodes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("2FA enable failed", error);
    return NextResponse.json({ error: "Could not turn on two-step sign-in." }, { status: 500 });
  }
}
