import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserByEmail, getUserFromRequest, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { verifySecondStep } from "@/lib/two-factor";
import { deleteCustomerAccount, deletionBlocker } from "@/lib/account-data";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Deletes the signed-in customer's account after their password (and 2FA code, if on). */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limited = await rateLimit([[`account:delete:${user.id}`, LIMITS.reauthUser]]);
  if (limited) return limited;

  const blocker = await deletionBlocker(user);
  if (blocker) return NextResponse.json({ error: blocker }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { password?: unknown; code?: unknown; confirm?: unknown } | null;
  if (body?.confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  const account = await findUserByEmail(user.email);
  if (!account || !password || !(await verifyPassword(password, account.password_hash))) {
    return NextResponse.json({ error: "Your password is not right." }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    const code = typeof body.code === "string" ? body.code.slice(0, 40) : "";
    if (!(await verifySecondStep(user.id, code))) return NextResponse.json({ error: "The 2FA code is not right." }, { status: 400 });
  }

  await deleteCustomerAccount(user, request);
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
