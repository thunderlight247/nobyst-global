import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { requireRecentAuth } from "@/lib/reauth";
import { listPayouts, recordPayout } from "@/lib/partner-orders";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({ payouts: await listPayouts((await params).id) });
}

/** Records money paid to a partner by mobile money or bank. Money is risky: confirm it's you. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const cleaned = String(body?.amount ?? "").replace(/^(GH₵|GHS|₵)/i, "").replace(/[\s,]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned) || Number(cleaned) <= 0) {
    return NextResponse.json({ error: "Enter the amount paid in cedis, e.g. 250 or 250.50." }, { status: 400 });
  }
  const method = typeof body?.method === "string" ? body.method.trim().slice(0, 40) : "";
  if (method.length < 2) return NextResponse.json({ error: "Say how it was paid, e.g. MTN MoMo or bank transfer." }, { status: 400 });
  const reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 80) || null : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  const stale = await requireRecentAuth();
  if (stale) return stale;
  const payout = await recordPayout(auth.user, id, { amountPesewas: Math.round(Number(cleaned) * 100), method, reference, note });
  if (!payout) return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  return NextResponse.json({ payout }, { status: 201 });
}
