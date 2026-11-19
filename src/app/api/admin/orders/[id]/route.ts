import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isFulfilmentStatus } from "@/lib/delivery";
import { updateFulfilment } from "@/lib/orders";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Moves a paid order through fulfilment; the customer is emailed at key steps. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isFulfilmentStatus(body.fulfilmentStatus)) {
    return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
  }
  try {
    const order = await updateFulfilment(id, body.fulfilmentStatus);
    if (!order) return NextResponse.json({ error: "Paid order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Could not update order", error);
    return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
  }
}
