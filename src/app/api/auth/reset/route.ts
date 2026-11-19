import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { getEnv } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await rateLimit([[`reset:ip:${clientIp(request)}`, LIMITS.resetIp]]);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!token || token.length > 200) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const userId = await resetPassword(token, password);
  if (userId) {
    const { DB } = await getEnv();
    const who = await DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
    await logActivity({ actor: null, actorEmail: who?.email ?? null, action: "auth.password_reset", entityId: userId, summary: `${who?.email ?? "An account"} set a new password with a reset link (all devices signed out)`, request });
  }
  if (!userId) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
