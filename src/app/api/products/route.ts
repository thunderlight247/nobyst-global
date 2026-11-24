/**
 * GET /api/products          — public catalogue (live products only)
 * Query params: category, q (search term)
 */
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

export async function GET(request: Request) {
  const CORS = corsHeaders(request, "GET, OPTIONS");
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q")?.toLowerCase() ?? undefined;

  let products = await listProducts();
  // Only expose live products to the public
  products = products.filter((p) => p.status === "live" && p.stockStatus !== "out_of_stock");

  if (category) {
    products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  // Return fields needed by the mobile app
  const payload = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    pricePesewas: p.pricePesewas,
    category: p.category,
    stockStatus: p.stockStatus,
    image: p.image,
    gallery: p.gallery ?? [],
    colors: p.colors ?? [],
    imageAlt: p.imageAlt,
  }));

  return NextResponse.json(payload, { headers: CORS });
}
