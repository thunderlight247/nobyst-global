import { NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth";
import { createCategoryRequest, listCategoryRequests } from "@/lib/marketplace";
import { listCategories } from "@/lib/categories";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({ requests: await listCategoryRequests(auth.user.id) });
}

/** A partner asks for a new category; an admin approves or declines it. */
export async function POST(request: Request) {
  const auth = await requirePartner();
  if ("denied" in auth) return auth.denied;
  const limited = await rateLimit([[`partner:write:${auth.user.id}`, LIMITS.partnerWrite]]);
  if (limited) return limited;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Category names are 2–60 characters." }, { status: 400 });
  const categories = await listCategories();
  if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "That category already exists; choose it in the product form." }, { status: 409 });
  }
  const parentId = typeof body?.parentId === "string" && categories.some((c) => c.id === body.parentId && !c.parentId) ? body.parentId : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) || null : null;
  return NextResponse.json({ request: await createCategoryRequest(auth.user, { name, parentId, note }) }, { status: 201 });
}
