import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { publicOrigin } from "@/lib/email";
import { CheckoutError, createPartnerQuote } from "@/lib/orders";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireRecentAuth } from "@/lib/reauth";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Prices a partner's bulk request and emails them a Paystack payment link. */
export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  const limited = await rateLimit([[`quote:admin:${auth.user.id}`, LIMITS.inviteAdmin]]);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const enquiryId = typeof body.enquiryId === "string" ? body.enquiryId.slice(0, 64) : "";
  const quantity = Number(body.quantity);
  const cleaned = String(body.unitPrice ?? "").replace(/^(GH₵|GHS|₵)/i, "").replace(/[\s,]/g, "");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) || null : null;

  if (!enquiryId) return NextResponse.json({ error: "Choose a partner request." }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
    return NextResponse.json({ error: "Enter a whole-number quantity." }, { status: 400 });
  }
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0) {
    return NextResponse.json({ error: "Enter the unit price in cedis, for example 30 or 30.50." }, { status: 400 });
  }
  const unitPesewas = Math.round(Number(cleaned) * 100);
  if (unitPesewas * quantity > 100_000_000) {
    return NextResponse.json({ error: "That total is above GH₵1,000,000. Split it into smaller quotes." }, { status: 400 });
  }

  const stale = await requireRecentAuth();
  if (stale) return stale;

  try {
    const order = await createPartnerQuote({ enquiryId, unitPesewas, quantity, note, origin: await publicOrigin(request) });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Could not create quote", error);
    return NextResponse.json({ error: "Could not create the quote." }, { status: 500 });
  }
}
