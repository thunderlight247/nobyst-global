import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { replaceRecoveryCodes, verifySecondStep } from "@/lib/two-factor";
import { clearLimit, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Issues a new set of recovery codes (voiding the old set) after a current authenticator code. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.twoFactorEnabled) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limited = await rateLimit([[`2fa:verify:${user.id}`, LIMITS.twoFactorVerifyUser]]);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  // Only an authenticator code here: a recovery code must not be able to mint new recovery codes.
  if (!/^\d{3}\s?\d{3}$/.test(code) || (await verifySecondStep(user.id, code)) !== "totp") {
    return NextResponse.json({ error: "Enter the current 6-digit code from your authenticator app." }, { status: 400 });
  }
  await clearLimit(`2fa:verify:${user.id}`);
  return NextResponse.json({ recoveryCodes: await replaceRecoveryCodes(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
