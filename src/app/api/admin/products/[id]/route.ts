import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  deleteProduct,
  deleteUnusedMedia,
  getProductById,
  parseProductInput,
  updateProduct,
} from "@/lib/products";
import { parseWholesaleInput, saveWholesalePrice } from "@/lib/wholesale";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const parsed = await parseProductInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const wholesale = parseWholesaleInput(raw);
    if (!wholesale.ok) return NextResponse.json({ error: wholesale.error }, { status: 400 });

    const previous = await getProductById(id);
    if (!previous) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const product = await updateProduct(id, parsed.value);
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    await deleteUnusedMedia(
      [previous.image, ...previous.gallery],
      [product.image, ...product.gallery]
    );
    // Only touch the wholesale price when the form sent it, so other saves keep it.
    if (raw && typeof raw === "object" && "wholesalePrice" in raw) {
      await saveWholesalePrice(product.id, wholesale.value);
    }
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Could not update product", error);
    return NextResponse.json({ error: "Could not update the product. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const deleted = await deleteProduct(id);
    if (!deleted) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not delete product", error);
    return NextResponse.json({ error: "Could not delete the product. Please try again." }, { status: 500 });
  }
}
