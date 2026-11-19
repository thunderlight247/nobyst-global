import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { isFulfilmentStatus } from "@/lib/delivery";
import { updatePartnerItem } from "@/lib/partner-orders";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** The partner moves one of their own order lines along (processing, dispatched, delivered…). */
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const limited = await rateLimit([[`partner:write:${auth.user.id}`, LIMITS.partnerWrite]]);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as { fulfilmentStatus?: unknown } | null;
  if (!isFulfilmentStatus(body?.fulfilmentStatus)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }
  const item = await updatePartnerItem(auth.user, itemId, body.fulfilmentStatus);
  if (!item) return NextResponse.json({ error: "Order line not found." }, { status: 404 });
  return NextResponse.json({ item });
}
