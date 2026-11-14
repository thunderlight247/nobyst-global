import { NextResponse } from "next/server";
import { parseCategoryInput, updateCategory } from "@/lib/categories";

// Open admin (no login yet) by request. Kept out of navigation and indexed pages.
export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const parsed = parseCategoryInput(raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await updateCategory(params.id, parsed.value);
    if (result === null) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ category: result });
  } catch (error) {
    console.error("Could not update category", error);
    return NextResponse.json({ error: "Could not update the category. Please try again." }, { status: 500 });
  }
}
