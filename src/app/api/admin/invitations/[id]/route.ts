import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revokeInvitation } from "@/lib/invitations";
import { requireRecentAuth } from "@/lib/reauth";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Cancels a pending invitation so its link stops working. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireAdmin();
  if (denied) return denied;
  const stale = await requireRecentAuth();
  if (stale) return stale;
  const ok = await revokeInvitation(id);
  if (!ok) return NextResponse.json({ error: "Invitation not found or already used." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
