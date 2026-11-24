/**
 * GET /api/categories  — public list of all categories
 */
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { listCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

export async function GET(request: Request) {
  const CORS = corsHeaders(request, "GET, OPTIONS");
  const categories = await listCategories();
  return NextResponse.json(
    categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
    { headers: CORS }
  );
}
