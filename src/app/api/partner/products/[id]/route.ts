import { NextResponse } from "next/server";
import { requirePartner, type CurrentUser } from "@/lib/auth";
import {
  deleteProduct,
  deleteUnusedMedia,
  getProductById,
  parseProductInput,
  partnerMediaPrefix,
  updateProduct,
  type Product,
} from "@/lib/products";
import { logPartnerProduct, notifyReviewNeeded, statusAfterPartnerSave } from "@/lib/marketplace";
import { publicOrigin } from "@/lib/email";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

// Partner only. Every handler loads the product and refuses it unless the partner owns it.
export const dynamic = "force-dynamic";

async function ownProduct(id: string): Promise<{ user: CurrentUser; product: Product } | { denied: NextResponse }> {
  const auth = await requirePartner();
  if ("denied" in auth) return auth;
  const product = await getProductById(id);
  // Same answer for "missing" and "someone else's", so ids of other sellers' products leak nothing.
  if (!product || product.partnerId !== auth.user.id) {
    return { denied: NextResponse.json({ error: "Product not found." }, { status: 404 }) };
  }
  const limited = await rateLimit([[`partner:write:${auth.user.id}`, LIMITS.partnerWrite]]);
  if (limited) return { denied: limited };
  return { user: auth.user, product };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await ownProduct((await params).id);
  if ("denied" in found) return found.denied;
  const { user, product: previous } = found;

  const raw = await request.json().catch(() => null);
  const parsed = await parseProductInput(raw, { mediaPrefix: partnerMediaPrefix(user.id) });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const status = statusAfterPartnerSave(user, previous.status);
  const product = await updateProduct(previous.id, parsed.value, status);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await deleteUnusedMedia([previous.image, ...previous.gallery, previous.model3dUrl ?? ""], [product.image, ...product.gallery, product.model3dUrl ?? ""]);
  await logPartnerProduct(user, "product.update", product, status === "pending" ? "edited (waiting for review)" : "edited");
  if (status === "pending") await notifyReviewNeeded(user, product, await publicOrigin(request));
  return NextResponse.json({ product });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await ownProduct((await params).id);
  if ("denied" in found) return found.denied;
  await deleteProduct(found.product.id);
  await logPartnerProduct(found.user, "product.delete", found.product, "deleted");
  return NextResponse.json({ ok: true });
}
