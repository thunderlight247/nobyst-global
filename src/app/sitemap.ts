import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts().catch(() => []);
  const pages = [
    "",
    "/about",
    "/businesses",
    "/products",
    "/partnerships",
    "/contact",
    ...products.map((p) => `/products/${p.slug}`),
  ];
  return pages.map((p) => ({ url: `${site.url}${p}`, lastModified: new Date() }));
}
