import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { verifyCheckout } from "@/lib/orders";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Asks Paystack again whether an unconfirmed order was paid, and records the answer. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireAdmin();
  if (denied) return denied;

  const { DB } = await getEnv();
  const order = await DB.prepare("SELECT reference FROM orders WHERE id = ?").bind(id).first<{ reference: string }>();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    return NextResponse.json({ result: await verifyCheckout(order.reference) });
  } catch (error) {
    console.error("Could not re-check payment", error);
    return NextResponse.json({ error: "Could not reach Paystack. Try again shortly." }, { status: 502 });
  }
}
