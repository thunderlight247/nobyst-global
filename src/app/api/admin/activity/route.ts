import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listActivity } from "@/lib/activity";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const partner = new URL(request.url).searchParams.get("partner") ?? undefined;
  return NextResponse.json({ activity: await listActivity({ partnerId: partner, limit: 300 }) });
}
