import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getContent, parseContentInput, saveContent } from "@/lib/content";

// Admin only: every handler checks the signed-in user's role before doing anything.
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ content: await getContent() });
  } catch (error) {
    console.error("Could not load content", error);
    return NextResponse.json({ error: "Could not load content." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(await request.text());
    } catch {
      return NextResponse.json({ error: "The request body is not valid JSON." }, { status: 400 });
    }
    const body = (raw ?? {}) as Record<string, unknown>;
    const parsed = parseContentInput(body.key, body.value);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await saveContent(parsed.key, parsed.value);
    return NextResponse.json({ key: parsed.key, value: parsed.value });
  } catch (error) {
    console.error("Could not save content", error);
    return NextResponse.json({ error: "Could not save the text. Please try again." }, { status: 500 });
  }
}
