import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare";
import { parseWholesaleInput, saveWholesalePrice } from "@/lib/wholesale";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

/** Sets or clears one product's wholesale price from the Wholesale tab. */
export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const { DB } = await getEnv();
  if (!productId || !(await DB.prepare("SELECT 1 AS x FROM products WHERE id = ?").bind(productId).first())) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const parsed = parseWholesaleInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await saveWholesalePrice(productId, parsed.value);
  return NextResponse.json({ productId, wholesale: parsed.value });
}
