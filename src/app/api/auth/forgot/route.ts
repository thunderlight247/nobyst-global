import { NextResponse } from "next/server";
import { createPasswordReset, findUserByEmail, normaliseEmail } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { escapeHtml, sendEmail } from "@/lib/email";
import { clientIp, hit, LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// A new response every time: a Response body can only be read once, so sharing one object made
// every request after the first in a worker return an empty body.
const done = () =>
  NextResponse.json({
    ok: true,
    message: "If an account exists for this email, a reset link is on its way.",
  });

export async function POST(request: Request) {
  const limited = await rateLimit([[`forgot:ip:${clientIp(request)}`, LIMITS.forgotIp]]);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normaliseEmail(body.email) : "";
  if (!email || email.length > 200) return done();

  // Cap reset emails per address so nobody can flood an inbox. The reply stays the same either
  // way, so the limit does not reveal whether the account exists.
  if (!(await hit(`forgot:email:${email}`, LIMITS.forgotEmail))) return done();

  const user = await findUserByEmail(email);
  if (user) {
    const token = await createPasswordReset(user.id);
    const { SITE_URL } = await getEnv();
    // Prefer the configured origin so a spoofed Host header cannot redirect reset links.
    const origin = SITE_URL || new URL(request.url).origin;
    const link = `${origin}/account/reset?token=${encodeURIComponent(token)}`;
    await sendEmail(
      user.email,
      "Reset your NOBYST GLOBAL password",
      `<p>Hello ${escapeHtml(user.name)},</p>
<p>Use this link to choose a new password. It works once and expires in 60 minutes.</p>
<p><a href="${link}">Reset my password</a></p>
<p>If you did not ask for this, you can ignore this email.</p>`
    );
  }
  return done();
}
