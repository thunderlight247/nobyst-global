import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { publicOrigin } from "@/lib/email";
import { sendVerificationEmail } from "@/lib/email-verification";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { corsHeaders, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "POST, OPTIONS") });
}

/** Emails a fresh "confirm your email" link to the signed-in account (website or app). */
export async function POST(request: Request) {
  const cors = corsHeaders(request, "POST, OPTIONS");
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: cors });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true }, { headers: cors });
  const limited = await rateLimit([[`verify-email:${user.id}`, LIMITS.verifyEmailUser]]);
  if (limited) return withCors(limited, cors);
  const sent = await sendVerificationEmail(user, await publicOrigin(request));
  if (!sent) return NextResponse.json({ error: "We could not send the email. Please try again later." }, { status: 502, headers: cors });
  return NextResponse.json({ ok: true }, { headers: cors });
}
