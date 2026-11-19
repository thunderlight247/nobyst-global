import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { getProductById, setProductStatus } from "@/lib/products";
import { logPartnerProduct } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

/**
 * A partner hides or shows their own product. Showing returns it to live (trusted) or to review
 * (pending). A product an admin rejected can only come back by editing it, which resubmits it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const product = await getProductById((await params).id);
  if (!product || product.partnerId !== auth.user.id) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { visible?: unknown } | null;
  if (typeof body?.visible !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  if (!body.visible) {
    if (product.status === "rejected") return NextResponse.json({ error: "This product is already off the shop." }, { status: 400 });
    await setProductStatus(product.id, "hidden", null);
    await logPartnerProduct(auth.user, "product.hide", product, "hid");
    return NextResponse.json({ status: "hidden" });
  }
  if (product.status !== "hidden") return NextResponse.json({ error: "Only a hidden product can be shown again." }, { status: 400 });
  const status = auth.user.partnerStatus === "trusted" ? "live" : "pending";
  await setProductStatus(product.id, status, null);
  await logPartnerProduct(auth.user, "product.show", product, status === "live" ? "put back in the shop" : "asked to show again");
  return NextResponse.json({ status });
}
