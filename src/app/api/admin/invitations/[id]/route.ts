import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revokeInvitation } from "@/lib/invitations";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Cancels a pending invitation so its link stops working. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const ok = await revokeInvitation(params.id);
  if (!ok) return NextResponse.json({ error: "Invitation not found or already used." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
