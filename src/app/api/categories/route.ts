/**
 * GET /api/categories  — public list of all categories
 */
import { NextResponse } from "next/server";
import { listCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json(
    categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
    { headers: CORS }
  );
}
