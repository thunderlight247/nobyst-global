import { NextResponse } from "next/server";
import { createCategory, listCategories, parseCategoryInput } from "@/lib/categories";

// Open admin (no login yet) by request. Kept out of navigation and indexed pages.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    console.error("Could not list categories", error);
    return NextResponse.json({ error: "Could not load categories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
