import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { logActivity } from "@/lib/activity";
import { actorOf, partnerLabel } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/** Where NOBYST should send the partner's payouts (mobile money number or bank details). */
export async function PATCH(request: Request) {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const body = (await request.json().catch(() => null)) as { payoutDetails?: unknown } | null;
  const payoutDetails = typeof body?.payoutDetails === "string" ? body.payoutDetails.trim().slice(0, 300) || null : null;
  const { DB } = await getEnv();
  await DB.prepare("UPDATE users SET payout_details = ? WHERE id = ?").bind(payoutDetails, auth.user.id).run();
  // Payout details decide where money goes, so every change is on the record.
  await logActivity({
    actor: actorOf(auth.user),
    partnerId: auth.user.id,
    action: "partner.payout_details",
    summary: `${partnerLabel(auth.user)} changed their payout details`,
  });
  return NextResponse.json({ payoutDetails });
}
