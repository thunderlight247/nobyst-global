/**
 * GET /api/products/[slug]  — single public product
 */
import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
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
      pricePesewas: product.pricePesewas,
      category: product.category,
      stockStatus: product.stockStatus,
      image: product.image,
      imageAlt: product.imageAlt,
    },
    { headers: CORS }
  );
}
