import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseCategoryInput, updateCategory } from "@/lib/categories";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = parseCategoryInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await updateCategory(id, parsed.value);
    if (result === null) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ category: result });
  } catch (error) {
    console.error("Could not update category", error);
    return NextResponse.json({ error: "Could not update the category. Please try again." }, { status: 500 });
  }
}
