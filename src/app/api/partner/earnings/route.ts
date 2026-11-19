import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { listPayouts, partnerEarnings } from "@/lib/partner-orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const [earnings, payouts] = await Promise.all([partnerEarnings(auth.user.id), listPayouts(auth.user.id)]);
  return NextResponse.json({ earnings, payouts });
}
