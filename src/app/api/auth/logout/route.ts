import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { endRequestSession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Signs out: deletes the session on the server, whether it came from the website cookie or the
 * mobile app's Bearer token, so a signed-out token stops working everywhere straight away.
 */
export async function POST(request: Request) {
  await endRequestSession(request);
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
