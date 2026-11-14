import { NextResponse } from "next/server";
import { createProduct, parseProductInput } from "@/lib/products";

// Open admin (no login yet) by request. Kept out of navigation and indexed pages.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const parsed = await parseProductInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const product = await createProduct(parsed.value);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Could not create product", error);
    return NextResponse.json({ error: "Could not create the product. Please try again." }, { status: 500 });
  }
}
