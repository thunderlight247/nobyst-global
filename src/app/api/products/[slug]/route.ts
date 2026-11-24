/**
 * GET /api/products/[slug]  — single public product
 */
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";


export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const CORS = corsHeaders(request, "GET, OPTIONS");
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "live") {
    return NextResponse.json({ error: "Product not found." }, { status: 404, headers: CORS });
  }
  return NextResponse.json(
    {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      features: product.features ?? [],
      pricePesewas: product.pricePesewas,
      category: product.category,
      stockStatus: product.stockStatus,
      image: product.image,
      gallery: product.gallery ?? [],
      colors: product.colors ?? [],
      imageAlt: product.imageAlt,
      partnerName: product.partnerName ?? null,
    },
    { headers: CORS }
  );
}
