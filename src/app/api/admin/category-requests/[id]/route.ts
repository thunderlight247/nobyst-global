import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createCategory } from "@/lib/categories";
import { decideCategoryRequest, listCategoryRequests } from "@/lib/marketplace";
import { publicOrigin } from "@/lib/email";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Approve (creates the category) or decline a partner's category request. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const decision = body?.decision === "approve" ? "approved" : body?.decision === "decline" ? "declined" : null;
  if (!decision) return NextResponse.json({ error: "Choose approve or decline." }, { status: 400 });
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) || null : null;

  const pending = (await listCategoryRequests()).find((r) => r.id === id && r.status === "pending");
  if (!pending) return NextResponse.json({ error: "Request not found or already decided." }, { status: 404 });

  let category = null;
  if (decision === "approved") {
    const created = await createCategory({ name: pending.name, parentId: pending.parentId, sortOrder: 0 });
    if ("error" in created) return NextResponse.json({ error: created.error }, { status: 400 });
    category = created;
  }
  const decided = await decideCategoryRequest(auth.user, id, decision, note, await publicOrigin(request));
  return NextResponse.json({ request: decided, category });
}
