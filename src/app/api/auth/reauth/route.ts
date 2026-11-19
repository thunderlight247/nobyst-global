import { NextResponse } from "next/server";
import { currentSessionHash, findUserByEmail, getCurrentUser, verifyPassword } from "@/lib/auth";
import { verifySecondStep } from "@/lib/two-factor";
import { markReauthenticated } from "@/lib/reauth";
import { clearLimit, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** "Confirm it's you": password, plus a 2FA code when 2FA is on. Unlocks risky actions for 15 minutes. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  const sessionHash = await currentSessionHash();
  if (!user || !sessionHash) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const key = `reauth:user:${user.id}`;
  const limited = await rateLimit([[key, LIMITS.reauthUser]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as { password?: unknown; code?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const code = typeof body?.code === "string" ? body.code.slice(0, 40) : "";

  const account = await findUserByEmail(user.email);
  const passwordOk = Boolean(account && password && (await verifyPassword(password, account.password_hash)));
  // Check the code only after the password, so a wrong password never burns a valid code.
  const codeOk = passwordOk && (!user.twoFactorEnabled || Boolean(await verifySecondStep(user.id, code)));
  if (!codeOk) {
    return NextResponse.json(
      { error: user.twoFactorEnabled ? "Password or code is not right." : "Password is not right." },
      { status: 400 }
    );
  }

  await clearLimit(key);
  await markReauthenticated(sessionHash);
  return NextResponse.json({ ok: true });
}
