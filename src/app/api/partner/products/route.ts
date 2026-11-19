import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { createProduct, listPartnerProducts, parseProductInput, partnerMediaPrefix } from "@/lib/products";
import { logPartnerProduct, notifyReviewNeeded, statusAfterPartnerSave } from "@/lib/marketplace";
import { publicOrigin } from "@/lib/email";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

// Partner only. A partner sees and creates only their own products.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({ products: await listPartnerProducts(auth.user.id) });
}

export async function POST(request: Request) {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const { user } = auth;
  const limited = await rateLimit([[`partner:write:${user.id}`, LIMITS.partnerWrite]]);
  if (limited) return limited;

  const raw = await request.json().catch(() => null);
  const parsed = await parseProductInput(raw, { mediaPrefix: partnerMediaPrefix(user.id) });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const status = statusAfterPartnerSave(user, null);
    const product = await createProduct(parsed.value, { partnerId: user.id, status });
    await logPartnerProduct(user, "product.create", product, status === "live" ? "added" : "submitted for review");
    if (status === "pending") await notifyReviewNeeded(user, product, await publicOrigin(request));
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Partner product create failed", error);
    return NextResponse.json({ error: "Could not save the product. Please try again." }, { status: 500 });
  }
}
