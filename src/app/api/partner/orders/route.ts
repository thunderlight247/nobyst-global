import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { listPartnerOrderItems } from "@/lib/partner-orders";

export const dynamic = "force-dynamic";

/** Paid order lines for the signed-in partner's own products. */
export async function GET() {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({ items: await listPartnerOrderItems(auth.user.id) });
}
