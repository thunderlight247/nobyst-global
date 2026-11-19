import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { beginSetup } from "@/lib/two-factor";
import { SecretBoxKeyError } from "@/lib/secret-box";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Starts authenticator setup for the signed-in account and returns the secret to scan. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const limited = await rateLimit([[`2fa:setup:${user.id}`, LIMITS.twoFactorSetupUser]]);
  if (limited) return limited;
  try {
    const started = await beginSetup(user);
    if (!started) return NextResponse.json({ error: "Two-step sign-in is already on." }, { status: 409 });
    return NextResponse.json(started, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SecretBoxKeyError) {
      console.error("2FA setup unavailable:", error.message);
      return NextResponse.json({ error: "Two-step sign-in is not configured on the server yet." }, { status: 503 });
    }
    console.error("2FA setup failed", error);
    return NextResponse.json({ error: "Could not start setup. Please try again." }, { status: 500 });
  }
}
