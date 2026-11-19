import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listPartnerSummaries } from "@/lib/partner-orders";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ partners: await listPartnerSummaries() });
}
