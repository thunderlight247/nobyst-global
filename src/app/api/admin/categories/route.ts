import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createCategory, listCategories, parseCategoryInput } from "@/lib/categories";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    console.error("Could not list categories", error);
    return NextResponse.json({ error: "Could not load categories." }, { status: 500 });
  }
}

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
    const parsed = parseCategoryInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await createCategory(parsed.value);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ category: result }, { status: 201 });
  } catch (error) {
    console.error("Could not create category", error);
    return NextResponse.json({ error: "Could not create the category. Please try again." }, { status: 500 });
  }
}
