import { NextResponse } from "next/server";
import {
  deleteProduct,
  deleteUnusedMedia,
  getProductById,
  parseProductInput,
  updateProduct,
} from "@/lib/products";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const parsed = parseProductInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const previous = await getProductById(params.id);
    if (!previous) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const product = await updateProduct(params.id, parsed.value);
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    await deleteUnusedMedia(
      [previous.image, ...previous.gallery],
      [product.image, ...product.gallery]
    );
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Could not update product", error);
    return NextResponse.json({ error: "Could not update the product. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await deleteProduct(params.id);
    if (!deleted) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not delete product", error);
    return NextResponse.json({ error: "Could not delete the product. Please try again." }, { status: 500 });
  }
}
