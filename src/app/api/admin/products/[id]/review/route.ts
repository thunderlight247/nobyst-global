import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getProductById, setProductStatus } from "@/lib/products";
import { logActivity } from "@/lib/activity";
import { actorOf, notifyPartnerOfReview } from "@/lib/marketplace";
import { publicOrigin } from "@/lib/email";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/**
 * Admin decision on a product: approve (live), reject with a note (the seller must edit and
 * resubmit), or take down / hide. The seller is emailed for partner products.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole("admin");
  if ("denied" in auth) return auth.denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = body?.status === "live" || body?.status === "rejected" || body?.status === "hidden" ? body.status : null;
  if (!status) return NextResponse.json({ error: "Choose approve, reject or hide." }, { status: 400 });
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  if (status === "rejected" && !note) {
    return NextResponse.json({ error: "Tell the seller what to change." }, { status: 400 });
  }

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await setProductStatus(id, status, note);
  const verb = status === "live" ? "approved" : status === "rejected" ? "rejected" : "hid";
  await logActivity({
    actor: actorOf(auth.user),
    partnerId: product.partnerId,
    action: `product.${status === "live" ? "approve" : status === "rejected" ? "reject" : "takedown"}`,
    entityId: id,
    summary: `${auth.user.email} ${verb} “${product.name}”${product.partnerName ? ` from ${product.partnerName}` : ""}${note ? `: ${note}` : ""}`,
  });
  if (status !== "hidden" || product.partnerId) {
    await notifyPartnerOfReview(product, status, note, await publicOrigin(request));
  }
  return NextResponse.json({ product: await getProductById(id) });
}
