import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createProduct, parseProductInput } from "@/lib/products";
import { parseWholesaleInput, saveWholesalePrice } from "@/lib/wholesale";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    const product = await createProduct(parsed.value);
    await saveWholesalePrice(product.id, wholesale.value);
    return NextResponse.json({ product, wholesale: wholesale.value }, { status: 201 });
  } catch (error) {
    console.error("Could not create product", error);
    return NextResponse.json({ error: "Could not create the product. Please try again." }, { status: 500 });
  }
}
